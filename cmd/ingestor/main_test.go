package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestParseChamberDate(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{input: "2026-08-28T15:16", want: "2026-08-28T15:16:00Z"},
		{input: "2026-08-28", want: "2026-08-28T00:00:00Z"},
		{input: "2026-08-28T15:16:30Z", want: "2026-08-28T15:16:30Z"},
	}
	for _, test := range tests {
		parsed, err := parseChamberDate(test.input)
		if err != nil {
			t.Fatalf("parse %q: %v", test.input, err)
		}
		if got := parsed.UTC().Format(time.RFC3339); got != test.want {
			t.Errorf("parse %q = %s, want %s", test.input, got, test.want)
		}
	}
}

func TestParseChamberDateRejectsUnknownFormat(t *testing.T) {
	if _, err := parseChamberDate("not-a-date"); err == nil {
		t.Fatal("expected unsupported date error")
	}
}

func TestPropositionTitleOmitsUnknownYear(t *testing.T) {
	if got := propositionTitle(proposition{Type: "RPD", Number: 2, Year: 0}); got != "RPD 2" {
		t.Fatalf("title = %q, want RPD 2", got)
	}
	if got := propositionTitle(proposition{Type: "PL", Number: 42, Year: 2026}); got != "PL 42/2026" {
		t.Fatalf("title = %q, want PL 42/2026", got)
	}
}

func TestChamberClientUsesBoundedJSONRequests(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Accept") != "application/json" {
			t.Errorf("Accept header = %q", request.Header.Get("Accept"))
		}
		if request.URL.Path != "/api/v2/deputados" {
			t.Errorf("unexpected path %q", request.URL.Path)
		}
		if request.URL.Query().Get("itens") != "3" {
			t.Errorf("item limit = %q, want 3", request.URL.Query().Get("itens"))
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"dados":[{"id":91,"uri":"https://example.test/deputies/91","nome":"Deputada Teste","siglaPartido":"ABC","siglaUf":"SP","urlFoto":"https://example.test/photo.jpg","idLegislatura":57}]}`))
	}))
	defer server.Close()

	client := chamberClient{baseURL: server.URL + "/api/v2", client: server.Client()}
	deputies, err := client.listDeputies(context.Background(), 3)
	if err != nil {
		t.Fatal(err)
	}
	if len(deputies) != 1 || deputies[0].ID != 91 || deputies[0].State != "SP" {
		t.Fatalf("unexpected mapped deputies: %#v", deputies)
	}
}

func TestListPropositionsFiltersForPL(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if got := request.URL.Query().Get("siglaTipo"); got != "PL" {
			t.Errorf("siglaTipo = %q, want PL", got)
		}
		if got := request.URL.Query().Get("idDeputadoAutor"); got != "91" {
			t.Errorf("idDeputadoAutor = %q, want 91", got)
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"dados":[{"id":101,"uri":"https://example.test/101","siglaTipo":"PL","numero":42,"ano":2026,"ementa":"Projeto de lei"}]}`))
	}))
	defer server.Close()

	client := chamberClient{baseURL: server.URL + "/api/v2", client: server.Client()}
	items, err := client.listPropositions(context.Background(), 91, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 || items[0].Type != "PL" {
		t.Fatalf("unexpected propositions: %#v", items)
	}
}

func TestListPropositionsSkipsNonPLResponses(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"dados":[{"id":101,"uri":"https://example.test/101","siglaTipo":"PEC","numero":42,"ano":2026,"ementa":"Constitutional proposal"}]}`))
	}))
	defer server.Close()

	client := chamberClient{baseURL: server.URL + "/api/v2", client: server.Client()}
	items, err := client.listPropositions(context.Background(), 91, 10)
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range items {
		if item.Type != "PL" {
			t.Errorf("returned non-PL proposition type %q", item.Type)
		}
	}
}
