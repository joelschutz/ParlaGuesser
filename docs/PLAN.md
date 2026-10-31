# ParlaGuessr

**Jogue, descubra e cobre.** ParlaGuessr é um jogo cívico sobre propostas e atividades do Congresso Nacional. O MVP atual é o Modo Maratona: identifique o parlamentar associado a cada desafio antes que o cronômetro zere.

## Stack e estrutura

- Backend: Go e PocketBase, com SQLite, API REST, migrações e painel administrativo (preparado para PocketBase Cloud ou deploy via Docker).
- Frontend: React, Vite, Tailwind CSS e PocketBase JavaScript SDK em `ui/`.
- Build de produção: `ui/` compila para `dist/`, pronto para hospedagem estática independente (GitHub Pages, Cloudflare Pages, Vercel, Netlify) configurado para se comunicar com um backend remoto.

O servidor cria as coleções `parlamentares`, `desafios`, `estatisticas_parlamentares` e `destaques_e_reacoes` na primeira inicialização. A coleção de autenticação `users` também é criada com o campo opcional `display_name`. Os dados são públicos para leitura; escrita permanece restrita por padrão.

## Executar localmente

Requisitos: Go compatível com a versão definida em `go.mod` e Node.js 18 ou superior.

Na raiz do projeto, inicie o backend:

```bash
go run . serve
```

O PocketBase fica em `http://127.0.0.1:8090`, o painel administrativo em `http://127.0.0.1:8090/_/` e o health check em `http://127.0.0.1:8090/api/parlaguesser/health`.

Para desenvolvimento da interface, em outro terminal:

```bash
cd ui
npm install
npm run dev
```

O Vite fica em `http://localhost:5173`. Ele tenta conectar ao PocketBase em `http://127.0.0.1:8090`; configure `VITE_POCKETBASE_URL` para usar outro endereço (ou aponte para sua instância no PocketBase Cloud). Para compilar a interface estática:

```bash
cd ui
npm run build
```
Os arquivos gerados em `ui/dist/` podem ser publicados em qualquer CDN ou hospedagem estática. Consulte [docs/DEPLOYMENT.md](file:///home/joels/Documentos/Code/ParlaGuesser/docs/DEPLOYMENT.md) para o guia completo.

## Estado do MVP

- Partida com quatro alternativas, cronômetro de 30 segundos, sequência e pontuação de `100 + (segundos restantes × 10)`.
- Revelação do parlamentar, partido, UF, casa legislativa e link de auditoria quando disponíveis.
- O destaque salvo atualmente fica apenas no armazenamento local do navegador; autenticação, reações e ranking persistente ainda não foram implementados.
- Sem registros reais suficientes no PocketBase, a interface usa dados claramente identificados como demonstrativos. Eles não representam parlamentares ou eventos reais.
- A ingestão da Câmara é configurável por linha de comando e, por padrão, importa dez deputados e até dez proposições recentes de cada um. Não inclui o Senado.

Para importar dez deputados atuais e até dez proposições recentes por deputado:

```bash
go run ./cmd/ingestor
```

Os registros são associados às URLs oficiais e atualizados quando o comando é repetido. As quantidades podem ser ajustadas para um teste menor:

```bash
go run ./cmd/ingestor -limit 1 -propositions-per-deputy 1
```

`-propositions-per-deputy 0` importa somente os parlamentares.

Testes do motor do jogo:

```bash
cd ui
npm test
```

## Licença e fontes

O código é distribuído sob a licença MIT. A integração de dados oficiais da Câmara dos Deputados está planejada para o Milestone 2: https://dadosabertos.camara.leg.br/.