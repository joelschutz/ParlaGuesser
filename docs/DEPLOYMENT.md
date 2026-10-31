# Guia de Deploy (PocketBase Cloud e hospedagem estática)

O ParlaGuessr pode ser publicado como uma aplicação PocketBase única ou com a interface hospedada separadamente. Para PocketBase Cloud, o projeto precisa conter a estrutura PocketBase no diretório raiz: `pb_hooks/`, `pb_migrations/` e `pb_public/`.

---

## 1. Visão Geral da Arquitetura Desacoplada

```mermaid
flowchart LR
    subgraph BackendHosting["PocketBase Cloud"]
      Cloud["PocketBase Cloud"]
        API["PocketBase REST API & Admin<br/>/api/collections/..."]
      Assets["Frontend React estático<br/>pb_public/"]
        DB[("SQLite WAL")]
    end

    subgraph Ingestion["Ingestor de Dados"]
        IngestCLI["CLI Ingestor<br/>cmd/ingestor"]
    end

    Cloud --> Assets
    Assets -->|mesma origem| API
    API --> DB
    IngestCLI -->|Câmara API v2| IngestCLI
    IngestCLI -->|REST Upsert (Admin Auth)| API
```

---

## 2. Deploy no PocketBase Cloud

O build de produção coloca a interface compilada em `pb_public/`; PocketBase serve esses arquivos junto com a API. Os diretórios `pb_hooks/` e `pb_migrations/` são mantidos no repositório, mesmo quando ainda não há hooks ou migrações customizados.

Use o script compartilhado para reproduzir localmente o mesmo build validado pelo CI:

```bash
bash scripts/build-pocketbase-cloud.sh
```

O script executa os testes Go e frontend, compila o Vite para `pb_public/` e verifica a presença de `pb_hooks/`, `pb_migrations/` e `pb_public/index.html`. Configure o PocketBase Cloud para usar a raiz do repositório. Se a configuração pedir um comando de build, use `bash scripts/build-pocketbase-cloud.sh`; não configure `ui/` como raiz do projeto PocketBase.

O workflow de release (`.github/workflows/release.yml`) publica `parlaguesser-pocketbase-cloud.zip`, incluindo o código Go, os módulos e os três diretórios PocketBase. Baixe e extraia esse bundle preservando a estrutura de diretórios quando fizer deploy manual.

As coleções de domínio são inicializadas pelo código Go através de `schema.EnsureCollections`. O `pb_schema.json` também está disponível para inspeção e importação manual quando necessário.

### Deploy em container

O repositório também inclui um [`Dockerfile`](../Dockerfile) para hosts que executam containers. Monte um volume persistente em `/app/pb_data`; o container escuta em `8090` por padrão.

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

## 3. Hospedagem estática separada (opcional)

O build do Vite grava os arquivos em `pb_public/`, que é o diretório padrão de arquivos públicos do PocketBase. Se quiser hospedar a interface em outro serviço estático, publique o conteúdo de `pb_public/` após o build.

### Configuração da URL da API Remota

A interface resolve a URL do backend na seguinte ordem de prioridade:
1. `window.__PARLAGUESSR_CONFIG__.pocketbaseUrl` (injeção via script de runtime)
2. `localStorage.getItem('parlaguesser_api_url')` (override local)
3. Variável de build `VITE_POCKETBASE_URL`
4. Fallback padrão: `http://127.0.0.1:8090`

### Build para Produção

Na raiz do repositório:

```bash
bash scripts/build-pocketbase-cloud.sh
```
Para hospedar fora do domínio PocketBase, defina `VITE_POCKETBASE_URL` para a URL HTTPS da API durante o build. Os arquivos publicados em `pb_public/` são gerados novamente a cada build.

---

### Provedores Recomendados de Hospedagem Estática

#### 1. GitHub Pages
- O Vite está configurado com `base: './'`, permitindo publicar sob um subcaminho.
- Use um workflow de Pages para publicar o conteúdo de `pb_public/`.

#### 2. Cloudflare Pages / Vercel / Netlify
- Diretório raiz: repositório
- Comando de build: `npm --prefix ui ci && npm --prefix ui run build`
- Diretório de saída: `pb_public`
- Variáveis de ambiente:
  - `VITE_POCKETBASE_URL`: `https://parlaguesser.pockethost.io`

---

## 4. Teste Local

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

Acesse `http://localhost:5173` no navegador. Para testar o diretório público servido pelo PocketBase, execute o build e acesse `http://127.0.0.1:8090`.
