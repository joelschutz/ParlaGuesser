package main

import (
	"log"
	"net/http"
	"os"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		if err := ensureCollections(e.App); err != nil {
			return err
		}

		e.Router.GET("/api/parlaguesser/health", func(event *core.RequestEvent) error {
			return event.JSON(http.StatusOK, map[string]string{
				"status":  "ok",
				"app":     "ParlaGuesser API",
				"version": "0.1.0",
			})
		})

		e.Router.GET("/{path...}", apis.Static(os.DirFS("./pb_public"), false))
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func ensureCollections(app core.App) error {
	users, err := ensureCollection(app, "users", func(collection *core.Collection) {
		collection.Fields.Add(&core.TextField{Name: "display_name", Max: 120})
	})
	if err != nil {
		return err
	}

	parlamentares, err := ensureCollection(app, "parlamentares", func(collection *core.Collection) {
		collection.ListRule = types.Pointer("")
		collection.ViewRule = types.Pointer("")
		collection.Fields.Add(&core.TextField{Name: "nome_politico", Required: true, Max: 160})
		collection.Fields.Add(&core.TextField{Name: "nome_civil", Max: 200})
		collection.Fields.Add(&core.TextField{Name: "casa", Required: true, Max: 20})
		collection.Fields.Add(&core.TextField{Name: "partido", Max: 40})
		collection.Fields.Add(&core.TextField{Name: "uf", Max: 2})
		collection.Fields.Add(&core.URLField{Name: "foto_url"})
		collection.Fields.Add(&core.URLField{Name: "perfil_oficial_url"})
		collection.Fields.Add(&core.TextField{Name: "status_mandato", Max: 40})
		collection.Fields.Add(&core.JSONField{Name: "periodo_mandato"})
		collection.Fields.Add(&core.JSONField{Name: "redes_sociais"})
	})
	if err != nil {
		return err
	}

	desafios, err := ensureCollection(app, "desafios", func(collection *core.Collection) {
		collection.ListRule = types.Pointer("")
		collection.ViewRule = types.Pointer("")
		collection.Fields.Add(&core.TextField{Name: "tipo", Required: true, Max: 40})
		collection.Fields.Add(&core.TextField{Name: "titulo", Required: true, Max: 240})
		collection.Fields.Add(&core.TextField{Name: "descricao", Max: 5000})
		collection.Fields.Add(&core.RelationField{Name: "parlamentar", CollectionId: parlamentares.Id, MaxSelect: 1})
		collection.Fields.Add(&core.URLField{Name: "fonte_url"})
		collection.Fields.Add(&core.DateField{Name: "data_evento"})
	})
	if err != nil {
		return err
	}

	_, err = ensureCollection(app, "estatisticas_parlamentares", func(collection *core.Collection) {
		collection.ListRule = types.Pointer("")
		collection.ViewRule = types.Pointer("")
		collection.Fields.Add(&core.RelationField{Name: "parlamentar", Required: true, CollectionId: parlamentares.Id, MaxSelect: 1})
		collection.Fields.Add(&core.NumberField{Name: "desafios_publicados"})
		collection.Fields.Add(&core.NumberField{Name: "respostas_corretas"})
		collection.Fields.Add(&core.NumberField{Name: "destaques"})
	})
	if err != nil {
		return err
	}

	_, err = ensureCollection(app, "destaques_e_reacoes", func(collection *core.Collection) {
		collection.ListRule = types.Pointer("")
		collection.ViewRule = types.Pointer("")
		collection.Fields.Add(&core.RelationField{Name: "desafio", Required: true, CollectionId: desafios.Id, MaxSelect: 1})
		collection.Fields.Add(&core.RelationField{Name: "usuario", Required: true, CollectionId: users.Id, MaxSelect: 1})
		collection.Fields.Add(&core.TextField{Name: "tipo_reacao", Required: true, Max: 24})
	})

	return err
}

func ensureCollection(app core.App, name string, configure func(*core.Collection)) (*core.Collection, error) {
	collection, err := app.FindCollectionByNameOrId(name)
	if err == nil {
		return collection, nil
	}

	if name == "users" {
		collection = core.NewAuthCollection(name)
	} else {
		collection = core.NewBaseCollection(name)
	}
	configure(collection)

	if err := app.Save(collection); err != nil {
		return nil, err
	}
	return collection, nil
}
