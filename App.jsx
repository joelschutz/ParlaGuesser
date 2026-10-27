import React, { useState, useEffect } from 'react';
import { HelpCircle, Award, RefreshCw, Send, CheckCircle2, XCircle } from 'lucide-react';

export default function App() {
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'won', 'lost'

  // Exemplo de Proposição Diária fictícia para prototipagem
  const targetProposition = {
    tipo: 'PEC',
    numero: '45',
    ano: '2019',
    tema: 'Tributação e Finanças Públicas',
    autor: 'Baleia Rossi (MDB/SP)',
    ementa: 'Altera o Sistema Tributário Nacional e dá outras providências (Reforma Tributária).'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guess.trim() || gameStatus !== 'playing') return;

    const newAttempt = {
      id: Date.now(),
      text: guess.trim(),
      isCorrect: guess.trim().toLowerCase().includes('reforma tributaria') || guess.trim().includes('45')
    };

    setAttempts([newAttempt, ...attempts]);
    setGuess('');

    if (newAttempt.isCorrect) {
      setGameStatus('won');
    } else if (attempts.length + 1 >= 6) {
      setGameStatus('lost');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏛️</span>
          <h1 className="text-xl font-bold tracking-tight text-emerald-400">ParlaGuesser</h1>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <button className="hover:text-slate-200 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="hover:text-slate-200 transition-colors">
            <Award className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Card do Desafio Diário */}
        <section className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/50">
              Desafio Diário #{new Date().toISOString().slice(0, 10)}
            </span>
            <span className="text-xs text-slate-400">Tentativas: {attempts.length}/6</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Tema</span>
              <p className="text-base font-medium text-slate-200">{targetProposition.tema}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Autor Principal</span>
              <p className="text-base font-medium text-slate-200">{targetProposition.autor}</p>
            </div>
          </div>
        </section>

        {/* Formulário de Palpite */}
        {gameStatus === 'playing' ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Adivinhe a proposição (ex: PEC 45/2019 ou palavra da ementa)..."
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
            >
              <Send className="w-4 h-4" />
              Enviar
            </button>
          </form>
        ) : (
          <div className={`p-4 rounded-xl border text-center ${gameStatus === 'won' ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300' : 'bg-rose-950/40 border-rose-700/60 text-rose-300'}`}>
            <h2 className="text-lg font-bold mb-1">
              {gameStatus === 'won' ? '🎉 Parabéns! Você acertou!' : '❌ Fim de Jogo!'}
            </h2>
            <p className="text-sm opacity-90">
              A resposta correta era <strong>{targetProposition.tipo} {targetProposition.numero}/{targetProposition.ano}</strong>.
            </p>
          </div>
        )}

        {/* Histórico de Tentativas */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Histórico de Palpites</h3>
          {attempts.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Nenhum palpite enviado ainda.</p>
          ) : (
            <div className="space-y-2">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                    att.isCorrect
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300'
                  }`}
                >
                  <span>{att.text}</span>
                  {att.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}