# 🏛️ ParlaGuessr - Planejamento de Projeto & Estrutura de Repositório

Este documento contém o planejamento de inicialização do repositório para o projeto **ParlaGuessr**, estabelecendo a estrutura de arquivos, convenções de branches e arquitetura do MVP.

---

## 📂 Estrutura Proposta do Repositório

```text
parlaguessr/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Automação de testes e linting
│       └── release.yml            # Build de executáveis e deploy
├── cmd/
│   └── ingestor/                  # CLI / Workers de ingestão de dados
│       └── main.go                # Script de consumo das APIs (Câmara/Senado)
├── pb_migrations/                 # Migrações do banco de dados PocketBase
│   └── 1710000000_init_schema.go  # Definição inicial das coleções
├── pb_hooks/                      # Lógicas estendidas do PocketBase em JS/Go
├── pb_public/                     # Build do frontend estático servido pelo Go
├── ui/                            # Aplicação Web Frontend (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/            # Componentes reutilizáveis (cards, timers, etc.)
│   │   ├── hooks/                 # Custom React Hooks (ex: useGameLoop)
│   │   ├── lib/                   # Cliente PocketBase e utilitários
│   │   ├── pages/                 # Páginas (Home, Game, Revelação, Ranking)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── scripts/                       # Scripts auxiliares para dev/deployment
├── .gitignore
├── GOALS.md
├── LICENSE
├── main.go                        # Ponto de entrada do backend PocketBase/Go
├── MILESTONES.md                  # Acompanhamento do ciclo de vida
└── README.md                      # Documentação principal
```

---

## 🌿 Estratégia de Branches & Workflow Git

Utilizaremos o modelo **GitHub Flow**:

* **`main`**: Código de produção sempre estável.
* **`feature/<nome-da-feature>`**: Desenvolvimento de novas funcionalidades (ex: `feature/ingestor-senado`, `feature/timer-component`).
* **`fix/<nome-do-bug>`**: Correções pontuais de bugs.

### Regras de Commit (Conventional Commits)
* `feat:` Novas funcionalidades.
* `fix:` Correção de erros.
* `docs:` Alterações em documentação.
* `style:` Ajustes estéticos/formatadores.
* `refactor:` Alteração de código sem mudança de comportamento.