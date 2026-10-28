import { ArrowDown, ArrowLeft, ArrowUpRight, Landmark, ShieldCheck, Sparkles } from 'lucide-react';

const principles = [
    {
        number: '01',
        title: 'Dados, não torcida',
        description: 'Cada desafio parte de registros públicos. O jogo não diz como votar: ele ajuda você a encontrar a atuação e conferir a evidência por conta própria.',
    },
    {
        number: '02',
        title: 'A prova vem junto',
        description: 'Toda rodada leva à fonte oficial da Câmara. Propostas, autoria e texto integral ficam a um clique, fora do placar e sem intermediários.',
    },
    {
        number: '03',
        title: 'Feito em aberto',
        description: 'ParlaGuessr é um projeto open source e sem fins lucrativos. Transparência pública também deve valer para as ferramentas que a tornam acessível.',
    },
];

export default function AboutUs() {
    return (
        <div className="app-shell about-shell">
            <header className="topbar about-topbar">
                <a className="brand" href="#inicio" aria-label="Voltar ao jogo ParlaGuessr">
                    <span className="brand-mark"><Landmark size={21} strokeWidth={2.2} /></span>
                    <span>parla<span>guessr</span></span>
                </a>
                <a className="about-back" href="#inicio"><ArrowLeft size={15} /> VOLTAR AO JOGO</a>
            </header>

            <main className="about-page">
                <section className="about-hero" aria-labelledby="about-title">
                    <div className="about-hero-copy">
                        <p className="eyebrow"><span className="live-dot" /> TECNOLOGIA CÍVICA · BRASIL</p>
                        <h1 id="about-title">Política pública.<br /><span>Sem complicar.</span></h1>
                        <p className="about-lede">Você sabe o que seu parlamentar está fazendo no Congresso? Jogue, descubra e cobre.</p>
                        <a className="about-scroll-link" href="#como-funciona">CONHEÇA O PROJETO <ArrowDown size={14} /></a>
                    </div>
                    <div className="about-hero-mark" aria-hidden="true">
                        <Landmark size={74} strokeWidth={1.1} />
                        <span>FATO PÚBLICO<br />JOGO ABERTO</span>
                    </div>
                    <span className="about-coordinate" aria-hidden="true">15°47' S · 47°52' W</span>
                </section>

                <section className="about-section about-how" id="como-funciona">
                    <div className="about-section-heading">
                        <p className="eyebrow">A PARTIDA</p>
                        <h2>Trinta segundos.<br /><span>Uma atuação real.</span></h2>
                    </div>
                    <div className="about-steps">
                        <article className="about-step">
                            <span className="about-step-number">01 / DESAFIO</span>
                            <h3>Leia a proposta</h3>
                            <p>Uma proposição legislativa real aparece na tela, com contexto e palavras-chave para orientar a investigação.</p>
                        </article>
                        <article className="about-step">
                            <span className="about-step-number">02 / ESCOLHA</span>
                            <h3>Encontre a autoria</h3>
                            <p>Escolha o parlamentar ligado à proposta antes que o cronômetro chegue a zero. Quanto mais rápido, maior a pontuação.</p>
                        </article>
                        <article className="about-step">
                            <span className="about-step-number">03 / CONFIRA</span>
                            <h3>Abra a fonte</h3>
                            <p>Veja quem é o parlamentar e acesse a página oficial e o texto integral da proposição para conferir os dados.</p>
                        </article>
                    </div>
                </section>

                <section className="about-section about-purpose">
                    <div className="about-purpose-symbol"><ShieldCheck size={23} /></div>
                    <div className="about-purpose-copy">
                        <p className="eyebrow">TRANSPARÊNCIA RADICAL</p>
                        <h2>Sem fake news.<br />Sem filtro partidário.</h2>
                        <p>Os desafios são montados a partir de dados oficiais do Congresso. A proposta é aproximar você da atividade legislativa, não dizer o que pensar. Cada rodada aponta para sua fonte para que você leia, avalie e tire suas próprias conclusões.</p>
                    </div>
                    <div className="about-data-stamp"><span>FONTE</span><strong>ABERTA</strong><small>CONGRESSO NACIONAL</small></div>
                </section>

                <section className="about-section about-principles">
                    <div className="about-section-heading">
                        <p className="eyebrow">POR QUE GAMIFICAR?</p>
                        <h2>Entender também<br /><span>pode ser um jogo.</span></h2>
                    </div>
                    <div className="about-principle-list">
                        {principles.map((principle) => (
                            <article className="about-principle" key={principle.number}>
                                <span>{principle.number}</span>
                                <h3>{principle.title}</h3>
                                <p>{principle.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-close">
                    <Sparkles size={19} />
                    <p>Não é sobre dizer em quem votar.<br /><strong>É sobre saber o que cobrar.</strong></p>
                    <a href="https://dadosabertos.camara.leg.br/" target="_blank" rel="noreferrer">DADOS ABERTOS DA CÂMARA <ArrowUpRight size={14} /></a>
                </section>

                <footer className="about-footer">
                    <span>PARLAGUESSR · JOGUE, DESCUBRA E COBRE</span>
                    <span>OPEN SOURCE · SEM FINS LUCRATIVOS</span>
                </footer>
            </main>

            <footer className="side-footer about-fixed-footer">
                <span><span className="status-dot" /> SOBRE O PROJETO</span>
                <a href="#inicio">VOLTAR AO JOGO <ArrowLeft size={12} /></a>
            </footer>
        </div>
    );
}