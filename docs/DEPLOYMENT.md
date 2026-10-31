# Guia de Deploy e Hospedagem Desacoplada (PocketBase Cloud & Frontend Estático)

Este documento orienta o processo de implantação do ecossistema **ParlaGuessr** de forma desacoplada, separando o backend de dados (PocketBase) da interface de usuário estática (React SPA).

---

## 1. Visão Geral da Arquitetura Desacoplada

```mermaid
flowchart LR
    subgraph FrontendHosting["Frontend Estático"]
        GH["GitHub Pages / Vercel / Cloudflare Pages"]
        Assets["Assets Estáticos (HTML, JS, CSS)<br/>ui/dist/"]
    end

    subgraph BackendHosting["PocketBase Cloud / Backend"]
        Cloud["PocketHost.io ou Container (Fly.io/Railway/Docker)"]
        API["PocketBase REST API & Admin<br/>/api/collections/..."]
        DB[("SQLite WAL")]
    end

    subgraph Ingestion["Ingestor de Dados"]
        IngestCLI["CLI Ingestor<br/>cmd/ingestor"]
    end

    GH --> Assets
    Assets -->|HTTP/REST com CORS| API
    API --> DB
    IngestCLI -->|Câmara API v2| IngestCLI
    IngestCLI -->|REST Upsert (Admin Auth)| API
```

---

## 2. Hospedando o Backend no PocketBase Cloud

Existem duas formas principais de hospedar o backend do ParlaGuessr na nuvem:

### Opção A: PocketHost.io (PaaS gerenciado para PocketBase)

1. Crie uma conta em [pockethost.io](https://pockethost.io) e crie um novo projeto (ex: `parlaguesser.pockethost.io`).
2. Acesse o painel de administração da sua instância:
   `https://parlaguesser.pockethost.io/_/`
3. Defina seu login e senha de superusuário (Admin).
4. No menu lateral, acesse **Settings > Sync / Import collections**.
5. Abra o arquivo [`pb_schema.json`](file:///home/joels/Documentos/Code/ParlaGuesser/pb_schema.json) deste repositório, copie o conteúdo e cole no formulário de importação (ou faça o upload do arquivo).
6. Clique em **Review** e depois em **Confirm and import**.
   - As coleções `parlamentares`, `desafios`, `estatisticas_parlamentares` e `destaques_e_reacoes` serão criadas instantaneamente com as regras de leitura pública ativadas.

### Opção B: Docker / Cloud Containers (Fly.io, Railway, Render)

O repositório inclui um [`Dockerfile`](file:///home/joels/Documentos/Code/ParlaGuesser/Dockerfile) multi-stage otimizado.

#### Deploy no Fly.io:
```bash
fly launch
fly volumes create pb_data --size 1
fly deploy
```

#### Deploy no Railway / Render:
- Conecte o repositório Git.
- Configure o build a partir do `Dockerfile`.
- Crie um volume persistente montado em `/app/pb_data`.
- A aplicação escutará na porta 8090 (ou na porta definida por `$PORT`).
- Na primeira inicialização, o código Go executa automaticamente o `schema.EnsureCollections`, provisionando as tabelas e regras sem necessidade de importação manual.

---

## 3. Ingestão de Dados na Nuvem (Popular o Banco Remoto)

Com o backend remoto ativo, você pode executar o ingestor localmente para alimentar o PocketBase na nuvem consumindo os dados da Câmara dos Deputados:

```bash
go run ./cmd/ingestor \
  -remote-url https://parlaguesser.pockethost.io \
  -admin-email seu-admin@exemplo.com \
  -admin-password sua-senha-forte \
  -limit 50 \
  -propositions-per-deputy 10
```

Se preferir usar um token de autenticação diretamente:
```bash
go run ./cmd/ingestor \
  -remote-url https://parlaguesser.pockethost.io \
  -admin-token "SEU_POCKETBASE_TOKEN"
```

---

## 4. Hospedando o Frontend em uma Página Estática

O frontend foi desacoplado e compilado em assets estáticos independentes em `ui/dist/`.

### Configuração da URL da API Remota

A interface resolve a URL do backend na seguinte ordem de prioridade:
1. `window.__PARLAGUESSR_CONFIG__.pocketbaseUrl` (injeção via script de runtime)
2. `localStorage.getItem('parlaguesser_api_url')` (override local)
3. Variável de build `VITE_POCKETBASE_URL`
4. Fallback padrão: `http://127.0.0.1:8090`

### Build para Produção com URL do Backend:
```bash
cd ui
npm install
VITE_POCKETBASE_URL=https://parlaguesser.pockethost.io npm run build
```
Os arquivos gerados em `ui/dist/` estão prontos para publicação em qualquer servidor web ou CDN estático.

---

### Provedores Recomendados de Hospedagem Estática

#### 1. GitHub Pages
- O arquivo `ui/vite.config.js` está configurado com `base: './'`, permitindo hospedar em repositórios com subcaminhos (ex: `https://usuario.github.io/ParlaGuesser/`).
- No GitHub, acesse **Settings > Pages** e selecione a fonte como **GitHub Actions** ou aponte para a branch de build.

#### 2. Cloudflare Pages / Vercel / Netlify
- Diretório raiz: `ui`
- Comando de build: `npm run build`
- Diretório de saída: `dist`
- Variáveis de ambiente:
  - `VITE_POCKETBASE_URL`: `https://parlaguesser.pockethost.io`

---

## 5. Teste Local do Ecossistema Desacoplado

Para testar localmente simulando o desacoplamento:

Terminal 1 (Backend Go/PocketBase API):
```bash
go run . serve
```

Terminal 2 (Frontend React/Vite com proxy para o backend):
```bash
cd ui
VITE_POCKETBASE_URL=http://127.0.0.1:8090 npm run dev
```

Acesse `http://localhost:5173` no navegador. O frontend consome a API do backend local e apresenta `DADOS CONECTADOS` no rodapé.
