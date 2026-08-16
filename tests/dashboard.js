#!/usr/bin/env node
/**
 * ============================================================================
 *  UNSPOOFER - tests/dashboard.js
 * ============================================================================
 *  Rôle : Contrôles statiques sur Dashboard.html.
 *
 *  Motivation : le tableau de bord n'est exécuté nulle part avant d'être
 *  déployé. Une fonction appelée sous un nom qui n'existe pas ne se manifeste
 *  qu'au clic de l'utilisateur, et de façon muette — c'est exactement ainsi
 *  que `showLoader()` (la fonction s'appelle `setLoader`) a rendu le
 *  changement de langue inopérant sans qu'aucun rendu ne le révèle.
 *
 *  Usage : node tests/dashboard.js
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(RACINE, 'Dashboard.html'), 'utf8');

let echecs = 0;
const verifier = (intitule, ok, detail) => {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} | ${intitule}${ok || !detail ? '' : '\n         → ' + detail}`);
    if (!ok) echecs++;
};

// ─── Extraction du script client ───────────────────────────────────────────

const blocs = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]);
const script = blocs.join('\n');

/**
 * Retire les commentaires avant l'analyse des appels de fonction : une phrase
 * comme « LOGIQUE CÔTÉ CLIENT (JAVASCRIPT) » serait autrement lue comme un
 * appel à CLIENT(). Le `//` précédé de deux-points est épargné pour ne pas
 * tronquer les URL du type https://.
 * @param {string} code
 * @returns {string}
 */
function sansCommentaires(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const scriptNu = sansCommentaires(script);

verifier('un bloc <script> client est présent', blocs.length > 0);

// ─── 1. Le script est syntaxiquement valide ────────────────────────────────

let syntaxeOk = true;
try {
    new vm.Script(script, { filename: 'Dashboard.html <script>' });
} catch (e) {
    syntaxeOk = false;
    verifier('le script client compile', false, e.message);
}
if (syntaxeOk) verifier('le script client compile', true);

// ─── 2. Toute fonction appelée existe ──────────────────────────────────────

/** Globales fournies par le navigateur ou par l'hôte Apps Script. */
const GLOBALES_CONNUES = new Set([
    // Navigateur
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'alert',
    'confirm', 'prompt', 'parseInt', 'parseFloat', 'isNaN', 'String', 'Number',
    'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'RegExp', 'Error',
    'Set', 'Map', 'Promise', 'encodeURIComponent', 'decodeURIComponent',
    'requestAnimationFrame', 'fetch', 'Intl',
    // Hôte Apps Script (côté client)
    'google',
    // Mots-clés que la regex peut capturer par erreur
    'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof',
    'new', 'delete', 'void', 'in', 'of', 'do', 'else', 'case',
    // 'var(' provient des variables CSS citées dans des chaînes JS
    'var',
]);

/** Fonctions déclarées dans le script, sous toutes ses formes. */
const declarees = new Set();
for (const m of scriptNu.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) declarees.add(m[1]);
for (const m of scriptNu.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g)) {
    declarees.add(m[1]);
}
// Toute autre variable déclarée : elle peut porter un objet appelable
for (const m of scriptNu.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) declarees.add(m[1]);

/** Appels de la forme `identifiant(` non précédés d'un point. */
const appeles = new Set();
for (const m of scriptNu.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) appeles.add(m[2]);

const inconnues = [...appeles]
    .filter((n) => !declarees.has(n) && !GLOBALES_CONNUES.has(n))
    .sort();

verifier('toute fonction appelée est définie', inconnues.length === 0,
    inconnues.length ? 'introuvable(s) : ' + inconnues.join(', ') : '');

// ─── 2b. Toute CONSTANTE en majuscules référencée existe ───────────────────
//
// Le contrôle précédent ne voyait que les appels `nom(`. Une variable
// simplement lue — `DICO === UI_EN_MARQUEUR` — lui échappait, et l'exception
// ne survenait qu'à l'exécution. Les identifiants tout en majuscules sont, par
// convention dans ce fichier, des constantes du script : leur absence est
// toujours une faute de frappe.

// Les chaînes littérales sont retirées : « 'RÉUSSI' » se lisait comme une
// référence à USSI, l'accent n'étant pas un caractère de mot ASCII.
const scriptSansTextes = scriptNu
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');

const constantesUtilisees = new Set();
for (const m of scriptSansTextes.matchAll(/(?<![\p{L}\p{N}_$.])([A-Z][A-Z0-9_]{2,})\b/gu)) {
    constantesUtilisees.add(m[1]);
}
const constantesInconnues = [...constantesUtilisees]
    .filter((n) => !declarees.has(n) && !GLOBALES_CONNUES.has(n))
    .sort();

verifier('toute constante référencée est définie', constantesInconnues.length === 0,
    constantesInconnues.length ? 'introuvable(s) : ' + constantesInconnues.join(', ') : '');

// ─── 3. Les fonctions référencées dans le HTML existent ────────────────────

/** Gestionnaires inline : onclick="maFonction(...)", onchange=… */
const handlers = new Set();
for (const m of html.matchAll(/\bon(?:click|change|keydown|input|submit)\s*=\s*"([^"]*)"/g)) {
    for (const appel of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) handlers.add(appel[1]);
}
const handlersManquants = [...handlers]
    .filter((n) => !declarees.has(n) && !GLOBALES_CONNUES.has(n))
    .sort();

verifier('tout gestionnaire inline (onclick, onchange…) est défini',
    handlersManquants.length === 0,
    handlersManquants.length ? 'introuvable(s) : ' + handlersManquants.join(', ') : '');

// ─── 4. Parité du dictionnaire d'internationalisation ──────────────────────

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(RACINE, 'Config.gs'), 'utf8'), ctx);
const dicoFr = vm.runInContext('UI_TRANSLATIONS.fr', ctx);
const dicoEn = vm.runInContext('UI_TRANSLATIONS.en', ctx);

const clesFr = new Set(Object.keys(dicoFr));
const clesEn = new Set(Object.keys(dicoEn));
const ecartLangues = [...clesFr].filter((k) => !clesEn.has(k))
    .concat([...clesEn].filter((k) => !clesFr.has(k)));

verifier('les dictionnaires fr et en ont les mêmes clés', ecartLangues.length === 0,
    ecartLangues.join(', '));

const clesUtilisees = new Set();
for (const m of html.matchAll(/data-i18n(?:-html|-placeholder|-title)?="([A-Za-z0-9_]+)"/g)) {
    clesUtilisees.add(m[1]);
}
for (const m of scriptNu.matchAll(/\bT\(\s*'([A-Za-z0-9_]+)'/g)) clesUtilisees.add(m[1]);

const sansTraduction = [...clesUtilisees].filter((k) => !clesFr.has(k)).sort();
const inutilisees = [...clesFr].filter((k) => !clesUtilisees.has(k)).sort();

verifier('toute clé utilisée est traduite', sansTraduction.length === 0,
    sansTraduction.join(', '));
verifier('aucune clé traduite n\'est orpheline', inutilisees.length === 0,
    inutilisees.join(', '));

// ─── 5. Cohérence des onglets ──────────────────────────────────────────────

const onglets = [...html.matchAll(/data-tab="(\w+)"/g)].map((m) => m[1]);
const contenus = [...html.matchAll(/id="tab-(\w+)"/g)].map((m) => m[1]);
const orphelins = onglets.filter((o) => !contenus.includes(o))
    .concat(contenus.filter((c) => !onglets.includes(c)));

verifier('chaque onglet a son contenu et réciproquement', orphelins.length === 0,
    orphelins.join(', '));

// ─── 6. Équilibre du balisage ──────────────────────────────────────────────

const htmlSansScript = html.replace(/<script[\s\S]*?<\/script>/gi, '');
for (const balise of ['div', 'span', 'select', 'ol', 'ul', 'table', 'button']) {
    const ouverts = (htmlSansScript.match(new RegExp('<' + balise + '[\\s>]', 'g')) || []).length;
    const fermes = (htmlSansScript.match(new RegExp('</' + balise + '>', 'g')) || []).length;
    verifier(`balises <${balise}> équilibrées`, ouverts === fermes,
        `${ouverts} ouvertes, ${fermes} fermées`);
}

console.log(`\n  ${echecs === 0 ? 'Tous les contrôles passent.' : echecs + ' contrôle(s) en échec.'}\n`);
process.exit(echecs > 0 ? 1 : 0);
