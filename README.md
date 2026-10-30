# Sobre o ParlaGuessr

## "Você sabe o que o seu parlamentar está fazendo no Congresso? Jogue, descubra e cobre."

O **ParlaGuessr** nasce com um propósito claro: **transformar a fiscalização política no Brasil em uma experiência direta, acessível e dinâmica**.

Por muito tempo, o acompanhamento do Poder Legislativo foi tratado como um assunto burocrático, escondido em portais de transparência difíceis de navegar, relatórios extensos e uma linguagem fechada. O ParlaGuessr busca quebrar essa barreira, trazendo informação política de forma clara, dinâmica e interativa.

---

## 🎮 Como Funciona o Jogo?

No modo principal de jogo, o **Modo Maratona**, você é colocado diante de ações reais que acontecem em Brasília:
1. **O Desafio:** Na tela, surge uma proposta de lei relevante, uma liderança de comissão ou uma votação marcante.
2. **A Escolha:** Você tem 30 segundos para identificar qual deputado ou senador é o verdadeiro responsável por aquela atuação.
3. **O Resultado:** Quanto mais rápido você acertar, maior será sua pontuação. Se errar ou o tempo acabar, a partida é encerrada.
4. **A Prova:** Ao final de cada rodada, você recebe o link direto para a fonte oficial do Congresso para checar a informação com total transparência.

Quanto mais você joga, mais compreende o perfil das propostas e o posicionamento de quem ocupa as cadeiras em Brasília.

---

## 🏛️ Transparência Radical e Dados Reais

No ParlaGuessr, **não existe espaço para fake news ou opiniões partidárias**.

Todas as perguntas apresentadas no jogo são geradas diretamente a partir das **APIs oficiais de Dados Abertos da Câmara dos Deputados e do Senado Federal**. Isso significa que cada ponto acumula valor real e cada resposta pode ser verificada em fonte oficial.

---

## 🚀 Por que a Gamificação?

Acreditamos que **acompanhar a política não precisa ser chato**. A gamificação (o uso de mecânicas de jogos em contextos do dia a dia) permite que a fiscalização política se torne parte da rotina de forma leve e envolvente.

- **Competição Saudável:** Dispute posições no Ranking Geral e teste quem na sua rede realmente entende do Congresso.
- **Participação Ativa:** Em vez de receber passivamente informações filtradas por terceiros, você analisa os recibos e tira suas próprias conclusões.
- **Comunidade e Destaques:** Destaque atuações e propostas importantes para que outros jogadores da comunidade também fiquem sabendo.

---

## ✊ Um Projeto Aberto e Independente

O ParlaGuessr é uma iniciativa **100% open-source (código aberto)** e sem fins lucrativos. Acreditamos na tecnologia cívica como ferramenta de emancipação, transparência e resistência digital.

Nosso objetivo não é dizer em quem você deve votar, mas sim garantir que você tenha as ferramentas e as evidências necessárias para **jogar, descobrir e cobrar**.

---

## 🔨 Build local e execução

Para compilar a interface web e rodar a aplicação localmente:

```bash
cd ui
npm install
npm run build
cd ..
go run .
```

Em seguida, abra o navegador em:

```text
http://localhost:8090
```

A aplicação usa o PocketBase em segundo plano e serve a interface embutida no binário. O diretório `pb_data` será criado automaticamente ao iniciar a aplicação.

## 🧩 Executando os binários gerados

Os binários de release são construídos para desktop e incluem tanto o frontend quanto o backend no mesmo arquivo.

- Linux: `./parlaguesser-linux-amd64`
- macOS: `./parlaguesser-darwin-arm64` (ou `-amd64`)
- Windows: `parlaguesser-windows-amd64.exe`

Exemplo:

```bash
./parlaguesser-linux-amd64
```

Depois, abra:

```text
http://localhost:8090
```

Use o app normalmente como um jogo local. O binário gerado não precisa de instalação adicional e já serve a interface pronta em seu computador.
