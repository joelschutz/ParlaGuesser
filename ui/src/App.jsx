import { useEffect, useState } from 'react';
import PocketBase from 'pocketbase';
import {
    ArrowUpRight,
    Bookmark,
    Check,
    ChevronRight,
    Landmark,
    Trophy,
    X,
} from 'lucide-react';
import {
    demoChallenges,
    demoPeople,
    makeRound,
    mapRecordsToChallenges,
    ROUND_SECONDS,
    scoreFor,
} from './game.js';

const pocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const pocketBase = new PocketBase(pocketBaseUrl);

function initials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function PersonPortrait({ person, compact = false }) {
    const photo = person?.foto_url;
    return (
        <span className={`person-portrait${compact ? ' person-portrait--compact' : ''}`}>
            {photo ? <img src={photo} alt="" /> : <span aria-hidden="true">{initials(person?.nome_politico)}</span>}
        </span>
    );
}

export default function App() {
    const [challenges, setChallenges] = useState(demoChallenges);
    const [people, setPeople] = useState(demoPeople);
    const [isDemo, setIsDemo] = useState(true);
    const [round, setRound] = useState(() => makeRound(demoChallenges, demoPeople));
    const [roundNumber, setRoundNumber] = useState(1);
    const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
    const [answered, setAnswered] = useState(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [isSaved, setIsSaved] = useState(() => localStorage.getItem('parlaguesser-saved') === 'true');

    useEffect(() => {
        let active = true;
        Promise.all([
            pocketBase.collection('desafios').getFullList({ sort: '-data_evento' }),
            pocketBase.collection('parlamentares').getFullList({ sort: 'nome_politico' }),
        ])
            .then(([challengeRecords, peopleRecords]) => {
                const mapped = mapRecordsToChallenges(challengeRecords, peopleRecords);
                if (!active || mapped.length === 0 || peopleRecords.length < 4) return;
                setPeople(peopleRecords);
                setChallenges(mapped);
                setRound(makeRound(mapped, peopleRecords));
                setIsDemo(false);
            })
            .catch(() => {
                if (active) setIsDemo(true);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (answered || secondsLeft <= 0) return undefined;
        const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [answered, secondsLeft]);

    useEffect(() => {
        if (secondsLeft === 0 && !answered) {
            setAnswered({ correct: false, timedOut: true, selectedId: null });
            setStreak(0);
        }
    }, [answered, secondsLeft]);

    function chooseAnswer(person) {
        if (answered || !round || secondsLeft <= 0) return;
        const correct = person.id === round.correct.id;
        setAnswered({ correct, timedOut: false, selectedId: person.id });
        if (correct) {
            setScore((total) => total + scoreFor(secondsLeft));
            setStreak((value) => value + 1);
        } else {
            setStreak(0);
        }
    }

    function nextRound() {
        const next = makeRound(challenges, people);
        if (!next) return;
        setRound(next);
        setRoundNumber((value) => value + 1);
        setSecondsLeft(ROUND_SECONDS);
        setAnswered(null);
    }

    function toggleSaved() {
        const nextValue = !isSaved;
        setIsSaved(nextValue);
        localStorage.setItem('parlaguesser-saved', String(nextValue));
    }

    if (!round) return null;

    const progress = (secondsLeft / ROUND_SECONDS) * 100;
    const resultCorrect = answered?.correct;
    const sourceUrl = round.challenge.fonte_url || round.correct.perfil_oficial_url;
    const eventDate = round.challenge.data_evento
        ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(round.challenge.data_evento))
        : 'Sem data registrada';

    return (
        <div className="app-shell">
            <header className="topbar">
                <a className="brand" href="#inicio" aria-label="ParlaGuessr, início">
                    <span className="brand-mark"><Landmark size={21} strokeWidth={2.2} /></span>
                    <span>parla<span>guessr</span></span>
                </a>
                <div className="topbar-right">
                    <span className="edition-label">MARATONA · BRASIL</span>
                    <span className="topbar-divider" />
                    <span className="round-label">RODADA {String(roundNumber).padStart(2, '0')}</span>
                </div>
            </header>

            <main className={`game-layout${answered ? ' has-result' : ''}`} id="inicio">
                <section className="game-column" aria-label="Desafio da rodada">
                    <div className="game-hud" aria-label="Placar da partida">
                        <section className="timer-block" aria-label="Tempo restante">
                            <div className="timer-copy">
                                <p className="eyebrow">TEMPO</p>
                                <strong className="timer-value">{String(secondsLeft).padStart(2, '0')}<small>s</small></strong>
                            </div>
                            <div
                                className={`timer-track${secondsLeft <= 8 && !answered ? ' timer-track--urgent' : ''}`}
                                role="progressbar"
                                aria-label="Tempo restante"
                                aria-valuemin="0"
                                aria-valuemax={ROUND_SECONDS}
                                aria-valuenow={secondsLeft}
                            >
                                <span style={{ width: `${progress}%` }} />
                            </div>
                        </section>
                        <section className="score-card" aria-label="Pontuação">
                            <p className="eyebrow">SUA PONTUAÇÃO</p>
                            <div className="score-row">
                                <strong className="score-total">{score.toLocaleString('pt-BR')}</strong>
                                <span className="score-unit">PTS</span>
                                <span className="score-potential">+{scoreFor(secondsLeft)}</span>
                            </div>
                            <p className="score-note">100 base + 10 por segundo</p>
                        </section>
                    </div>

                    {isDemo && (
                        <div className="demo-notice" role="status">
                            <span className="demo-symbol">i</span>
                            Modo demonstração: conteúdo ilustrativo, sem dados parlamentares reais.
                        </div>
                    )}

                    <article className="challenge-panel">
                        <div className="panel-topline">
                            <span className="challenge-type">{round.challenge.tipo || 'DESAFIO'}</span>
                            <span className="challenge-date">RODADA {String(roundNumber).padStart(2, '0')} · {eventDate}</span>
                        </div>
                        <p className="proposition-label">A PROPOSIÇÃO</p>
                        <h1 className="proposition-title">{round.challenge.titulo}</h1>
                        <p className="challenge-description">
                            {round.challenge.descricao || 'Qual parlamentar está associado a esta iniciativa?'}
                        </p>
                        {sourceUrl ? (
                            <a className="source-link" href={sourceUrl} target="_blank" rel="noreferrer">
                                VER FONTE OFICIAL <ArrowUpRight size={14} />
                            </a>
                        ) : (
                            <span className="source-link source-link--muted">FONTE OFICIAL INDISPONÍVEL</span>
                        )}
                        <span className="panel-index" aria-hidden="true">PG / 0{roundNumber}</span>
                    </article>

                    <div className="answer-heading">
                        <div>
                            <p className="eyebrow">QUEM ESTÁ LIGADO A ESTA PROPOSIÇÃO?</p>
                        </div>
                        <span className="answer-count">04 OPÇÕES</span>
                    </div>

                    {!answered && <div className="answer-grid" role="group" aria-label="Opções de resposta">
                        {round.choices.map((person, index) => {
                            return (
                                <button
                                    className="answer-option"
                                    key={person.id}
                                    onClick={() => chooseAnswer(person)}
                                >
                                    <span className="option-index">0{index + 1}</span>
                                    <PersonPortrait person={person} compact />
                                    <span className="option-copy">
                                        <strong>{person.nome_politico}</strong>
                                        <small>{person.partido || 'Partido não informado'} <i /> {person.uf || 'UF --'}</small>
                                    </span>
                                    <span className="option-result">
                                        <ChevronRight size={17} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>}

                </section>

                <aside className="game-meta" aria-label="Detalhes da partida">
                    <section className="streak-card">
                        <span className="streak-icon"><Trophy size={18} /></span>
                        <div><p className="eyebrow">SEQUÊNCIA</p><strong>{String(streak).padStart(2, '0')} <small>acertos</small></strong></div>
                    </section>
                    <div className="side-quote">
                        <span className="quote-mark">“</span>
                        <p>Transparência não é favor.<br />É o mínimo.</p>
                        <span className="quote-caption">JOGUE. DESCUBRA. COBRE.</span>
                    </div>
                    <footer className="side-footer">
                        <span><span className="status-dot" /> {isDemo ? 'AMBIENTE DE TESTE' : 'DADOS CONECTADOS'}</span>
                        <a href="https://dadosabertos.camara.leg.br/" target="_blank" rel="noreferrer">DADOS ABERTOS <ArrowUpRight size={12} /></a>
                    </footer>
                </aside>

                {answered && (
                    <section className={`reveal-panel${resultCorrect ? ' reveal-panel--success' : ' reveal-panel--miss'}`} role="status" aria-live="polite">
                        <div className="reveal-header">
                            <span className="reveal-icon">{resultCorrect ? <Check size={16} /> : <X size={16} />}</span>
                            <div>
                                <p className="eyebrow">{answered.timedOut ? 'TEMPO ESGOTADO' : resultCorrect ? 'RESPOSTA CERTA' : 'NÃO FOI DESSA VEZ'}</p>
                                <h3>{round.correct.nome_politico}</h3>
                            </div>
                            <button className={`save-button${isSaved ? ' is-saved' : ''}`} onClick={toggleSaved} title={isSaved ? 'Remover dos destaques locais' : 'Salvar destaque neste dispositivo'}>
                                <Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} />
                                <span>{isSaved ? 'SALVO' : 'SALVAR'}</span>
                            </button>
                        </div>
                        <div className="reveal-details">
                            <PersonPortrait person={round.correct} />
                            <div className="person-facts">
                                <span>{round.correct.partido || 'Partido não informado'}</span>
                                <b>{round.correct.uf || 'UF não informada'}</b>
                                <span>{round.correct.casa || 'Congresso Nacional'}</span>
                            </div>
                            {sourceUrl && <a className="audit-button" href={sourceUrl} target="_blank" rel="noreferrer">AUDITAR <ArrowUpRight size={14} /></a>}
                        </div>
                        <button className="next-button" onClick={nextRound}>
                            PRÓXIMO DESAFIO <ChevronRight size={17} />
                        </button>
                    </section>
                )}
            </main>
        </div>
    );
}