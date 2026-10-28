package main

import (
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

type chamberClient struct {
	baseURL string
	client  *http.Client
}

func main() {
	limit := flag.Int("limit", 50, "number of current deputies to import")
	propsPerDeputy := flag.Int("propositions-per-deputy", 10, "recent authored propositions per deputy")
	baseURL := flag.String("api", defaultAPIBase, "Chamber Open Data API v2 base URL")
	flag.Parse()

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

	ctx := context.Background()
	client := chamberClient{
		baseURL: strings.TrimRight(*baseURL, "/"),
		client:  &http.Client{Timeout: 15 * time.Second},
	}
	importedDeputies, importedPropositions, err := importSample(ctx, app, client, *limit, *propsPerDeputy)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Test-data import complete: %d deputies, %d propositions", importedDeputies, importedPropositions)
}

func importSample(ctx context.Context, app core.App, client chamberClient, limit, propsPerDeputy int) (int, int, error) {
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

		personID, err := upsertDeputy(app, deputy, detail)
		if err != nil {
			return 0, importedPropositions, fmt.Errorf("save deputy %d: %w", deputy.ID, err)
		}
		if err := ensureStats(app, personID); err != nil {
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
			if err := upsertProposition(app, personID, item, metadata); err != nil {
				return 0, importedPropositions, fmt.Errorf("save proposition %d: %w", item.ID, err)
			}
			importedPropositions++
		}
	}

	return len(deputies), importedPropositions, nil
}

type propositionMetadata struct {
	FullTextURL string
	Keywords    []string
}

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

func upsertDeputy(app core.App, deputy deputyListItem, detail deputyDetail) (string, error) {
	collection, err := app.FindCollectionByNameOrId("parlamentares")
	if err != nil {
		return "", err
	}
	status := detail.LastStatus
	name := firstNonEmpty(status.Name, deputy.Name)
	party := firstNonEmpty(status.Party, deputy.Party)
	state := firstNonEmpty(status.State, deputy.State)
	photoURL := firstNonEmpty(status.PhotoURL, deputy.PhotoURL)
	profileURL := deputy.URI

	record, err := findOrNewRecord(app, collection, "perfil_oficial_url", profileURL)
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
	if err := app.Save(record); err != nil {
		return "", err
	}
	return record.Id, nil
}

func upsertProposition(app core.App, personID string, item proposition, metadata propositionMetadata) error {
	if item.ID == 0 || strings.TrimSpace(item.Summary) == "" {
		return errors.New("proposition is missing an id or summary")
	}
	collection, err := app.FindCollectionByNameOrId("desafios")
	if err != nil {
		return err
	}
	personCollection, err := app.FindCollectionByNameOrId("parlamentares")
	if err != nil {
		return err
	}
	person, err := app.FindRecordById(personCollection, personID)
	if err != nil {
		return err
	}

	record, err := findOrNewRecord(app, collection, "fonte_url", item.URI)
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
	return app.Save(record)
}

func propositionTitle(item proposition) string {
	if item.Year <= 0 {
		return fmt.Sprintf("%s %d", item.Type, item.Number)
	}
	return fmt.Sprintf("%s %d/%d", item.Type, item.Number, item.Year)
}

func ensureStats(app core.App, personID string) error {
	collection, err := app.FindCollectionByNameOrId("estatisticas_parlamentares")
	if err != nil {
		return err
	}
	if _, err := app.FindFirstRecordByData(collection, "parlamentar", personID); err == nil {
		return nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	personCollection, err := app.FindCollectionByNameOrId("parlamentares")
	if err != nil {
		return err
	}
	person, err := app.FindRecordById(personCollection, personID)
	if err != nil {
		return err
	}
	record := core.NewRecord(collection)
	record.Set("parlamentar", person.Id)
	record.Set("desafios_publicados", 0)
	record.Set("respostas_corretas", 0)
	record.Set("destaques", 0)
	return app.Save(record)
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
