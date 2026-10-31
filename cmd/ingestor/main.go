package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"parlaguesser/internal/schema"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

const (
	defaultAPIBase = "https://dadosabertos.camara.leg.br/api/v2"
)

type listResponse[T any] struct {
	Data []T `json:"dados"`
}

type deputyListItem struct {
	ID          int    `json:"id"`
	URI         string `json:"uri"`
	Name        string `json:"nome"`
	Party       string `json:"siglaPartido"`
	State       string `json:"siglaUf"`
	PhotoURL    string `json:"urlFoto"`
	Legislature int    `json:"idLegislatura"`
}

type deputyDetail struct {
	CivilName  string   `json:"nomeCivil"`
	Socials    []string `json:"redeSocial"`
	LastStatus struct {
		Name        string `json:"nome"`
		Party       string `json:"siglaPartido"`
		State       string `json:"siglaUf"`
		PhotoURL    string `json:"urlFoto"`
		Status      string `json:"situacao"`
		Legislature int    `json:"idLegislatura"`
	} `json:"ultimoStatus"`
}

type proposition struct {
	ID          int    `json:"id"`
	URI         string `json:"uri"`
	Type        string `json:"siglaTipo"`
	Number      int    `json:"numero"`
	Year        int    `json:"ano"`
	Summary     string `json:"ementa"`
	PresentedAt string `json:"dataApresentacao"`
}

type propositionDetail struct {
	FullTextURL string `json:"urlInteiroTeor"`
}

type propositionTheme struct {
	Name string `json:"tema"`
}

type propositionMetadata struct {
	FullTextURL string
	Keywords    []string
}

type chamberClient struct {
	baseURL string
	client  *http.Client
}

// dataStore defines persistence operations, implemented by localStore (direct PocketBase core.App)
// or remoteStore (PocketBase REST API over HTTP for PocketBase Cloud).
type dataStore interface {
	upsertDeputy(ctx context.Context, deputy deputyListItem, detail deputyDetail) (string, error)
	ensureStats(ctx context.Context, personID string) error
	upsertProposition(ctx context.Context, personID string, item proposition, metadata propositionMetadata) error
}

func main() {
	limit := flag.Int("limit", 50, "number of current deputies to import")
	propsPerDeputy := flag.Int("propositions-per-deputy", 10, "recent authored propositions per deputy")
	baseURL := flag.String("api", defaultAPIBase, "Chamber Open Data API v2 base URL")
	remoteURL := flag.String("remote-url", "", "remote PocketBase base URL (e.g. https://your-instance.pockethost.io)")
	adminEmail := flag.String("admin-email", "", "PocketBase admin/superuser email for remote ingestion")
	adminPassword := flag.String("admin-password", "", "PocketBase admin/superuser password for remote ingestion")
	adminToken := flag.String("admin-token", "", "PocketBase admin auth token for remote ingestion")
	flag.Parse()

	ctx := context.Background()
	var store dataStore

	if strings.TrimSpace(*remoteURL) != "" {
		log.Printf("Connecting to remote PocketBase instance at %s...", *remoteURL)
		rs, err := newRemoteStore(ctx, *remoteURL, *adminEmail, *adminPassword, *adminToken)
		if err != nil {
			log.Fatalf("initialize remote store: %v", err)
		}
		store = rs
	} else {
		app := pocketbase.New()
		app.OnBootstrap().BindFunc(func(event *core.BootstrapEvent) error {
			if err := event.Next(); err != nil {
				return err
			}
			return schema.EnsureCollections(event.App)
		})
		if err := app.Bootstrap(); err != nil {
			log.Fatalf("initialize PocketBase: %v", err)
		}
		defer func() {
			if err := app.ClearBootstrap(); err != nil {
				log.Printf("close PocketBase: %v", err)
			}
		}()
		store = &localStore{app: app}
	}

	client := chamberClient{
		baseURL: strings.TrimRight(*baseURL, "/"),
		client:  &http.Client{Timeout: 15 * time.Second},
	}
	importedDeputies, importedPropositions, err := importSample(ctx, store, client, *limit, *propsPerDeputy)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Data import complete: %d deputies, %d propositions", importedDeputies, importedPropositions)
}

func importSample(ctx context.Context, store dataStore, client chamberClient, limit, propsPerDeputy int) (int, int, error) {
	deputies, err := client.listDeputies(ctx, limit)
	if err != nil {
		return 0, 0, fmt.Errorf("list deputies: %w", err)
	}

	importedPropositions := 0
	for _, deputy := range deputies {
		detail, err := client.getDeputy(ctx, deputy.ID)
		if err != nil {
			return 0, importedPropositions, fmt.Errorf("fetch deputy %d: %w", deputy.ID, err)
		}

		personID, err := store.upsertDeputy(ctx, deputy, detail)
		if err != nil {
			return 0, importedPropositions, fmt.Errorf("save deputy %d: %w", deputy.ID, err)
		}
		if err := store.ensureStats(ctx, personID); err != nil {
			return 0, importedPropositions, fmt.Errorf("initialize stats for deputy %d: %w", deputy.ID, err)
		}

		if propsPerDeputy == 0 {
			continue
		}
		items, err := client.listPropositions(ctx, deputy.ID, propsPerDeputy)
		if err != nil {
			log.Printf("skip propositions for deputy %d (%s): %v", deputy.ID, deputy.Name, err)
			continue
		}
		for _, item := range items {
			if item.Type != "PL" {
				log.Printf("skip non-PL proposition %d (%s)", item.ID, item.Type)
				continue
			}
			if item.ID == 0 || strings.TrimSpace(item.Summary) == "" {
				log.Printf("skip incomplete proposition %d for deputy %d", item.ID, deputy.ID)
				continue
			}
			metadata, err := client.getPropositionMetadata(ctx, item.ID)
			if err != nil {
				log.Printf("fetch metadata for proposition %d: %v", item.ID, err)
			}
			if err := store.upsertProposition(ctx, personID, item, metadata); err != nil {
				return 0, importedPropositions, fmt.Errorf("save proposition %d: %w", item.ID, err)
			}
			importedPropositions++
		}
	}

	return len(deputies), importedPropositions, nil
}

// ----------------------------------------------------------------------------
// Local Store (Embedded PocketBase Core App)
// ----------------------------------------------------------------------------

type localStore struct {
	app core.App
}

func (s *localStore) upsertDeputy(ctx context.Context, deputy deputyListItem, detail deputyDetail) (string, error) {
	collection, err := s.app.FindCollectionByNameOrId("parlamentares")
	if err != nil {
		return "", err
	}
	status := detail.LastStatus
	name := firstNonEmpty(status.Name, deputy.Name)
	party := firstNonEmpty(status.Party, deputy.Party)
	state := firstNonEmpty(status.State, deputy.State)
	photoURL := firstNonEmpty(status.PhotoURL, deputy.PhotoURL)
	profileURL := deputy.URI

	record, err := findOrNewRecord(s.app, collection, "perfil_oficial_url", profileURL)
	if err != nil {
		return "", err
	}
	record.Set("nome_politico", name)
	record.Set("nome_civil", detail.CivilName)
	record.Set("casa", "camara")
	record.Set("partido", party)
	record.Set("uf", state)
	record.Set("foto_url", photoURL)
	record.Set("perfil_oficial_url", profileURL)
	record.Set("status_mandato", status.Status)
	record.Set("periodo_mandato", map[string]any{"legislatura": firstPositive(status.Legislature, deputy.Legislature)})
	record.Set("redes_sociais", detail.Socials)
	if err := s.app.Save(record); err != nil {
		return "", err
	}
	return record.Id, nil
}

func (s *localStore) upsertProposition(ctx context.Context, personID string, item proposition, metadata propositionMetadata) error {
	if item.ID == 0 || strings.TrimSpace(item.Summary) == "" {
		return errors.New("proposition is missing an id or summary")
	}
	collection, err := s.app.FindCollectionByNameOrId("desafios")
	if err != nil {
		return err
	}
	personCollection, err := s.app.FindCollectionByNameOrId("parlamentares")
	if err != nil {
		return err
	}
	person, err := s.app.FindRecordById(personCollection, personID)
	if err != nil {
		return err
	}

	record, err := findOrNewRecord(s.app, collection, "fonte_url", item.URI)
	if err != nil {
		return err
	}
	date, _ := parseChamberDate(item.PresentedAt)
	title := propositionTitle(item)
	record.Set("tipo", "autoria_projeto")
	record.Set("titulo", title)
	record.Set("descricao", item.Summary)
	record.Set("parlamentar", person.Id)
	record.Set("fonte_url", item.URI)
	record.Set("url", item.URI)
	record.Set("urlInteiroTeor", metadata.FullTextURL)
	record.Set("keywords", metadata.Keywords)
	if !date.IsZero() {
		record.Set("data_evento", date)
	}
	return s.app.Save(record)
}

func (s *localStore) ensureStats(ctx context.Context, personID string) error {
	collection, err := s.app.FindCollectionByNameOrId("estatisticas_parlamentares")
	if err != nil {
		return err
	}
	if _, err := s.app.FindFirstRecordByData(collection, "parlamentar", personID); err == nil {
		return nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	personCollection, err := s.app.FindCollectionByNameOrId("parlamentares")
	if err != nil {
		return err
	}
	person, err := s.app.FindRecordById(personCollection, personID)
	if err != nil {
		return err
	}
	record := core.NewRecord(collection)
	record.Set("parlamentar", person.Id)
	record.Set("desafios_publicados", 0)
	record.Set("respostas_corretas", 0)
	record.Set("destaques", 0)
	return s.app.Save(record)
}

// ----------------------------------------------------------------------------
// Remote Store (PocketBase Cloud REST API)
// ----------------------------------------------------------------------------

type remoteStore struct {
	baseURL string
	token   string
	client  *http.Client
}

func newRemoteStore(ctx context.Context, baseURL, email, password, token string) (*remoteStore, error) {
	baseURL = strings.TrimRight(baseURL, "/")
	rs := &remoteStore{
		baseURL: baseURL,
		token:   token,
		client:  &http.Client{Timeout: 30 * time.Second},
	}

	if rs.token == "" && email != "" && password != "" {
		body, err := json.Marshal(map[string]string{
			"identity": email,
			"password": password,
		})
		if err != nil {
			return nil, err
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, rs.baseURL+"/api/collections/_superusers/auth-with-password", bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := rs.client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("remote superuser auth: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode > 299 {
			respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
			return nil, fmt.Errorf("auth error (%s): %s", resp.Status, string(respBody))
		}
		var authResp struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
			return nil, err
		}
		rs.token = authResp.Token
	}

	return rs, nil
}

func (rs *remoteStore) upsertDeputy(ctx context.Context, deputy deputyListItem, detail deputyDetail) (string, error) {
	status := detail.LastStatus
	name := firstNonEmpty(status.Name, deputy.Name)
	party := firstNonEmpty(status.Party, deputy.Party)
	state := firstNonEmpty(status.State, deputy.State)
	photoURL := firstNonEmpty(status.PhotoURL, deputy.PhotoURL)
	profileURL := deputy.URI

	fields := map[string]any{
		"nome_politico":      name,
		"nome_civil":         detail.CivilName,
		"casa":               "camara",
		"partido":            party,
		"uf":                 state,
		"foto_url":           photoURL,
		"perfil_oficial_url": profileURL,
		"status_mandato":     status.Status,
		"periodo_mandato":    map[string]any{"legislatura": firstPositive(status.Legislature, deputy.Legislature)},
		"redes_sociais":      detail.Socials,
	}

	existingID, err := rs.findRecordID(ctx, "parlamentares", fmt.Sprintf("perfil_oficial_url='%s'", profileURL))
	if err != nil {
		return "", err
	}

	if existingID != "" {
		return existingID, rs.updateRecord(ctx, "parlamentares", existingID, fields)
	}

	return rs.createRecord(ctx, "parlamentares", fields)
}

func (rs *remoteStore) upsertProposition(ctx context.Context, personID string, item proposition, metadata propositionMetadata) error {
	date, _ := parseChamberDate(item.PresentedAt)
	title := propositionTitle(item)

	fields := map[string]any{
		"tipo":            "autoria_projeto",
		"titulo":          title,
		"descricao":       item.Summary,
		"parlamentar":     personID,
		"fonte_url":       item.URI,
		"url":             item.URI,
		"urlInteiroTeor":  metadata.FullTextURL,
		"keywords":        metadata.Keywords,
	}
	if !date.IsZero() {
		fields["data_evento"] = date.Format(time.RFC3339)
	}

	existingID, err := rs.findRecordID(ctx, "desafios", fmt.Sprintf("fonte_url='%s'", item.URI))
	if err != nil {
		return err
	}

	if existingID != "" {
		return rs.updateRecord(ctx, "desafios", existingID, fields)
	}

	_, err = rs.createRecord(ctx, "desafios", fields)
	return err
}

func (rs *remoteStore) ensureStats(ctx context.Context, personID string) error {
	existingID, err := rs.findRecordID(ctx, "estatisticas_parlamentares", fmt.Sprintf("parlamentar='%s'", personID))
	if err != nil {
		return err
	}
	if existingID != "" {
		return nil
	}

	fields := map[string]any{
		"parlamentar":         personID,
		"desafios_publicados": 0,
		"respostas_corretas":  0,
		"destaques":           0,
	}
	_, err = rs.createRecord(ctx, "estatisticas_parlamentares", fields)
	return err
}

func (rs *remoteStore) findRecordID(ctx context.Context, collection, filter string) (string, error) {
	endpoint := fmt.Sprintf("%s/api/collections/%s/records?filter=(%s)&perPage=1", rs.baseURL, collection, url.QueryEscape(filter))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}
	if rs.token != "" {
		req.Header.Set("Authorization", rs.token)
	}

	resp, err := rs.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", nil
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("find record in %s: %s (%s)", collection, resp.Status, string(b))
	}

	var result struct {
		Items []struct {
			ID string `json:"id"`
		} `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if len(result.Items) > 0 {
		return result.Items[0].ID, nil
	}
	return "", nil
}

func (rs *remoteStore) createRecord(ctx context.Context, collection string, fields map[string]any) (string, error) {
	data, err := json.Marshal(fields)
	if err != nil {
		return "", err
	}
	endpoint := fmt.Sprintf("%s/api/collections/%s/records", rs.baseURL, collection)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if rs.token != "" {
		req.Header.Set("Authorization", rs.token)
	}

	resp, err := rs.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("create record in %s: %s (%s)", collection, resp.Status, string(b))
	}

	var res struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	return res.ID, nil
}

func (rs *remoteStore) updateRecord(ctx context.Context, collection, id string, fields map[string]any) error {
	data, err := json.Marshal(fields)
	if err != nil {
		return err
	}
	endpoint := fmt.Sprintf("%s/api/collections/%s/records/%s", rs.baseURL, collection, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, endpoint, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if rs.token != "" {
		req.Header.Set("Authorization", rs.token)
	}

	resp, err := rs.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("update record %s in %s: %s (%s)", id, collection, resp.Status, string(b))
	}
	return nil
}

// ----------------------------------------------------------------------------
// Chamber Client & Helpers
// ----------------------------------------------------------------------------

func (client chamberClient) getPropositionMetadata(ctx context.Context, id int) (propositionMetadata, error) {
	var detail struct {
		Data propositionDetail `json:"dados"`
	}
	if err := client.getJSON(ctx, fmt.Sprintf("/proposicoes/%d", id), &detail); err != nil {
		return propositionMetadata{}, err
	}

	var themes listResponse[propositionTheme]
	if err := client.getJSON(ctx, fmt.Sprintf("/proposicoes/%d/temas", id), &themes); err != nil {
		return propositionMetadata{FullTextURL: detail.Data.FullTextURL}, err
	}

	keywords := make([]string, 0, len(themes.Data))
	for _, theme := range themes.Data {
		if name := strings.TrimSpace(theme.Name); name != "" {
			keywords = append(keywords, name)
		}
	}
	return propositionMetadata{FullTextURL: detail.Data.FullTextURL, Keywords: keywords}, nil
}

func (client chamberClient) listDeputies(ctx context.Context, limit int) ([]deputyListItem, error) {
	query := url.Values{
		"itens":      {strconv.Itoa(limit)},
		"pagina":     {"1"},
		"ordem":      {"ASC"},
		"ordenarPor": {"nome"},
	}
	var response listResponse[deputyListItem]
	if err := client.getJSON(ctx, "/deputados?"+query.Encode(), &response); err != nil {
		return nil, err
	}
	return response.Data, nil
}

func (client chamberClient) getDeputy(ctx context.Context, id int) (deputyDetail, error) {
	var response struct {
		Data deputyDetail `json:"dados"`
	}
	err := client.getJSON(ctx, fmt.Sprintf("/deputados/%d", id), &response)
	return response.Data, err
}

func (client chamberClient) listPropositions(ctx context.Context, deputyID, limit int) ([]proposition, error) {
	query := url.Values{
		"idDeputadoAutor": {strconv.Itoa(deputyID)},
		"siglaTipo":       {"PL"},
		"itens":           {strconv.Itoa(limit)},
		"pagina":          {"1"},
		"ordem":           {"DESC"},
		"ordenarPor":      {"id"},
	}
	var response listResponse[proposition]
	if err := client.getJSON(ctx, "/proposicoes?"+query.Encode(), &response); err != nil {
		return nil, err
	}
	projects := make([]proposition, 0, len(response.Data))
	for _, item := range response.Data {
		if item.Type == "PL" {
			projects = append(projects, item)
		}
	}
	return projects, nil
}

func (client chamberClient) getJSON(ctx context.Context, path string, target any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, client.baseURL+path, nil)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "ParlaGuessr-test-ingestor/0.1")

	response, err := client.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode > 299 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 512))
		return fmt.Errorf("Chamber API returned %s: %s", response.Status, strings.TrimSpace(string(body)))
	}
	return json.NewDecoder(response.Body).Decode(target)
}

func propositionTitle(item proposition) string {
	if item.Year <= 0 {
		return fmt.Sprintf("%s %d", item.Type, item.Number)
	}
	return fmt.Sprintf("%s %d/%d", item.Type, item.Number, item.Year)
}

func findOrNewRecord(app core.App, collection *core.Collection, field, value string) (*core.Record, error) {
	record, err := app.FindFirstRecordByData(collection, field, value)
	if err == nil {
		return record, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return core.NewRecord(collection), nil
}

func parseChamberDate(value string) (time.Time, error) {
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02"} {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported Chamber date %q", value)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func firstPositive(values ...int) int {
	for _, value := range values {
		if value > 0 {
			return value
		}
	}
	return 0
}
