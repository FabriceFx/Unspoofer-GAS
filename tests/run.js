#!/usr/bin/env node
/**
 * ============================================================================
 *  UNSPOOFER - tests/run.js
 * ============================================================================
 *  Rôle : Passe le corpus dans le moteur réel et publie la matrice de confusion,
 *         le détail par catégorie et la liste des écarts.
 *
 *  Usage :
 *    node tests/run.js                        Rapport lisible
 *    node tests/run.js --json                 Sortie machine (redirection possible)
 *    node tests/run.js --baseline b.json      Comparaison avant / après
 *    node tests/run.js --strict               Code de sortie 1 si un écart subsiste
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { analyser, identifierMotif } = require('./harness.js');

const args = process.argv.slice(2);
const optJson = args.includes('--json');
const optStrict = args.includes('--strict');
const optBaseline = args.includes('--baseline') ? args[args.indexOf('--baseline') + 1] : null;

const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'corpus.json'), 'utf8'));

// ─── Exécution ─────────────────────────────────────────────────────────────

const resultats = corpus.cas.map((cas) => {
    const { resultat, appels } = analyser(cas, { proprietaire: corpus.proprietaire });

    const detecte = !!resultat.estUsurpation;
    const attenduPhishing = cas.attendu === 'phishing';
    const motif = identifierMotif(resultat.raison);

    let verdict;
    if (attenduPhishing && detecte) verdict = 'VP';
    else if (attenduPhishing && !detecte) verdict = 'FN';
    else if (!attenduPhishing && detecte) verdict = 'FP';
    else verdict = 'VN';

    // Détecté mais par le mauvais contrôle : la menace est vue, mal qualifiée.
    const malClasse =
        verdict === 'VP' && cas.motifAttendu && motif !== cas.motifAttendu;

    const severiteEcart =
        verdict === 'VP' && cas.severiteAttendue && resultat.severite !== cas.severiteAttendue;

    return {
        id: cas.id,
        categorie: cas.categorie,
        discutable: !!cas.discutable,
        verdict,
        malClasse,
        severiteEcart,
        motif,
        motifAttendu: cas.motifAttendu || null,
        severite: resultat.severite || null,
        severiteAttendue: cas.severiteAttendue || null,
        raison: resultat.raison || '',
        note: cas.note || '',
        appels,
    };
});

// ─── Agrégation ────────────────────────────────────────────────────────────

const principaux = resultats.filter((r) => !r.discutable);
const discutables = resultats.filter((r) => r.discutable);

const compte = (liste, v) => liste.filter((r) => r.verdict === v).length;
const VP = compte(principaux, 'VP');
const FP = compte(principaux, 'FP');
const VN = compte(principaux, 'VN');
const FN = compte(principaux, 'FN');
const malClasses = principaux.filter((r) => r.malClasse).length;

const pct = (n, d) => (d === 0 ? '—' : ((n / d) * 100).toFixed(1) + ' %');

const metriques = {
    total: principaux.length,
    VP,
    FP,
    VN,
    FN,
    malClasses,
    rappel: VP + FN === 0 ? null : VP / (VP + FN),
    precision: VP + FP === 0 ? null : VP / (VP + FP),
    tauxFauxPositifs: FP + VN === 0 ? null : FP / (FP + VN),
};

if (optJson) {
    console.log(JSON.stringify({ metriques, resultats }, null, 2));
    process.exit(optStrict && FP + FN + malClasses > 0 ? 1 : 0);
}

// ─── Rapport lisible ───────────────────────────────────────────────────────

const ligne = (c = '─', n = 74) => c.repeat(n);

console.log('\n' + ligne('═'));
console.log('  UNSPOOFER — banc de test du moteur de détection');
console.log(ligne('═'));

console.log(`\n  Corpus : ${principaux.length} cas` +
    (discutables.length ? ` (+ ${discutables.length} cas de politique, comptés à part)` : ''));

console.log('\n  Matrice de confusion');
console.log('  ' + ligne('-', 52));
console.log('                        signalé      non signalé');
console.log(`    phishing attendu   ${String(VP).padStart(7)}      ${String(FN).padStart(11)}`);
console.log(`    légitime attendu   ${String(FP).padStart(7)}      ${String(VN).padStart(11)}`);

console.log('\n  Indicateurs');
console.log('  ' + ligne('-', 52));
console.log(`    Taux de détection (rappel)   ${pct(VP, VP + FN).padStart(8)}   ${VP}/${VP + FN} phishing vus`);
console.log(`    Précision                    ${pct(VP, VP + FP).padStart(8)}   des alertes sont justes`);
console.log(`    Taux de faux positifs        ${pct(FP, FP + VN).padStart(8)}   ${FP}/${FP + VN} légitimes signalés`);
console.log(`    Détections mal qualifiées    ${String(malClasses).padStart(8)}   menace vue, mauvais motif`);

// Détail par catégorie
console.log('\n  Détail par catégorie');
console.log('  ' + ligne('-', 70));
const categories = [...new Set(resultats.map((r) => r.categorie))];
for (const cat of categories) {
    const lot = resultats.filter((r) => r.categorie === cat);
    const ok = lot.filter((r) => r.verdict === 'VP' || r.verdict === 'VN').length;
    const symbole = ok === lot.length ? '✔' : '✘';
    const detail = lot
        .filter((r) => r.verdict === 'FP' || r.verdict === 'FN')
        .map((r) => r.verdict)
        .join(',');
    console.log(
        `    ${symbole} ${cat.padEnd(34)} ${String(ok).padStart(2)}/${String(lot.length).padEnd(2)}` +
        (detail ? `   ${detail}` : '')
    );
}

// Écarts détaillés
const echecs = resultats.filter((r) => r.verdict === 'FP' || r.verdict === 'FN');
if (echecs.length) {
    console.log('\n  Écarts');
    console.log('  ' + ligne('-', 70));
    for (const r of echecs) {
        const etiquette = r.verdict === 'FP' ? 'FAUX POSITIF ' : 'NON DÉTECTÉ  ';
        console.log(`    ${etiquette} ${r.id}${r.discutable ? '  [politique]' : ''}`);
        if (r.verdict === 'FP') console.log(`                  → ${r.raison}`);
        if (r.note) console.log(`                  ⓘ ${r.note}`);
    }
}

const mauvais = resultats.filter((r) => r.malClasse);
if (mauvais.length) {
    console.log('\n  Détections mal qualifiées');
    console.log('  ' + ligne('-', 70));
    for (const r of mauvais) {
        console.log(`    ${r.id}`);
        console.log(`                  attendu : ${r.motifAttendu}   obtenu : ${r.motif} (${r.severite})`);
        if (r.note) console.log(`                  ⓘ ${r.note}`);
    }
}

const severites = resultats.filter((r) => r.severiteEcart);
if (severites.length) {
    console.log('\n  Sévérités inattendues');
    console.log('  ' + ligne('-', 70));
    for (const r of severites) {
        console.log(`    ${r.id} : attendu ${r.severiteAttendue}, obtenu ${r.severite}`);
    }
}

// Comparaison à une référence
if (optBaseline) {
    const ref = JSON.parse(fs.readFileSync(optBaseline, 'utf8'));
    const avant = ref.metriques;
    const fleche = (a, b) => (b > a ? '▲' : b < a ? '▼' : '=');
    const p = (v) => (v === null ? '—' : (v * 100).toFixed(1) + ' %');

    console.log('\n  Comparaison avec ' + path.basename(optBaseline));
    console.log('  ' + ligne('-', 70));
    console.log(`    Taux de détection   ${p(avant.rappel).padStart(8)} → ${p(metriques.rappel).padStart(8)}  ${fleche(avant.rappel, metriques.rappel)}`);
    console.log(`    Précision           ${p(avant.precision).padStart(8)} → ${p(metriques.precision).padStart(8)}  ${fleche(avant.precision, metriques.precision)}`);
    console.log(`    Faux positifs       ${String(avant.FP).padStart(8)} → ${String(metriques.FP).padStart(8)}  ${fleche(metriques.FP, avant.FP)}`);
    console.log(`    Non détectés        ${String(avant.FN).padStart(8)} → ${String(metriques.FN).padStart(8)}  ${fleche(metriques.FN, avant.FN)}`);
    console.log(`    Mal qualifiées      ${String(avant.malClasses).padStart(8)} → ${String(metriques.malClasses).padStart(8)}  ${fleche(metriques.malClasses, avant.malClasses)}`);
}

console.log('\n' + ligne('═') + '\n');

process.exit(optStrict && FP + FN + malClasses > 0 ? 1 : 0);
