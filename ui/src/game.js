export const ROUND_SECONDS = 30;

export const demoPeople = [
    { id: 'demo-1', nome_politico: 'Perfil demonstrativo 01', partido: 'DEMO', uf: '--' },
    { id: 'demo-2', nome_politico: 'Perfil demonstrativo 02', partido: 'DEMO', uf: '--' },
    { id: 'demo-3', nome_politico: 'Perfil demonstrativo 03', partido: 'DEMO', uf: '--' },
    { id: 'demo-4', nome_politico: 'Perfil demonstrativo 04', partido: 'DEMO', uf: '--' },
];

export const demoChallenges = [
    {
        id: 'demo-challenge-1',
        tipo: 'Demonstração',
        titulo: 'Proposta demonstrativa sobre políticas públicas',
        descricao: 'Este conteúdo é apenas uma amostra de interface. Não descreve uma proposta legislativa real.',
        fonte_url: '',
        data_evento: '',
        parlamentar: demoPeople[0],
    },
    {
        id: 'demo-challenge-2',
        tipo: 'Demonstração',
        titulo: 'Atuação demonstrativa em comissão',
        descricao: 'Exemplo fictício para testar o ritmo da partida e a tela de revelação.',
        fonte_url: '',
        data_evento: '',
        parlamentar: demoPeople[1],
    },
];

export function scoreFor(secondsRemaining) {
    return 100 + Math.max(0, secondsRemaining) * 10;
}

export function makeRound(challenges, people, random = Math.random) {
    const validChallenges = challenges.filter((challenge) => challenge.parlamentar?.id);
    if (!validChallenges.length) return null;

    const challenge = validChallenges[Math.floor(random() * validChallenges.length)];
    const correct = challenge.parlamentar;
    const seenIds = new Set([correct.id]);
    const distractors = [];
    for (const person of people) {
        if (person.id && !seenIds.has(person.id)) {
            seenIds.add(person.id);
            distractors.push(person);
        }
    }
    if (distractors.length < 3) return null;

    const shuffled = [...distractors];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    const choices = [correct, ...shuffled.slice(0, 3)];
    for (let index = choices.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
    }

    return { challenge, correct, choices };
}

export function mapRecordsToChallenges(records, people) {
    const peopleById = new Map(people.map((person) => [person.id, person]));
    return records
        .map((record) => ({
            ...record,
            parlamentar: record.expand?.parlamentar ?? peopleById.get(record.parlamentar),
        }))
        .filter((record) => record.parlamentar);
}