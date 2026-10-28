export const ROUND_SECONDS = 90;

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

export function getSocialLinks(person) {
    if (!Array.isArray(person?.redes_sociais)) return [];

    return person.redes_sociais.flatMap((value) => {
        if (typeof value !== 'string') return [];

        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) return [];

            const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
            const label = hostname.includes('instagram.com') ? 'Instagram'
                : hostname.includes('facebook.com') ? 'Facebook'
                    : hostname === 'x.com' || hostname.includes('twitter.com') ? 'X'
                        : hostname.includes('youtube.com') || hostname === 'youtu.be' ? 'YouTube'
                            : hostname.includes('linkedin.com') ? 'LinkedIn'
                                : hostname;

            return [{ href: url.href, label }];
        } catch {
            return [];
        }
    });
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
            url: record.url || record.fonte_url || '',
            parlamentar: record.expand?.parlamentar ?? peopleById.get(record.parlamentar),
        }))
        .filter((record) => record.parlamentar);
}

export function prepareGameData(challengeRecords, people) {
    const challenges = mapRecordsToChallenges(challengeRecords, people);
    const round = makeRound(challenges, people);

    if (!round) {
        throw new Error('O PocketBase não tem desafios vinculados a parlamentares suficientes para iniciar uma rodada.');
    }

    return { challenges, people, round };
}