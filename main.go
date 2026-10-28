package main

import (
	"log"
	"net/http"
	"os"

	"parlaguesser/internal/schema"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		if err := schema.EnsureCollections(e.App); err != nil {
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
