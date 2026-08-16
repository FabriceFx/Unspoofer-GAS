#!/usr/bin/env node
/**
 * ============================================================================
 *  UNSPOOFER - tests/remise-a-zero.js
 * ============================================================================
 *  Rôle : Vérifie que « Repartir de zéro » reconstruit des compteurs justes.
 *
 *  Le piège : la déduplication considère qu'un fil déjà étiqueté a déjà été
 *  signalé et ne le recompte pas. Vider le cache et relancer une analyse ne
 *  suffit donc pas — les compteurs resteraient à zéro alors même que les
 *  messages viennent d'être réexaminés. Il faut aussi retirer l'étiquette.
 *
 *  Usage : node tests/remise-a-zero.js
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
 * Construit une boîte de réception simulée : trois messages frauduleux déjà
 * étiquetés, deux légitimes.
 * @returns {{contexte: Object, etiquettes: Set<string>, proprietes: Object}}
 */
function creerBoite() {
    const etiquettes = new Set(['t1', 't2', 't3']);
    const proprietes = {};

    const fil = (id, de, objet) => {
        const message = {
            getId: () => id + '-m', getFrom: () => de, getSubject: () => objet,
            getReplyTo: () => '', getPlainBody: () => '', getBody: () => '',
            getAttachments: () => [], getRawContent: () => 'From: x\r\n\r\n',
            star() {},
        };
        return {
            getId: () => id,
            getMessages: () => [message],
            getLabels: () => (etiquettes.has(id) ? [{ getName: () => 'ALERTE-USURPATION' }] : []),
            addLabel() { etiquettes.add(id); },
        };
    };

    const boite = [
        fil('t1', '"PayPal" <a@paypal-verify-x.tk>', 'Compte limité'),
        fil('t2', '"Crédit Agricole" <b@ca-verif-x.tk>', 'Accès suspendu'),
        fil('t3', '"Netflix" <c@netflix-pay-x.tk>', 'Paiement refusé'),
        fil('t4', '"Marie Dupont" <m@exemple.fr>', 'Réunion de mardi'),
        fil('t5', '"Google" <no-reply@accounts.google.com>', 'Alerte de sécurité'),
    ];

    const etiquette = {
        getName: () => 'ALERTE-USURPATION',
        removeFromThreads: (fils) => fils.forEach((f) => etiquettes.delete(f.getId())),
    };

    const contexte = vm.createContext({
        console,
        Logger: { log: () => {} },
        GmailApp: {
            getUserLabelByName: () => etiquette,
            createLabel: () => etiquette,
            sendEmail() {},
            search: (requete, depart, nombre) => (requete.indexOf('label:') === 0
                ? boite.filter((f) => etiquettes.has(f.getId())).slice(depart, depart + nombre)
                : boite.slice(depart, depart + nombre)),
        },
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
    return { contexte, etiquettes, proprietes };
}

let echecs = 0;
const verifier = (intitule, ok, detail) => {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} | ${intitule}${ok || !detail ? '' : '\n         → ' + detail}`);
    if (!ok) echecs++;
};
const compteur = (proprietes) => (JSON.parse(proprietes.unspooferStats || '{}').totalUsurpations || 0);

console.log('\n═══ Remise à zéro complète ═══\n');

// ─── Ce qui ne suffit pas ──────────────────────────────────────────────────

console.log('Vider le cache sans retirer l\'étiquette');
{
    const { contexte, etiquettes, proprietes } = creerBoite();
    vm.runInContext('reinitialiserStatistiques(); effacerCacheTraite(); analyserBoiteReception();', contexte);
    verifier('les fils restent étiquetés', etiquettes.size === 3, `${etiquettes.size} étiqueté(s)`);
    verifier('mais le compteur reste à zéro — c\'est le piège',
        compteur(proprietes) === 0, 'compteur : ' + compteur(proprietes));
}

// ─── La séquence complète ──────────────────────────────────────────────────

console.log('\nRepartir de zéro');
{
    const { contexte, etiquettes, proprietes } = creerBoite();
    const bilan = vm.runInContext('repartirDeZero()', contexte);

    verifier('les trois fils frauduleux sont désétiquetés puis réétiquetés',
        etiquettes.size === 3, `${etiquettes.size} étiqueté(s)`);
    verifier('les messages légitimes ne reçoivent pas l\'étiquette',
        !etiquettes.has('t4') && !etiquettes.has('t5'));
    verifier('le compteur est reconstruit', compteur(proprietes) === 3,
        'compteur : ' + compteur(proprietes));
    verifier('le bilan indique les fils désétiquetés',
        bilan && bilan.filsDesetiquetes === 3, JSON.stringify(bilan));
}

// ─── Sur une boîte sans alerte ─────────────────────────────────────────────

console.log('\nCas limite : aucune étiquette au départ');
{
    const { contexte, etiquettes, proprietes } = creerBoite();
    etiquettes.clear();
    const bilan = vm.runInContext('repartirDeZero()', contexte);
    verifier('aucun fil à désétiqueter, sans erreur', bilan.filsDesetiquetes === 0);
    verifier('les fraudes sont malgré tout détectées et comptées',
        compteur(proprietes) === 3, 'compteur : ' + compteur(proprietes));
}

console.log(`\n  ${echecs === 0 ? 'Tous les contrôles passent.' : echecs + ' contrôle(s) en échec.'}\n`);
process.exit(echecs > 0 ? 1 : 0);
