#!/usr/bin/env node
/**
 * ============================================================================
 *  UNSPOOFER - tests/stockage.js
 * ============================================================================
 *  Rôle : Vérifie que les listes saisies par l'utilisateur (liste blanche,
 *         marques personnalisées) refusent proprement une écriture qui
 *         dépasserait la limite de stockage d'Apps Script.
 *
 *  Motivation : une valeur de propriété de script est plafonnée à 9 Ko. Au-delà,
 *  l'écriture lève une exception que le code appelant avalait dans un `catch` :
 *  l'ajout échouait, l'interface affichait un succès, et l'entrée disparaissait
 *  au rechargement suivant.
 *
 *  Usage : node tests/stockage.js
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.resolve(__dirname, '..');

const FICHIERS = [
    'Config.gs', 'Utils.gs', 'Listes.gs', 'Homoglyphes.gs', 'Marque.gs',
    'DetecteurUsurpation.gs', 'Cache.gs', 'Principal.gs', 'Serveur.gs',
];

/**
 * Crée un contexte moteur neuf, avec un magasin de propriétés en mémoire.
 * @returns {{contexte: Object, proprietes: Object}}
 */
function creerContexte() {
    const proprietes = {};
    const contexte = vm.createContext({
        console,
        Logger: { log: () => {} },
        GmailApp: { getUserLabelByName: () => null, createLabel: () => ({}), search: () => [] },
        ScriptApp: { getProjectTriggers: () => [] },
        CacheService: { getScriptCache: () => ({ put() {}, get: () => null }) },
        PropertiesService: {
            getScriptProperties: () => ({
                getProperty: (c) => (c in proprietes ? proprietes[c] : null),
                setProperty: (c, v) => { proprietes[c] = v; },
                deleteProperty: (c) => { delete proprietes[c]; },
            }),
        },
        Session: {
            getEffectiveUser: () => ({ getEmail: () => 'utilisateur@exemple.fr' }),
            getActiveUser: () => ({ getEmail: () => 'utilisateur@exemple.fr' }),
            getActiveUserLocale: () => 'fr',
        },
    });
    vm.runInContext(FICHIERS.map((f) => fs.readFileSync(path.join(RACINE, f), 'utf8')).join('\n'), contexte);
    return { contexte, proprietes };
}

let echecs = 0;
const verifier = (intitule, ok, detail) => {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} | ${intitule}${ok || !detail ? '' : '\n         → ' + detail}`);
    if (!ok) echecs++;
};

console.log('\n═══ Plafond de stockage des listes utilisateur ═══\n');

// ─── Comptage d'octets ─────────────────────────────────────────────────────

{
    const { contexte } = creerContexte();
    const mesurer = (s) => { contexte.__s = s; return vm.runInContext('tailleOctets_(__s)', contexte); };
    verifier('ASCII : un caractère, un octet', mesurer('abc') === 3);
    verifier('accent : deux octets', mesurer('é') === 2, 'obtenu ' + mesurer('é'));
    verifier('emoji : quatre octets', mesurer('🛡') === 4, 'obtenu ' + mesurer('🛡'));
}

// ─── Liste blanche ─────────────────────────────────────────────────────────

console.log('\nListe blanche');
{
    const { contexte, proprietes } = creerContexte();
    let acceptees = 0;
    let refus = null;

    while (acceptees < 2000) {
        contexte.__d = 'expediteur-numero-' + String(acceptees).padStart(4, '0') + '-exemple.fr';
        const rep = vm.runInContext('addWhitelistEntry(__d)', contexte);
        // Le cache par exécution est vidé : en production, chaque appel
        // relit la propriété depuis le stockage.
        vm.runInContext('_cacheListeBlanche = null', contexte);
        if (!rep.ok) { refus = rep; break; }
        acceptees++;
    }

    verifier('l\'ajout finit par être refusé, sans exception', refus !== null);
    verifier('le refus porte le motif « plafond »', refus && refus.motif === 'plafond',
        refus ? 'motif : ' + refus.motif : '');

    contexte.__stocke = proprietes.senderWhitelist || '';
    const taille = vm.runInContext('tailleOctets_(__stocke)', contexte);
    const limite = vm.runInContext('MAX_OCTETS_PROPRIETE', contexte);
    verifier('le contenu stocké reste sous le plafond', taille <= limite,
        `${taille} octets pour un plafond de ${limite}`);

    const stockee = JSON.parse(proprietes.senderWhitelist);
    verifier('aucune divergence entre le stockage et le nombre d\'ajouts acceptés',
        stockee.length === acceptees, `${stockee.length} stockées, ${acceptees} acceptées`);

    contexte.__x = 'expediteur-numero-0000-exemple.fr';
    verifier('un doublon est signalé comme tel',
        vm.runInContext('addWhitelistEntry(__x).motif', contexte) === 'doublon');
    verifier('une saisie vide est refusée',
        vm.runInContext("addWhitelistEntry('').motif", contexte) === 'vide');

    console.log(`         (${acceptees} entrées acceptées avant le refus)`);
}

// ─── Marques personnalisées ────────────────────────────────────────────────

console.log('\nMarques personnalisées');
{
    const { contexte, proprietes } = creerContexte();
    let acceptees = 0;
    let refus = null;

    while (acceptees < 2000) {
        const n = String(acceptees).padStart(4, '0');
        contexte.__n = 'Entreprise ' + n;
        contexte.__d = 'entreprise-numero-' + n + '-exemple.fr';
        const rep = vm.runInContext('addCustomBrand(__n, __d)', contexte);
        if (!rep.ok) { refus = rep; break; }
        acceptees++;
    }

    verifier('l\'ajout finit par être refusé, sans exception', refus !== null);
    verifier('le refus porte le motif « plafond »', refus && refus.motif === 'plafond',
        refus ? 'motif : ' + refus.motif : '');

    contexte.__stocke = proprietes.customBrands || '';
    const taille = vm.runInContext('tailleOctets_(__stocke)', contexte);
    const limite = vm.runInContext('MAX_OCTETS_PROPRIETE', contexte);
    verifier('le contenu stocké reste sous le plafond', taille <= limite,
        `${taille} octets pour un plafond de ${limite}`);

    verifier('aucune divergence entre le stockage et le nombre d\'ajouts acceptés',
        JSON.parse(proprietes.customBrands).length === acceptees);

    console.log(`         (${acceptees} marques acceptées avant le refus)`);
}

console.log(`\n  ${echecs === 0 ? 'Tous les contrôles passent.' : echecs + ' contrôle(s) en échec.'}\n`);
process.exit(echecs > 0 ? 1 : 0);
