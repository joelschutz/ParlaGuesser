# 🏛️ ParlaGuessr - Planejamento de Projeto & Estrutura de Repositório

Este documento contém o planejamento de inicialização do repositório para o projeto **ParlaGuessr**, estabelecendo a estrutura de arquivos, convenções de branches e arquitetura do MVP.

---

## 📂 Estrutura Proposta do Repositório (Desacoplado)

```text
parlaguessr/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Automação de testes e linting
│       └── release.yml            # Build de executáveis backend e bundle frontend
├── cmd/
│   └── ingestor/                  # CLI de ingestão (suporte local e PocketBase Cloud)
│       ├── main.go                # Script de consumo e upsert (local/remoto)
│       └── main_test.go
├── internal/
│   └── schema/
│       └── schema.go              # Definição programática das coleções
├── ui/                            # Aplicação Web Frontend Estática (React + Vite)
│   ├── src/
│   │   ├── App.jsx                # Componente principal do jogo
│   │   ├── game.js                # Regras de negócio e seleção de rodadas
│   │   ├── pocketbase.js          # Cliente PocketBase com resolução dinâmica de URL
│   │   └── ...
│   ├── dist/                      # Build de produção pronto para hospedagem estática
│   ├── .env.example               # Exemplo de configuração da URL do backend
│   ├── package.json
│   └── vite.config.js
├── Dockerfile                     # Container otimizado para deploy do backend
├── pb_schema.json                 # Schema exportado para PocketBase Cloud / PocketHost
├── .gitignore
├── LICENSE
├── main.go                        # Backend PocketBase/Go independente (API REST)
├── milestones_do_projeto.md       # Acompanhamento do ciclo de vida
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