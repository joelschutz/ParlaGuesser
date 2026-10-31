Documentação Técnica e Especificação do Ecossistema ParlaGuessr (v3)

O ParlaGuessr é uma plataforma open-source de tecnologia cívica e ativismo digital projetada para transformar o acompanhamento do Poder Legislativo no Brasil em uma experiência dinâmica, gamificada e de engajamento direto. Fundamentado no mote "Você sabe o que o seu parlamentar está fazendo no Congresso? Jogue, descubra e cobre", o sistema canaliza dados abertos oficiais da Câmara dos Deputados e do Senado Federal para combater a apatia política e capacitar cidadãos, estudantes e coletivos organizados a exercerem a fiscalização em tempo real.

A arquitetura do ParlaGuessr combina um backend unificado em Go e PocketBase com uma interface em React e Progressive Web App (PWA), operando sob um modelo de federação distribuída (o "ParlaVerse") que assegura a soberania de dados, a resistência à censura, a verificação criptográfica da informação pública e alta capacidade de escala.

1. Visão Geral e Manifesto Político-Tecnológico

Por décadas, a transparência pública no Brasil foi tratada como uma obrigação burocrática cumprida por meio de portais de dados complexos, relatórios extensos e terminologias herméticas que afastam o cidadão comum. O ParlaGuessr subverte essa lógica ao utilizar a mecânica de jogos de adivinhação sob pressão (inspirada no GeoGuessr e em interfaces de swipe) para transformar dados brutos em ferramentas de cobrança social.

[ APIs Oficiais da Câmara e Senado ] ➔ [ Pipeline de Ingestão e Hash SHA-256 ] ➔ [ Servidor Go / PocketBase ] ➔ [ Web App / PWA & Federação ParlaVerse ]


Princípios Fundamentais do Projeto

* Transparência Radical Baseada em Evidências: Não há espaço para fake news, palpites editoriais ou filtros partidários. Toda pergunta gerada pelo sistema é vinculada ao registro bruto da fonte oficial do Congresso, oferecendo links diretos de auditoria.
* Gamificação da Vigilância Cívica: O escrutínio dos mandatários é integrado à rotina digital dos nativos digitais através de mecanismos de pontuação, sequências de atividade (streaks), coleções e disputas entre coletivos.
* Curadoria Cívica e Visibilidade Pauta-a-Pauta: O sistema de engajamento da comunidade (upvotes/downvotes) opera como um farol de visibilidade, priorizando matérias legislativas no feed e nos jogos com base em sua urgência e relevância social.
* Alta Capacidade e Eficiência de Recursos: Graças ao modelo Offline-First e à arquitetura compilada em Go com SQLite WAL, a rede federada atende a centenas de milhares de usuários simultâneos com baixo consumo de hardware.
* Soberania Tecnológica e Código Aberto: Todo o ecossistema é mantido sob licença livre (MIT), permitindo que universidades, movimentos sociais e comunidades locais executem suas próprias instâncias federadas autônomas.

2. Catálogo de Modos de Jogo

O ParlaGuessr oferece múltiplos modos de jogo que atendem a diferentes níveis de conhecimento e dinâmicas de engajamento, variando de partidas rápidas individuais a bolões preditivos em tempo real.

Modo de Jogo	Mecânica Principal	Interface / UX	Objetivo Cívico
Modo Maratona (MVP)	Desafio contínuo com cronômetro regressivo de 30s. A pontuação decai a cada segundo.	Cartão de evidência (proposição/comissão) + 4 opções de parlamentares.	Fixação de autoria e aprendizado contínuo sobre figuras do Congresso.
Swipe Votações	Pilha de cartões de votações nominais para deslizar à direita (SIM), esquerda (NÃO), cima (ABSTENÇÃO) ou baixo (AUSÊNCIA).	Interface estilo swipe com fotos, resumo didático, abas de orientação de bancada/histórico e ações de cobrança social.	Exposição de coerência partidária e derrubada de discursos demagógicos.
Ligar Comissões	Desafio de correspondência direta (Matching 5x5) ligando 5 parlamentares às suas 5 comissões/presidências.	Duas colunas interativas com conectores arrastáveis.	Compreensão do trabalho interno e distribuição de poder nas comissões.
PoolBet (Bolão)	Palpites preditivos em votações importantes agendadas antes da deliberação oficial do Plenário.	Cartões do Swipe com multiplicadores de bônus e ranking preditivo pós-Sessão.	Acompanhamento preventivo e engajamento em pautas quentes do Congresso.
Multiplayer Real-Time	Partidas síncronas entre jogadores ou grupos competindo pela resposta mais rápida.	Salas de espera (matchmaking) via WebSockets com placar dinâmico em tempo real.	Mobilização de turmas, coletivos e eventos de ativismo universitário.
Breaking News	Feed automatizado alimentado por sessões, discursos recentes e votações de alta visibilidade comunitária.	Cards de destaque no feed ordenados pelo algoritmo de curadoria cívica.	Monitoramento imediato e priorização das discussões mais urgentes.

3. Ecossistema de Funcionalidades do Usuário

Além dos modos de jogo, a plataforma disponibiliza um conjunto integrado de recursos sociais e de personalização que estimulam o hábito diário de acompanhamento político.

Foco Regional e Bancada Estadual

Os usuários podem definir seu estado de origem (UF) nas configurações de perfil. Com essa preferência ativa, o algoritmo de geração de partidas passa a priorizar cartões e votações envolvendo os deputados federais e senadores que representam aquela unidade federativa, promovendo a fiscalização de proximidade.

Coleção de Parlamentares ("Álbum do Parlamento")

Cada parlamentar encontrado pelo usuário durante as partidas é registrado em uma galeria pessoal. A ficha individual do político exibe:

* Contador de encontros e taxa de acertos do jogador em relação àquele parlamentar.
* Histórico de proposições, projetos de lei e comissões daquele político que o usuário já acertou no jogo.
* Links para as redes sociais oficiais e indicador do status do mandato.

Sistema de Reações e Curadoria Cívica (Upvote / Downvote de Visibilidade)

Inspirado na dinâmica de votação do Reddit, o ParlaGuessr introduz um sistema de engajamento para cima e para baixo (Upvote / Downvote) focado exclusivamente na visibilidade e priorização política:

* Visibilidade sem Juízo de Valor: O botão não serve para julgar a matéria como "boa ou ruim", mas para indicar a urgência e a relevância de sua pauta na agenda pública.
* Geração de Dados Cívicos: Projetos que precisam ser combatidos, aperfeiçoados, viabilizados ou que estejam ocultos da grande imprensa ganham projeção no feed e nas listas de desafios. Isso gera dados estratégicos para a comunidade e para a mobilização democrática.

4. Arquitetura Técnica, Federação e Segurança de Dados

O backend do ParlaGuessr foi projetado para rodar como um executável único unificado em Go, utilizando o PocketBase para gerenciar o banco de dados SQLite, a autenticação OAuth2 (Google), a mensageria e o servidor de arquivos estáticos.

                                  [ Instância A (UFBA) ]
                                            │
                                 ActivityPub / ForgeFed
                                            │
[ APIs do Congresso/Senado ] ➔ [ Instância B (Central) ] ➔ [ Validação de Hash SHA-256 ]
                                            │
                                  [ Instância C (SP) ]


Arquitetura da Rede Federada ("ParlaVerse")

Inspirado em protocolos como ActivityPub e ForgeFed, qualquer comunidade pode executar sua própria instância do ParlaGuessr. As instâncias comunicam-se de forma assíncrona para compartilhar rankings, pontuações de visibilidade de pautas e cartões de jogo, mantendo a autonomia de gestão e a privacidade local dos dados.

Dimensionamento de Infraestrutura, Performance e Métricas de Escala (RPS & CCU)

O ecossistema ParlaGuessr foi projetado para altíssima eficiência de processamento e escalabilidade horizontal descentralizada:

* Performance por Nó Go + PocketBase: Um único servidor unificado em Go rodando com banco SQLite em modo WAL (Write-Ahead Logging) processa de 500 a 1.000 requisições/segundo (RPS) em hardware doméstico modesto (mini PCs ou notebooks antigos).
* Eficiência por Usuário (Batching Offline-First): Como o PWA realiza pre-fetching de lotes de 20 a 50 cartões e processa as rodadas no cliente por 30 a 60 segundos, a frequência de requisições por usuário é mínima (~1-2 req/minuto).
* Capacidade Massiva de Usuários Simultâneos (CCU):
  * 1 Nó Homelab: Atende de 10.000 a 25.000 jogadores ativos simultaneamente.
  * Rede Federada de 10 a 20 Nós: Escala para 100.000 a 250.000+ usuários simultâneos (CCU) sem gargalos de infraestrutura.
* Proteção de Dados Governamentais e Economia de Banda: A ingestão da API do Congresso é isolada em segundo plano pelos servidores (zero sobrecarga nas APIs oficiais do Estado), e as imagens e assets estáticos são servidos via cache de borda da Cloudflare (redução de 95% na banda do operador local).

A Matemática da Confiança: Proteção contra Desinformação

Para impedir que instâncias maliciosas injetem falsas votações ou alterem discursos de parlamentares, a veracidade das informações é garantida matematicamente:

1. Pipeline Determinístico (Jogos Automáticos): As perguntas geradas a partir dos endpoints da Câmara e do Senado acompanham o hash criptográfico SHA-256 do payload de dados oficiais brutos.
2. Dupla Atestação (Jogos Semi-Automáticos): Recortes de notas taquigráficas contêm o Content Hash da sessão oficial e a assinatura digital Ed25519 da instância que realizou a curadoria.
3. Validação Cruzada entre Servidores: Ao receber uma pergunta ou pontuação de visibilidade de outra instância, o servidor receptador recomputa o hash contra a API do Estado. Caso haja divergência, o conteúdo é rejeitado automaticamente.

5. Trilha de Milestones de Implementação (Roadmap Executável)

O desenvolvimento do ecossistema ParlaGuessr está estruturado em cinco marcos principais de entrega, garantindo a evolução contínua da aplicação do MVP à federação completa.

Milestone 1: Núcleo, MVP Solo e Pipeline de Ingestão

* [x] Estruturação da arquitetura unificada Go + PocketBase.
* [x] Implementação do gerador de desafios do Modo Maratona (30s) com cálculo dinâmico de pontos.
* [x] Desenvolvimento do script CLI de ingestão para a API de Dados Abertos da Câmara dos Deputados (cmd/ingestor).
* [x] Interface web inicial em React com Tailwind CSS e suporte ao build estático em pb_public/.
* [x] Exibição obrigatória da fonte oficial de auditoria pós-resposta.

Milestone 2: Autenticação, Perfis, Coleções e Rede Social

* [ ] Ativação da autenticação OAuth2 (Google) no PocketBase e fluxo de perfil de usuário.
* [ ] Implementação da Coleção de Parlamentares ("Álbum do Parlamento") com histórico de acertos.
* [ ] Criação do sistema de Badges de conquista e vinculação a Coletivos/Clãs.
* [ ] Implementação do Sistema de Reações por Visibilidade (Upvote / Downvote Cívico).
* [ ] Implementação do Ranking Geral e Regional com controle de acesso para usuários autenticados.
* [ ] Expansão do script de ingestão para consumir a API de Dados Abertos do Senado Federal.

Milestone 3: Modos Avançados (Swipe Votações e Ligar Comissões)

* [ ] Desenvolvimento da interface de pilha de cartões e gestos do Modo Swipe Votações (SIM, NÃO, ABSTENÇÃO, AUSÊNCIA).
* [ ] Mapeamento e normalização de votações nominais, orientações de bancada e histórico de votos do parlamentar.
* [ ] Implementação do indicador de voto dissidente e gerador de cards de cobrança para redes sociais.
* [ ] Desenvolvimento da interface e lógica do modo Ligar Comissões (Matching 5x5).
* [ ] Adição das Etiquetas Contextuais nos cartões (📍 Seu Estado, ✅ Lei Aprovada, ⚠️ Voto Dissidente).

Milestone 4: Engenharia Preditiva, Calendário e Notificações Push

* [ ] Implementação do Modo PoolBet (Bolão Legislativo) integrado ao calendário de sessões pautadas.
* [ ] Desenvolvimento do feed de atualizações, discursos recentes e calendário oficial ordenado por engajamento cívico.
* [ ] Configuração da arquitetura Web Push API no Go (VAPID) e Service Workers no PWA.
* [ ] Implementação dos gatilhos de notificação para a streak diária e alertas de Breaking News.
* [ ] Mecanismo de sinalização de erros formais por parte dos usuários.

Milestone 5: Federação ParlaVerse, Criptografia e Expansão Comunitária

* [ ] Implementação do protocolo de comunicação servidor-a-servidor assíncrono (ActivityPub/ForgeFed).
* [ ] Integração do sistema de verificação por Hash SHA-256 e assinaturas Ed25519 para dados oficiais.
* [ ] Suporte a roteamento por Mesh VPN (Tailscale/Headscale) e túneis individuais Cloudflare.
* [ ] Suporte a failover transparente Multi-Relay no PWA para garantia de resiliência.
* [ ] Sincronização de pontuações de visibilidade e coletivos utilizando estruturas CRDTs sem conflito.
* [ ] Publicação do Guia de Contribuição oficial (Wiki Onboarding) para voluntários técnicos e ativistas.
