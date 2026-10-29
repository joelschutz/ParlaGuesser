# TRUST.md — A Matemática da Confiança: Autenticidade, Rastreabilidade e Transparência no ParlaGuessr (v3)

## Introdução: Da Confiança Cega à Transparência Verificável

Em um cenário marcado pela sobrecarga de informações, fragmentação do debate público e proliferação de conteúdos desinformativos, a transparência política tradicional falha não por escassez de dados, mas por crise de confiabilidade. Os portais de transparência governamentais funcionam como repositórios passivos, enquanto as redes sociais comerciais centralizadas operam sob algoritmos opacos que privilegiam a retenção e a polarização sobre o fato verificado.

O **ParlaGuessr** responde a este desafio substituindo o modelo de **"confiança cega"** (*blind trust*) — no qual o cidadão precisa confiar passivamente no intermediário ou na autoridade central — por um paradigma de **"transparência verificável"** fundamentado na **matemática da confiança**. 

Este documento detalha os mecanismos técnicos, criptográficos e arquiteturais que garantem a autenticidade, a rastreabilidade, a imutabilidade e a curadoria de visibilidade das informações utilizadas na plataforma.

---

## 1. O Estado como Fonte Primária da Verdade (*Single Source of Truth*)

O princípio basilar do ParlaGuessr é a recusa do filtro editorial privado ou da interpretação partidária na constituição das perguntas do jogo. A fonte primária e inalterável de verdade reside estritamente nos repositórios de **Dados Abertos do Poder Legislativo Brasileiro**:

* **Câmara dos Deputados:** API REST dos Dados Abertos.
* **Senado Federal:** API de Dados Abertos do Senado.

### Garantias de Imparcialidade e Reprodutibilidade
1. **Pipelines Determinísticos:** Todo o processo de geração automática de cartões (votações nominais, autoria de projetos de lei, composição de comissões e histórico de presença) é executado por algoritmos de código aberto com lógica estritamente determinística.
2. **Sem Intermediários:** Não há inserção manual de opiniões ou alterações de mérito sobre o texto das leis ou votos. O dado bruto extraído do Congresso é o exato dado apresentado na tela do usuário.

---

## 2. A Matemática da Confiança: Hashes Criptográficos e Integridade

Para assegurar que as informações extraídas da API oficial não foram adulteradas entre o servidor do Congresso e o dispositivo do usuário, a plataforma adota o conceito de **hashes criptográficos de conteúdo (SHA-256)**.

### Funcionamento do Hash no Pipeline do Jogo
1. **Ingestão do Payload Oficial:** Durante a ingestão dos dados de uma sessão de votação (por exemplo, a lista de votos nominais), o backend calcula o hash de resumo criptográfico SHA-256 sobre a estrutura bruta da resposta oficial.
2. **Impressão Digital Imutável:** O hash gerado funciona como uma assinatura digital única do estado do dado naquele instante.
3. **Validação nos Cartões:** Toda pergunta enviada ao usuário carrega consigo o seu identificador de hash bruto.
4. **Verificação Descentralizada:** Qualquer nó da rede federada ou cliente local pode re-solicitar a mesma consulta à API do Congresso e recomputar o hash. Se houver divergência de um único caractere no voto ou no nome do parlamentar, os hashes não baterão e a pergunta será **rejeitada imediatamente**.

---

## 3. Curadoria Cívica de Visibilidade (Upvote / Downvote)

Além da integridade técnica dos dados brutos, a plataforma assegura transparência na **ordenação e visibilidade dos conteúdos**:

* **Abertura e Neutralidade de Recomendações:** A ordenação de projetos no feed e na lista de desafios não é guiada por algoritmos proprietários nem por métricas de monetização. A relevância é determinada pela ação direta da comunidade através de botões de **Upvote e Downvote**.
* **Foco em Prioridade e Urgência:** O engajamento para cima e para baixo mede a urgência e relevância social da matéria (seja para ser combatida, aprimorada ou viabilizada), garantindo um farol cívico livre de direcionamentos editoriais opacos.

---

## 4. Rastreabilidade em Conteúdos Curados: O Modelo de Dupla Atestação

Quando o jogo utiliza conteúdo que exige seleção humana — como a extração de uma citação marcante das **notas taquigráficas** de uma sessão plenária —, o desafio é garantir que a curadoria seja **transparente quanto à sua autoria**, mas **fiel ao registro oficial subjacente**.

Para resolver isso, o ParlaGuessr implementa a **Dupla Atestação (*Self-Certifying Cards*)**:

```json
{
  "id_desafio": "taquigrafia-sessao-2026-081",
  "dado_oficial": {
    "fonte": "camara_dados_abertos",
    "endpoint_oficial": "api_oficial_discursos",
    "hash_conteudo_bruto": "hash_sha256_do_payload",
    "link_auditoria": "link_direto_para_diario_oficial"
  },
  "curadoria": {
    "trecho_citado": "Nao permitiremos a alteracao da aliquota sem ampla discussao nesta comissao...",
    "parlamentar_id": "12345",
    "instancia_curadora": "instancia_local"
  },
  "assinatura_instancia": "assinatura_digital_ed25519"
}
```

### Os Dois Pilares da Dupla Atestação:
1. **Atestação do Dado Bruto (Content Hash):** Garante que o texto citado pertence exatamente ao Diário Oficial/Sessão Plenária da data informada.
2. **Atestação da Instância (Assinatura Criptográfica):** A instância que realizou a curadoria assina o objeto com sua chave privada. Isso permite que toda a rede saiba **qual servidor criou e curou aquela pergunta**, criando um rastro claro de responsabilidade e proveniência sem modificar o dado oficial subjacente.

---

## 5. Federação Segura: Superando o Dilema da Confiança Cega entre Servidores

Nas redes sociais descentralizadas tradicionais (como o Mastodon e o ecossistema Fediverse), a descentralização traz um risco estrutural documentado na literatura científica: a **confiança cega entre instâncias** (*Trust as the Elephant in the Room*). Nesses sistemas, se um servidor malicioso decidir injetar dados falsos ou manipular estatísticas, as demais instâncias costumam replicar a informação sem ter como auditá-la na origem.

O ParlaGuessr supera esse problema integrando criptografia e validação determinística ao protocolo de federação (**ParlaVerse**):

### Mecanismos de Proteção da Rede
* **Validação Ativa de Recebimento:** Quando uma instância recebe um novo pacote de desafios ou atualizações de ranking de outra instância, o backend em Go não confia passivamente no payload. Ele revalida a assinatura da instância remetente e recomputa o hash dos dados contra a API oficial do Congresso.
* **Autenticação Servidor-a-Servidor (HTTP Signatures):** Toda requisição federada via protocolo ActivityPub/ForgeFed é assinada digitalmente nos cabeçalhos HTTP, impedindo ataques de personificação de nós.
* **Escala sem Perda de Integridade (Validação sob Carga Massiva):** A validação por hash e assinatura `Ed25519` consome menos de 1 milissegundo por cartão. Mesmo em cenários de tráfego intenso com mais de **250.000 usuários simultâneos (CCU)** na rede federada, a segurança criptográfica não é flexibilizada nem sofre gargalos.
* **Bloqueios e Listas de Permissão (*Allowlists & Domain Blocks*):** Administradores de instâncias comunitárias mantêm autonomia total para definir regras de associação, podendo isolar nós que tentem enviar payloads inconsistentes ou violar os protocolos da rede.

---

## 6. Transparência Direta para o Cidadão: O Elo de Auditoria em Um Clique

A transparência técnica só cumpre seu papel cívico se for acessível ao usuário final. Por isso, a interface do ParlaGuessr inclui um requisito obrigatório de design:

* **Selo de Auditoria no Final de Cada Rodada:** Sempre que o jogador conclui um cartão ou palpite (seja no modo *Swipe*, *Maratona* ou *Ligar Comissões*), a tela de revelação apresenta o botão **"Verificar Fonte Oficial"**.
* **Link Direto sem Intermediários:** Ao clicar no selo, o usuário é redirecionado diretamente para a página correspondente no portal oficial do Congresso Nacional (ata de votação nominal, Diário da Câmara ou página do Projeto de Lei).

---

## Resumo da Arquitetura de Confiança

| Camada | Tecnologia / Mecanismo | Garantia Entregue ao Usuário/Rede |
| :--- | :--- | :--- |
| **Origem dos Dados** | APIs de Dados Abertos (Câmara e Senado) | Neutralidade e eliminação de filtros opinativos. |
| **Integridade de Conteúdo** | Hashes Criptográficos SHA-256 | Prova matemática de que os dados não foram alterados. |
| **Curadoria de Visibilidade** | Reações Upvote / Downvote Cívicos | Ordenação de prioridade de pautas pautada no engajamento comunitário. |
| **Autoria e Proveniência** | Assinaturas Digitais Ed25519 | Rastreabilidade da instância que gerou/curou o cartão. |
| **Segurança Federada** | HTTP Signatures + ActivityPub/ForgeFed | Eliminação da confiança cega entre servidores da rede. |
| **Validação em Carga Massiva** | Execução rápida de primitivas criptográficas | Verificação contínua mantida mesmo com 250k+ CCU. |
| **Interface Cidadã** | Selo de Auditoria e Links Primários | Capacidade de checagem direta e imediata com 1 clique. |

---

*A transparência não é um ato de fé na tecnologia, mas a construção de ferramentas abertas que permitam a qualquer cidadão verificar a verdade pelos seus próprios olhos.*
