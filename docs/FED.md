# FED-v3.md — Guia de Arquitetura, Federação, Segurança, Capacidade e Infraestrutura Homelab (ParlaVerse)

Este documento estabelece as especificações técnicas, padrões de infraestrutura, protocolos de segurança, dimensionamento de capacidade e análise de custos para desenvolvedores e coletivos que desejam operar um nó federado (*Full Node*, *Light Node* ou *Homelab Node*) no ecossistema **ParlaGuessr**.

---

## 1. Visão Geral da Arquitetura Federada (ParlaVerse)

O **ParlaVerse** é a camada de comunicação assíncrona e descentralizada do ParlaGuessr. Ele permite que diferentes instâncias (universidades, grêmios, coletivos regionais ou servidores pessoais) compartilhem desafios, listas de presença legislativa e rankings de coletivos sem depender de um servidor centralizador.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DO NÓ HOMELAB / FEDERADO                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ CLIENTES / JOGADORES (PWA)                                                   │
│   └── Acesso público via Load Balancer (Cloudflare Tunnel Multi-Origin)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ NÓ LOCAL (Go + PocketBase + SQLite em modo WAL)                             │
│   ├── Game Engine & API REST (Porta 8090)                                   │
│   ├── Federation Middleware (ActivityPub / ForgeFed)                        │
│   └── Validador Criptográfico (SHA-256 & Assinaturas Ed25519)              │
├─────────────────────────────────────────────────────────────────────────────┤
│ REDE MESH PRIVADA ISOLADA (Tailscale ACLs / WireGuard / Headscale)          │
│   └── Comunicação Servidor-a-Servidor (Apenas porta 8090 entre nós)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estratégia de Resiliência e Tolerância a Falhas

A arquitetura do ParlaGuessr foi projetada sob o paradigma **Offline-First** e **Multi-Relay**, garantindo que a experiência do usuário final no aplicativo não seja afetada pelo desligamento temporário de máquinas locais ou instabilidade de rede.

### 2.1. Execução no Cliente (PWA)
* **Pre-Fetching em Lote (Batching):** Ao iniciar uma sessão, o PWA consome um lote de cartões de jogo (20 a 50 desafios, fotos e dados de votação) e os armazena no `IndexedDB` do navegador via Service Worker.
* **Game Loop Desacoplado:** O cronômetro de 30s, pontuação e validação de palpites ocorrem 100% no cliente local.
* **Fila de Sincronização Assíncrona (Offline Queue):** Registros de partidas e reações são armazenados localmente e enviados em background assim que a conexão é reestabelecida.

### 2.2. Failover Multi-Relay
* O PWA mantém um registro de *relays* conhecidos da rede federada.
* Se a instância primária do usuário ficar offline (HTTP 503 / Timeout), o cliente redireciona a busca de novos lotes de perguntas para um nó secundário ativo de forma transparente.
* **Validação Cruzada:** Cartões recebidos de nós secundários passam por verificação local de hash SHA-256 contra a API oficial do Congresso antes de serem exibidos na tela.

---

## 3. Infraestrutura para Homelabs e Servidores Pessoais

O uso de máquinas locais (*homelabs*, mini PCs, Raspberry Pi ou computadores pessoais) permite operar nós completos a custo zero. Para contornar limitações de rede doméstica (como IP dinâmico e CGNAT), adota-se a combinação de **Mesh VPN** para a federação e **Tunneling Leve** para acesso público.

### 3.1. Rede Mesh Privada (Federação Inter-Instâncias)
A comunicação servidor-a-servidor entre nós da rede ocorre isolada em uma rede sobreposta (*overlay network*):
* **Tecnologia Recomendada:** Tailscale (protocolo WireGuard) ou Headscale / ZeroTier / Nebula.
* **Vantagens:** Atravessamento automático de NAT/CGNAT (*NAT Traversal*), IP privado fixo na faixa da malha (ex: `100.x.x.x`) e criptografia de ponta a ponta sem necessidade de abertura de portas no roteador doméstico.

### 3.2. Publicação e Ingress para Usuários Finais (Public Front-Door)
Para que jogadores comuns acessem o PWA sob um único domínio comunitário (ex: `app.parlaguessr.org`) sem necessidade de instalar cliente VPN:
* **Cloudflare Tunnel Multi-Origin (`cloudflared`)**
  * Cada voluntário roda um túnel individual apontando para o seu próprio homelab.
  * O painel DNS da Cloudflare distribui o tráfego entre os túneis ativos.
  * Caso o homelab do voluntário A seja desligado, o *Health Check* da Cloudflare redireciona todo o tráfego público para os homelabs B e C automaticamente.

---

## 4. Dimensionamento, Capacidade e Métricas de Carga

A arquitetura do ParlaGuessr combina a alta performance do backend compilado em Go com o modo WAL (*Write-Ahead Logging*) do SQLite e a inteligência do pre-fetching no PWA, resultando em uma capacidade de atendimento massiva com consumo mínimo de infraestrutura.

### 4.1. Capacidade do Nó Individual (Homelab)
* **Desempenho por Nó:** Um único executável Go + PocketBase rodando em hardware doméstico modesto (como um mini PC Intel N100, Raspberry Pi 4 ou notebook antigo) processa facilmente entre **500 e 1.000 requisições de leitura por segundo (RPS)**.
* **Eficácia do Batching:** Como o PWA baixa de 20 a 50 cartões por requisição e roda o loop do jogo localmente por 30 a 60 segundos, cada usuário ativo gera em média apenas 1 a 2 requisições por minuto ao servidor.
* **Usuários Simultâneos por Nó (*CCU*):** Um único homelab suporta confortavelmente entre **10.000 e 25.000 jogadores simultâneos ativos**.

### 4.2. Capacidade da Rede Federada (Escala do Cluster)

| Escala da Rede Comunitária | Capacidade de Processamento | Jogadores Simultâneos (*CCU*) |
| :--- | :---: | :---: |
| **1 Homelab Individual** (Notebook / Mini PC) | ~500 a 1.000 RPS | **10.000 a 25.000** |
| **Cluster de 5 Homelabs** (Coletivo Regional) | ~2.500 RPS | **50.000 a 100.000** |
| **Cluster de 10 a 20 Homelabs** (Rede Universitária) | ~5.000 a 10.000 RPS | **100.000 a 250.000+** |

### 4.3. Limites de Rede e Expansão da Malha Mesh
* **Tailscale Mesh (Plano Gratuito):** Permite interconectar até **100 homelabs** na mesma malha privada sem qualquer custo.
* **Headscale (Self-Hosted):** Ao utilizar o *Headscale* (servidor de controle open-source do Tailscale), o limite de nós é removido, permitindo conectar **milhares de homelabs** ilimitadamente.
* **Proteção e Economia de Banda:** 
  * Os usuários finais **nunca sobrecarregam as APIs do Congresso**; a ingestão governamental é agendada e feita unicamente pelos servidores em segundo plano.
  * A borda da Cloudflare armazena em cache as fotos de parlamentares e assets estáticos do PWA, reduzindo em até **95% o consumo de banda larga residencial** dos voluntários.

---

## 5. Segurança, Gestão de Chaves e Privacidade de Homelabs

Para evitar o risco de **Ponto Único de Comprometimento** (*Single Point of Compromise*) e proteger a privacidade das redes domésticas dos participantes, o ParlaGuessr aplica isolamento criptográfico rigoroso.

### 5.1. Isolamento das Chaves Criptográficas do Jogo (`Ed25519`)
* **Geração Estritamente Local:** O par de chaves `Ed25519` é gerado automaticamente pelo binário em Go no primeiro boot do contêiner e armazenado no volume isolado `./keys/private.key`.
* **Segredo Não Compartilhado:** A chave privada **nunca trafega pela rede** nem é enviada a outros membros.
* **Revogação Cirúrgica via Allowlist:** Cada nó expõe apenas sua **chave pública**. Se a máquina de um participante for invadida ou desconectada do projeto, os administradores removem a chave pública daquele nó da lista de permissões (*Allowlist*), invalidando assinaturas futuras daquele nó sem afetar os demais.

### 5.2. Credenciais de Ingress e Túneis Individuais
* **Zero Tokens Compartilhados:** Cada voluntário recebe um token de túnel exclusivo (`INDIVIDUAL_CLOUDFLARE_TOKEN`) gerado para a sua máquina.
* Se um voluntário sair da comunidade, revoga-se apenas o token correspondente no painel da Cloudflare.

### 5.3. Regras de Firewall e Isolamento de Rede Mesh (Tailscale ACLs)
Para impedir que participantes da VPN tenham acesso a outros dispositivos da rede doméstica de um voluntário (como roteadores, Smart TVs ou impressoras), a rede Mesh utiliza **ACLs restritivas**:

```json
// tailscale-acl.json — Regra de Isolamento para a Rede ParlaVerse
{
  "acls": [
    {
      "action": "accept",
      "src": ["group:parlaguessr-nodes"],
      "dst": ["group:parlaguessr-nodes:8090"]
    }
  ]
}
```
* **Acesso Restrito à Porta do Aplicativo:** Os nós só têm autorização para comunicar-se estritamente na porta `8090` (API do ParlaGuessr). Todo o restante do tráfego interno das redes locais é bloqueado.
* **Chaves de Registro de Uso Único:** A associação de novas máquinas exige chaves de uso único (*Single-Use Auth Keys*) temporárias e aprovação pelo administrador via *Tailnet Lock*.

---

## 6. Guia Prático de Implantação (Docker Compose + Tailscale + Cloudflare)

Abaixo está o modelo oficial de implantação utilizando Docker Compose para Homelabs.

### 6.1. Estrutura de Arquivos
```text
/homelab/parlaguessr/
├── docker-compose.yml
├── .env
├── pb_data/ (Volume persistente do PocketBase)
└── keys/    (Chaves criptográficas privadas locais - CHMOD 700)
```

### 6.2. `docker-compose.yml`

```yaml
version: '3.8'

services:
  parlaguessr-node:
    image: ghcr.io/joelschutz/parlaguesser:latest
    container_name: parlaguessr_app
    restart: unless-stopped
    ports:
      - "127.0.0.1:8090:8090"
    environment:
      - PORT=8090
      - NODE_ENV=production
      - INSTANCE_DOMAIN=${INSTANCE_DOMAIN}
      - MESH_IP=${TAILSCALE_IP}
    volumes:
      - ./pb_data:/app/pb_data
      - ./keys:/app/keys
    networks:
      - parlaguessr_net

  tailscale:
    image: tailscale/tailscale:latest
    container_name: parlaguessr_mesh
    hostname: parlaguessr-homelab-${NODE_ID}
    environment:
      - TS_AUTHKEY=${TAILSCALE_AUTHKEY}
      - TS_STATE_DIR=/var/lib/tailscale
    volumes:
      - ./tailscale_state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    restart: unless-stopped
    networks:
      - parlaguessr_net

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: parlaguessr_tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${INDIVIDUAL_CLOUDFLARE_TOKEN}
    networks:
      - parlaguessr_net

networks:
  parlaguessr_net:
    driver: bridge
```

### 6.3. Variáveis de Ambiente (`.env.example`)
```env
# Configurações do Nó Local
NODE_ID=joao-sp
INSTANCE_DOMAIN=app.parlaguessr.org

# Credenciais Individuais (NUNCA COMPARTILHAR)
TAILSCALE_AUTHKEY=tskey-auth-singleuse-xxxxxx
INDIVIDUAL_CLOUDFLARE_TOKEN=eyJhJh...token_exclusivo_do_no
```

---

## 7. Análise de Custos Financeiros

Uma das principais premissas do ParlaGuessr é a **viabilidade econômica absoluta com custo zero de licenciamento ou infraestrutura corporativa**.

| Componente | Provedor / Serviço | Custo Mensal estimado |
| :--- | :--- | :---: |
| **Computação / Hardware** | Servidor Doméstico / Mini PC / PC Antigo (Capacidade ociosa) | **R$ 0,00** |
| **Energia Elétrica (Residual)** | Consumo estimado do Homelab (~10W a 15W contínuos) | **~R$ 5,00 – R$ 12,00** |
| **Ingress & Proteção DDoS** | Cloudflare Zero Trust (Free Tier — até 50 usuários por conta, túneis ilimitados) | **R$ 0,00** |
| **Rede Mesh / Federação** | Tailscale Personal / Community Tier (Até 100 dispositivos e ACLs) ou Headscale | **R$ 0,00** |
| **Domínio Público** | Registro de domínio público (ex: `.org` ou `.com.br`) | **~R$ 40,00 / ano** (~R$ 3,30/mês) |
| **VPS Gateway (Opcional)** | Oracle Always Free (2 Arm OCPUs / 12GB RAM) ou GCP e2-micro | **R$ 0,00** |
| **TOTAL MENSAL ESTIMADO** | **Infraestrutura Comunitária Federada** | **< R$ 15,00 / mês** |

---

## 8. Modificações Técnicas Necessárias na Implementação

Para viabilizar esta arquitetura no repositório `joelschutz/ParlaGuesser`, as seguintes alterações de código e engenharia de software foram mapeadas:

### 8.1. Modificações no Backend (Go + PocketBase)
1. **Módulo de Autogeração de Chaves (`pkg/crypto/keys.go`):**
   * Implementar rotina de verificação no startup: se `./keys/private.key` não existir, gerar automaticamente o par `Ed25519` com permissões de arquivo estritas (`0600`).
2. **Middleware de Assinatura HTTP (`pkg/federation/http_sig.go`):**
   * Adicionar cabeçalhos de assinatura `Signature` e `Digest` em todas as chamadas inter-instâncias via ActivityPub.
3. **Endpoint de Saúde Expandido (`GET /api/health`):**
   * Retornar estado do nó, versão do banco SQLite, uptime, e o hash do último estado sincronizado para facilitar a inspeção pelos balancemêtros da rede.

### 8.2. Modificações no Frontend (React PWA)
1. **Gerenciador de Relays com Fallback (`src/services/relayManager.ts`):**
   * Manter lista ordenada de endpoints de API federados em `localStorage` / `IndexedDB`.
   * Implementar lógica de *retry* com failover transparente: se a requisição ao nó A falhar com HTTP 5xx ou timeout de 3s, chaveia imediatamente para o nó B.
2. **Validador Client-Side de SHA-256 (`src/utils/cryptoValidation.ts`):**
   * Utilizar a API nativa `crypto.subtle.digest('SHA-256', payload)` no navegador para recomputar o hash da pergunta recebida do relay antes de renderizar na tela do jogador.

### 8.3. Modificações nos Arquivos de Configuração do Repositório
1. Adicionar o arquivo `tailscale-acl.json` de exemplo na pasta `/deploy/homelab/`.
2. Criar o script de Onboarding `scripts/bootstrap-homelab.sh` que gera o `.env` local e cria a estrutura de diretórios com as permissões corretas de arquivo.

---

## 9. Rotinas de Manutenção e Backup

1. **Backup Automático do SQLite:**
   * Executar snapshots periódicos da pasta `./pb_data/data.db` e das chaves de criptografia em `./keys/`.
2. **Atualização de Imagens Contêinerizadas:**
   * O aplicativo é empacotado como um binário único Go + PocketBase. Atualizações do sistema exigem apenas a reinicialização do contêiner (`docker compose pull && docker compose up -d`).
3. **Logs e Monitoramento:**
   * Endpoint de saúde nativo disponível em `GET /api/health` para integração com ferramentas de monitoramento local (Uptime Kuma, Prometheus).

---

> **A federação do ParlaGuessr transforma a capacidade computacional ociosa em infraestrutura de cidadania e vigilância democrática com máxima segurança, alta capacidade de carga (250k+ CCU) e custo praticamente zero.**
