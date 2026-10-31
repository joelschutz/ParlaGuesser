package main

import (
	"log"
	"net/http"
	"os"

	"parlaguesser/internal/schema"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	app := pocketbase.New()

	// Register migration commands (e.g. migrate up/down/create/history) and auto-apply migrations on serve
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		// Ensure system and domain collections exist on startup
		if err := schema.EnsureCollections(e.App); err != nil {
			return err
		}

		// API healthcheck endpoint
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
