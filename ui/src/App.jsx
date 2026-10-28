import { useEffect, useRef, useState } from 'react';
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
    getSocialLinks,
    makeRound,
    prepareGameData,
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
    const appShellRef = useRef(null);
    const [challenges, setChallenges] = useState(demoChallenges);
    const [people, setPeople] = useState(demoPeople);
    const [isDemo, setIsDemo] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [round, setRound] = useState(() => makeRound(demoChallenges, demoPeople));
    const [roundNumber, setRoundNumber] = useState(1);
    const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
    const [answered, setAnswered] = useState(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [isSaved, setIsSaved] = useState(() => localStorage.getItem('parlaguesser-saved') === 'true');

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setLoadError(false);
        Promise.all([
            pocketBase.collection('desafios').getFullList({ sort: '-data_evento', expand: 'parlamentar' }),
            pocketBase.collection('parlamentares').getFullList({ sort: 'nome_politico' }),
        ])
            .then(([challengeRecords, peopleRecords]) => {
                const data = prepareGameData(challengeRecords, peopleRecords);
                if (!active) return;
                setPeople(data.people);
                setChallenges(data.challenges);
                setRound(data.round);
                setIsDemo(false);
            })
            .catch(() => {
                if (!active) return;
                setPeople(demoPeople);
                setChallenges(demoChallenges);
                setRound(makeRound(demoChallenges, demoPeople));
                setIsDemo(true);
                setLoadError(true);
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [loadAttempt]);

    useEffect(() => {
        if (isLoading || answered || secondsLeft <= 0) return undefined;
        const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [answered, isLoading, secondsLeft]);

    useEffect(() => {
        if (secondsLeft === 0 && !answered) {
            setAnswered({ correct: false, timedOut: true, selectedId: null });
            setStreak(0);
        }
    }, [answered, secondsLeft]);

    useEffect(() => {
        const appShell = appShellRef.current;
        if (!appShell) return undefined;

        let frameId = 0;
        const updateScrollEffects = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => {
                appShell.querySelectorAll('.scroll-proposition-copy').forEach((element) => {
                    const top = element.getBoundingClientRect().top;
                    const progress = Math.min(1, Math.max(0, (180 - top) / 104));
                    element.style.setProperty('--copy-opacity', String(1 - progress * 0.86));
                    element.style.setProperty('--copy-offset', `${progress * -18}px`);
                });

                appShell.querySelectorAll('.scroll-answer-option').forEach((element) => {
                    const top = element.getBoundingClientRect().top;
                    const progress = Math.min(1, Math.max(0, (window.innerHeight - top) / (window.innerHeight * 0.32)));
                    element.style.setProperty('--choice-opacity', String(0.65 + progress * 0.35));
                    element.style.setProperty('--choice-offset', `${(1 - progress) * 22}px`);
                });
            });
        };

        updateScrollEffects();
        window.addEventListener('scroll', updateScrollEffects, { passive: true });
        window.addEventListener('resize', updateScrollEffects);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('scroll', updateScrollEffects);
            window.removeEventListener('resize', updateScrollEffects);
        };
    }, [round]);

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
    const sourceUrl = round.challenge.url || round.challenge.fonte_url || round.correct.perfil_oficial_url;
    const deputySocialLinks = getSocialLinks(round.correct);
    const eventDate = round.challenge.data_evento
        ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(round.challenge.data_evento))
        : 'Sem data registrada';

    return (
        <div className="app-shell" ref={appShellRef}>
            <header className="topbar">
                <a className="brand" href="#inicio" aria-label="ParlaGuessr, início">
                    <span className="brand-mark"><Landmark size={21} strokeWidth={2.2} /></span>
                    <span>parla<span>guessr</span></span>
                </a>
                <div className="topbar-right">
                    <span className="edition-label">MARATONA · BRASIL</span>
                    <span className="topbar-divider" />
                    <span className="round-label">RODADA {String(roundNumber).padStart(2, '0')}</span>
                    <span className="topbar-divider" />
                    <div className="topbar-stats" aria-label="Placar da partida">
                        <div className="topbar-stat topbar-stat--timer" aria-label={`${secondsLeft} segundos restantes`}>
                            <span className="eyebrow">TEMPO</span>
                            <strong className={secondsLeft <= 8 && !answered ? 'is-urgent' : ''}>{String(secondsLeft).padStart(2, '0')}<small>s</small></strong>
                            <span className="topbar-timer-track" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span>
                        </div>
                        <div className="topbar-stat topbar-stat--score">
                            <span className="eyebrow">PONTOS</span>
                            <strong>{score.toLocaleString('pt-BR')}<small>PTS</small></strong>
                        </div>
                        <div className="topbar-stat topbar-stat--streak">
                            <Trophy size={15} aria-hidden="true" />
                            <span className="eyebrow">SEQUÊNCIA</span>
                            <strong>{String(streak).padStart(2, '0')}</strong>
                        </div>
                    </div>
                </div>
            </header>

            <main className={`game-layout${answered ? ' has-result' : ''}`} id="inicio">
                <section className="game-column" aria-label="Desafio da rodada">
                    {isDemo && (
                        <div className="demo-notice" role="status">
                            <span className="demo-symbol">i</span>
                            <span>
                                {isLoading
                                    ? 'Carregando desafios do PocketBase...'
                                    : loadError
                                        ? 'Não foi possível carregar o PocketBase. Exibindo conteúdo demonstrativo.'
                                        : 'Modo demonstração: conteúdo ilustrativo, sem dados parlamentares reais.'}
                            </span>
                            {loadError && !isLoading && (
                                <button className="demo-retry" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
                                    TENTAR NOVAMENTE
                                </button>
                            )}
                        </div>
                    )}

                    <article className="challenge-panel">
                        <div className="panel-topline">
                            <span className="challenge-type">{round.challenge.tipo || 'DESAFIO'}</span>
                            <span className="challenge-date">RODADA {String(roundNumber).padStart(2, '0')} · {eventDate}</span>
                        </div>
                        <p className="proposition-label scroll-proposition-copy">A PROPOSIÇÃO</p>
                        <h1 className="proposition-title scroll-proposition-copy">{round.challenge.titulo}</h1>
                        <p className="challenge-description scroll-proposition-copy">
                            {round.challenge.descricao || 'Qual parlamentar está associado a esta iniciativa?'}
                        </p>
                        {Array.isArray(round.challenge.keywords) && round.challenge.keywords.length > 0 && (
                            <details className="proposition-keywords">
                                <summary>PALAVRAS-CHAVE <span>{round.challenge.keywords.length}</span></summary>
                                <ul>
                                    {round.challenge.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
                                </ul>
                            </details>
                        )}
                        <span className="panel-index" aria-hidden="true">PG / 0{roundNumber}</span>

                        <div className="answer-section">
                            <div className="answer-heading">
                                <div>
                                    <p className="eyebrow">QUEM ESTÁ LIGADO A ESTA PROPOSIÇÃO?</p>
                                </div>
                                <span className="answer-count">04 OPÇÕES</span>
                            </div>

                            <div className="answer-grid" role="group" aria-label="Opções de resposta">
                                {round.choices.map((person, index) => (
                                    <button
                                        className={`answer-option scroll-answer-option${answered && person.id === round.correct.id ? ' is-correct' : ''}${answered?.selectedId === person.id && !resultCorrect ? ' is-wrong' : ''}${answered ? ' is-locked' : ''}`}
                                        key={person.id}
                                        onClick={() => chooseAnswer(person)}
                                        disabled={Boolean(answered)}
                                    >
                                        <span className="option-index">0{index + 1}</span>
                                        <PersonPortrait person={person} compact />
                                        <span className="option-copy">
                                            <strong>{person.nome_politico}</strong>
                                            <small>{person.partido || 'Partido não informado'} <i /> {person.uf || 'UF --'}</small>
                                        </span>
                                        <span className="option-result">
                                            {answered && person.id === round.correct.id && <Check size={17} />}
                                            {answered?.selectedId === person.id && !resultCorrect && <X size={17} />}
                                            {!answered && <ChevronRight size={17} />}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </article>

                </section>

                <aside className="game-meta" aria-label="Detalhes da partida">
                    <div className="side-quote">
                        <span className="quote-mark">“</span>
                        <p>Transparência não é favor.<br />É o mínimo.</p>
                        <span className="quote-caption">JOGUE. DESCUBRA. COBRE.</span>
                    </div>
                    <footer className="side-footer">
                        <span><span className="status-dot" /> {isLoading ? 'CONECTANDO' : isDemo ? 'MODO DEMO' : 'DADOS CONECTADOS'}</span>
                        <a href="#about">ABOUT US <ArrowUpRight size={12} /></a>
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
                        </div>
                        {deputySocialLinks.length > 0 && (
                            <nav className="deputy-social-links" aria-label={`Redes sociais de ${round.correct.nome_politico}`}>
                                <span className="eyebrow">REDES</span>
                                {deputySocialLinks.map((social) => (
                                    <a key={social.href} href={social.href} target="_blank" rel="noopener noreferrer">
                                        {social.label} <ArrowUpRight size={12} />
                                    </a>
                                ))}
                            </nav>
                        )}
                        <div className="reveal-source-links">
                            {sourceUrl ? (
                                <a className="audit-button reveal-source-link" href={sourceUrl} target="_blank" rel="noreferrer">
                                    FONTE OFICIAL <ArrowUpRight size={14} />
                                </a>
                            ) : (
                                <span className="reveal-source-unavailable">FONTE INDISPONÍVEL</span>
                            )}
                            {round.challenge.urlInteiroTeor && (
                                <a className="audit-button reveal-source-link" href={round.challenge.urlInteiroTeor} target="_blank" rel="noreferrer">
                                    TEXTO INTEGRAL <ArrowUpRight size={14} />
                                </a>
                            )}
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