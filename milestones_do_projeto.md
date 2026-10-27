# 🎯 Milestones do Projeto ParlaGuessr

Este documento estabelece as fases do projeto, entregáveis por milestone e critérios de aceitação para o acompanhamento do desenvolvimento.

---

## 🚩 Milestone 1: Inicialização do Repositório & Backend Base
> **Objetivo:** Estabelecer o repositório Git, ambiente Go/PocketBase, esquemas de dados e endpoints base da API.

* [ ] Configurar repositório com `.gitignore`, `LICENSE` e licença MIT.
* [ ] Inicializar projeto Go e dependência do PocketBase (`pocketbase/pocketbase`).
* [ ] Implementar o arquivo `main.go` integrando o servidor web para arquivos estáticos em `./pb_public`.
* [ ] Definir e registrar o schema das coleções no PocketBase:
  * [ ] `parlamentares`
  * [ ] `desafios`
  * [ ] `estatisticas_parlamentares`
  * [ ] `destaques_e_reacoes`
* [ ] Testar acesso ao painel de administração (`http://127.0.0.1:8090/_/`).

---

## 🚩 Milestone 2: Script de Ingestão de Dados (Câmara dos Deputados)
> **Objetivo:** Criar a ferramenta de carga automática que consome a API oficial e popula o banco de dados inicial.

* [ ] Criar o comando CLI em `cmd/ingestor/main.go`.
* [ ] Integrar consumo da [API de Dados Abertos da Câmara](https://dadosabertos.camara.leg.br/):
  * [ ] Baixar lista de deputados atuais (dados pessoais, partido, UF, foto, redes sociais).
  * [ ] Baixar comissões ativas e proposições legislativas (projetos de lei) relevantes.
* [ ] Mapear respostas da API e salvar registros vinculados na coleção `desafios`.
* [ ] Inicializar tabela de `estatisticas_parlamentares` zerada para cada político importado.

---

## 🚩 Milestone 3: Interface Web Single Player (Modo Maratona)
> **Objetivo:** Desenvolver o frontend React com estilo dinâmico e o Game Loop do MVP.

* [ ] Criar app React + Vite dentro do diretório `ui/` e configurar Tailwind CSS.
* [ ] Conectar o SDK JS do PocketBase com a API backend.
* [ ] Desenvolver o fluxo do **Modo Maratona**:
  * [ ] Card do Desafio com apresentação do projeto ou comissão.
  * [ ] Algoritmo de seleção de 1 opção correta + 3 distratores aleatórios.
  * [ ] Cronômetro regressivo de 30 segundos.
  * [ ] Cálculo dinâmico de pontuação: $\text{Pontos} = 100 + (\text{Segundos Restantes} \times 10)$.
* [ ] Criar a **Tela de Revelação pós-resposta**:
  * [ ] Exibir foto, partido, UF e link oficial para auditoria no Congresso.
  * [ ] Botões para favoritar/destacar a fala ou proposta.
  * [ ] Botão de "Próxima Pergunta" ou "Tentar Novamente" (em caso de erro).

---

## 🚩 Milestone 4: Autenticação & Sistema de Destaques da Comunidade
> **Objetivo:** Permitir cadastro de usuários, gravação de pontos e feed público de dados destacados.

* [ ] Habilitar login via e-mail e provedores OAuth (Google) no PocketBase/React.
* [ ] Implementar persistência de partidas no perfil do usuário.
* [ ] Criar feed de "Destaques da Comunidade" ordenado por reações de usuários registrados.
* [ ] Criar tela de **Ranking Geral** com as pontuações mais altas no Modo Maratona.

---

## 🚩 Milestone 5: Expansão de Dados & Modos Adicionais
> **Objetivo:** Integrar a API do Senado, notas taquigráficas e preparar o app para novas dinâmicas.

* [ ] Adicionar suporte no script de ingestão para a [API de Dados Abertos do Senado](https://legis.senado.leg.br/dadosabertos/docs/).
* [ ] Implementar extrator semi-automático de trechos de discursos e notas taquigráficas.
* [ ] Implementar ajustes dinâmicos de dificuldade (ex: modo sem opções múltiplas / escrita do nome).
* [ ] Preparar a infraestrutura de WebSockets para o Modo Multiplayer em tempo real.