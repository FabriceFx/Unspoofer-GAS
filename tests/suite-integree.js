#!/usr/bin/env node
/**
 * ============================================================================
 *  UNSPOOFER - tests/suite-integree.js
 * ============================================================================
 *  Rôle : Exécute testerDetection(), la suite de vingt cas intégrée au produit
 *         et exposée dans l'onglet « Suite de tests » du tableau de bord.
 *
 *  Motivation : cette suite construit un faux GmailMessage à la main. Dès que
 *  le moteur appelle une méthode que ce faux message ne fournit pas, elle lève
 *  une exception au premier cas — et l'onglet reste vide, sans le moindre
 *  message d'erreur. C'est exactement ce qui s'est produit lorsque le garde-fou
 *  anti-boucle a introduit un appel à getSubject().
 *
 *  Le corpus de run.js ne couvrait pas ce risque : il fabrique ses propres
 *  messages et n'emprunte jamais le chemin de testerDetection().
 *
 *  Usage : node tests/suite-integree.js
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.resolve(__dirname, '..');

/** Tous les fichiers du produit : la suite vit dans Principal.gs. */
const FICHIERS = [
    'Config.gs', 'Utils.gs', 'Listes.gs', 'Homoglyphes.gs',
    'Marque.gs', 'DetecteurUsurpation.gs', 'Cache.gs', 'Principal.gs',
];

const source = FICHIERS
    .map((f) => fs.readFileSync(path.join(RACINE, f), 'utf8'))
    .join('\n');

/**
 * Bouchons Apps Script. testerDetection() ne touche ni Gmail ni les
 * déclencheurs, mais Principal.gs et Cache.gs en dépendent au chargement.
 */
const contexte = vm.createContext({
    console,
    Logger: { log: () => {} },
    GmailApp: {
        getUserLabelByName: () => null,
        createLabel: () => ({}),
        search: () => [],
    },
    ScriptApp: { getProjectTriggers: () => [] },
    CacheService: { getScriptCache: () => ({ put() {}, get: () => null }) },
    PropertiesService: {
        getScriptProperties: () => ({
            getProperty: () => null, setProperty() {}, deleteProperty() {},
        }),
    },
    Session: {
        getEffectiveUser: () => ({ getEmail: () => 'utilisateur@exemple.fr' }),
        getActiveUser: () => ({ getEmail: () => 'utilisateur@exemple.fr' }),
        getActiveUserLocale: () => 'fr',
    },
});

let echecs = 0;
const verifier = (intitule, ok, detail) => {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} | ${intitule}${ok || !detail ? '' : '\n         → ' + detail}`);
    if (!ok) echecs++;
};

console.log('\n═══ Suite de tests intégrée (onglet du tableau de bord) ═══\n');

vm.runInContext(source, contexte);

// ─── 1. La suite s'exécute sans lever d'exception ──────────────────────────

let rapport = null;
try {
    rapport = vm.runInContext('testerDetection(true)', contexte);
    verifier('testerDetection() s\'exécute sans exception', true);
} catch (e) {
    verifier('testerDetection() s\'exécute sans exception', false, e.message);
    console.log(`\n  ${echecs} contrôle(s) en échec.\n`);
    process.exit(1);
}

// ─── 2. Elle renvoie un rapport exploitable par le tableau de bord ─────────

verifier('un rapport est retourné', !!rapport);
verifier('le rapport porte les champs attendus par l\'interface',
    rapport && typeof rapport.total === 'number' &&
    typeof rapport.reussis === 'number' &&
    typeof rapport.echoues === 'number' &&
    Array.isArray(rapport.details),
    'reçu : ' + JSON.stringify(Object.keys(rapport || {})));

verifier('chaque cas expose nom, attendu, obtenu et statut',
    rapport.details.every((d) => 'nom' in d && 'attendu' in d &&
        'obtenu' in d && 'statut' in d));

// ─── 3. Tous les cas passent ───────────────────────────────────────────────

const rates = rapport.details.filter((d) => d.statut !== 'RÉUSSI');
verifier(`les ${rapport.total} cas passent`, rates.length === 0,
    rates.map((d) => `${d.nom} (attendu ${d.attendu}, obtenu ${d.obtenu})`).join(' ; '));

// ─── 4. La suite garde son équilibre ───────────────────────────────────────
//
// Une suite qui ne contiendrait que des cas frauduleux serait satisfaite par
// un détecteur qui signale tout. La présence de cas légitimes est ce qui donne
// sa valeur à la mesure.

const frauduleux = rapport.details.filter((d) => d.attendu === true).length;
const legitimes = rapport.details.filter((d) => d.attendu === false).length;

verifier('la suite contient des cas légitimes, pas seulement des fraudes',
    legitimes >= 5, `${frauduleux} frauduleux, ${legitimes} légitimes`);

console.log(`\n  Composition : ${frauduleux} frauduleux · ${legitimes} légitimes · ${rapport.total} au total`);
console.log(`\n  ${echecs === 0 ? 'Tous les contrôles passent.' : echecs + ' contrôle(s) en échec.'}\n`);
process.exit(echecs > 0 ? 1 : 0);
