import test from 'node:test';
import assert from 'node:assert/strict';
import { demoChallenges, demoPeople, getSocialLinks, makeRound, mapRecordsToChallenges, prepareGameData, scoreFor } from './game.js';

test('score follows the round formula and never rewards negative time', () => {
    assert.equal(scoreFor(30), 400);
    assert.equal(scoreFor(7), 170);
    assert.equal(scoreFor(-1), 100);
});

test('round contains one correct answer and three unique distractors', () => {
    const round = makeRound(demoChallenges, demoPeople, () => 0.25);
    assert.equal(round.choices.length, 4);
    assert.equal(new Set(round.choices.map((person) => person.id)).size, 4);
    assert.ok(round.choices.some((person) => person.id === round.correct.id));
});

test('records without a linked parliamentarian cannot become a round', () => {
    assert.equal(makeRound([{ id: 'orphan', parlamentar: 'missing' }], demoPeople), null);
});

test('round is unavailable when there are fewer than four unique options', () => {
    assert.equal(makeRound(demoChallenges, demoPeople.slice(0, 3)), null);
    const duplicatedPeople = [...demoPeople.slice(0, 3), { ...demoPeople[1] }];
    assert.equal(makeRound(demoChallenges, duplicatedPeople), null);
});

test('record mapper resolves relation and preserves proposition metadata', () => {
    const records = [{
        id: 'challenge',
        parlamentar: demoPeople[0].id,
        fonte_url: 'https://example.test/source',
        keywords: ['Administração Pública'],
        urlInteiroTeor: 'https://example.test/full-text',
    }];
    const [challenge] = mapRecordsToChallenges(records, demoPeople);
    assert.equal(challenge.parlamentar.nome_politico, demoPeople[0].nome_politico);
    assert.equal(challenge.url, 'https://example.test/source');
    assert.deepEqual(challenge.keywords, ['Administração Pública']);
    assert.equal(challenge.urlInteiroTeor, 'https://example.test/full-text');
});

test('database records with expanded parliamentarian start a real round', () => {
    const challengeRecords = [{
        id: 'database-challenge',
        tipo: 'autoria_projeto',
        titulo: 'PL 12/2026',
        descricao: 'Proposta vinda do PocketBase.',
        parlamentar: demoPeople[0].id,
        expand: { parlamentar: demoPeople[0] },
    }];

    const data = prepareGameData(challengeRecords, demoPeople);
    assert.equal(data.challenges[0].id, 'database-challenge');
    assert.equal(data.round.challenge.titulo, 'PL 12/2026');
    assert.equal(data.round.correct.id, demoPeople[0].id);
});

test('database records without usable challenge links fail clearly', () => {
    assert.throws(
        () => prepareGameData([{ id: 'orphan', parlamentar: 'missing' }], demoPeople),
        /desafios vinculados/,
    );
});

test('social link helper labels networks and rejects unsafe or malformed URLs', () => {
    const links = getSocialLinks({
        redes_sociais: [
            'https://www.instagram.com/deputada/',
            'https://twitter.com/deputado',
            'javascript:alert(1)',
            'not a URL',
        ]
    });

    assert.deepEqual(links, [
        { href: 'https://www.instagram.com/deputada/', label: 'Instagram' },
        { href: 'https://twitter.com/deputado', label: 'X' },
    ]);
});