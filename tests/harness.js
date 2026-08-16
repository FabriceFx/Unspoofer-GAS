/**
 * ============================================================================
 *  UNSPOOFER - tests/harness.js
 * ============================================================================
 *  Rôle : Exécute le moteur de détection réel (fichiers .gs du dépôt) hors de
 *         Google Apps Script, en bouchonnant les services Google utilisés.
 *
 *  Principe : aucun code de production n'est dupliqué ici. Les .gs sont chargés
 *  tels quels dans un contexte VM neuf pour CHAQUE cas de test, afin de
 *  reproduire l'isolation d'une exécution Apps Script (compteurs de quota et
 *  caches de module remis à zéro entre deux messages).
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.resolve(__dirname, '..');

/** Fichiers du moteur, dans l'ordre de dépendance. */
const FICHIERS_MOTEUR = [
    'Config.gs',
    'Utils.gs',
    'Homoglyphes.gs',
    'Marque.gs',
    'DetecteurUsurpation.gs',
];

/** Source concaténée, lue une seule fois. */
const SOURCE = FICHIERS_MOTEUR
    .map((f) => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(RACINE, f), 'utf8'))
    .join('\n');

// ─── Faux message Gmail ────────────────────────────────────────────────────

/**
 * Reproduit la surface de GmailMessage utilisée par verifierUsurpation().
 */
class FauxMessage {
    /**
     * @param {object} cas - Cas de test issu du corpus.
     */
    constructor(cas) {
        this.cas = cas;
        /** Compte les appels coûteux, pour vérifier la sobriété du moteur. */
        this.appels = { getRawContent: 0, getPlainBody: 0, getBody: 0, getAttachments: 0 };
    }

    getFrom() {
        return this.cas.de || '';
    }

    getReplyTo() {
        return this.cas.replyTo || '';
    }

    getSubject() {
        return this.cas.objet || '';
    }

    getPlainBody() {
        this.appels.getPlainBody++;
        return this.cas.corpsTexte || '';
    }

    getBody() {
        this.appels.getBody++;
        return this.cas.corpsHtml || this.cas.corpsTexte || '';
    }

    getAttachments() {
        this.appels.getAttachments++;
        return (this.cas.piecesJointes || []).map((nom) => ({ getName: () => nom }));
    }

    getRawContent() {
        this.appels.getRawContent++;
        const enTetes = this.cas.enTetes || `From: ${this.cas.de || ''}`;
        return enTetes + '\r\n\r\n' + (this.cas.corpsTexte || '');
    }
}

// ─── Bouchons des services Google ──────────────────────────────────────────

/**
 * Construit les bouchons Apps Script pour un cas donné.
 * @param {object} cas
 * @param {object} options - { proprietaire, listeBlanche, marquesPersos }
 * @returns {object} Globales à injecter dans le contexte VM.
 */
function construireBouchons(cas, options) {
    const proprietaire = options.proprietaire || 'utilisateur@exemple.fr';

    const proprietes = {};
    if (options.listeBlanche && options.listeBlanche.length) {
        proprietes.senderWhitelist = JSON.stringify(options.listeBlanche);
    }
    if (options.marquesPersos && options.marquesPersos.length) {
        proprietes.customBrands = JSON.stringify(options.marquesPersos);
    }

    const journal = [];

    return {
        journal,
        globales: {
            console,
            Logger: {
                log: (m) => journal.push(String(m)),
            },
            Session: {
                getEffectiveUser: () => ({ getEmail: () => proprietaire }),
                getActiveUser: () => ({ getEmail: () => proprietaire }),
                getActiveUserLocale: () => 'fr',
            },
            PropertiesService: {
                getScriptProperties: () => ({
                    getProperty: (c) => (c in proprietes ? proprietes[c] : null),
                    setProperty: (c, v) => {
                        proprietes[c] = v;
                    },
                    deleteProperty: (c) => {
                        delete proprietes[c];
                    },
                }),
            },
        },
    };
}

// ─── Exécution d'un cas ────────────────────────────────────────────────────

/**
 * Analyse un cas de test avec le moteur réel, dans un contexte neuf.
 * @param {object} cas - Cas du corpus.
 * @param {object} [options] - { proprietaire, listeBlanche, marquesPersos }
 * @returns {{resultat: object, appels: object, journal: string[]}}
 */
function analyser(cas, options = {}) {
    const bouchons = construireBouchons(cas, options);
    const contexte = vm.createContext(bouchons.globales);

    vm.runInContext(SOURCE, contexte, { filename: 'unspoofer-moteur.js' });

    const message = new FauxMessage(cas);
    contexte.__message = message;

    const resultat = vm.runInContext('verifierUsurpation(__message)', contexte, {
        filename: 'unspoofer-appel.js',
    });

    return { resultat, appels: message.appels, journal: bouchons.journal };
}

// ─── Identification du motif de détection ──────────────────────────────────

/**
 * Clés de motifs du dictionnaire, dans Config.gs.
 * Sert à retrouver QUEL contrôle a déclenché, à partir de la raison localisée.
 */
const CLES_MOTIFS = [
    'reasonPlatform',
    'reasonReplyTo',
    'reasonImpersonation',
    'reasonGenericDomain',
    'reasonTyposquatting',
    'reasonBodyLink',
    'reasonHtmlLinkMismatch',
    'reasonAttachment',
    'reasonDkim',
    'reasonAuthFail',
];

/** Motifs compilés, construits à la demande depuis EMAIL_TRANSLATIONS. */
let _motifsCompiles = null;

/**
 * Compile les gabarits de raison en expressions régulières.
 * Permet de nommer le contrôle déclencheur sans modifier le code de production.
 * @returns {Array<{cle: string, regex: RegExp}>}
 */
function getMotifsCompiles_() {
    if (_motifsCompiles) return _motifsCompiles;

    const contexte = vm.createContext({ console, Logger: { log: () => {} } });
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'Config.gs'), 'utf8'), contexte);
    const dict = vm.runInContext('EMAIL_TRANSLATIONS.fr', contexte);

    _motifsCompiles = CLES_MOTIFS.map((cle) => {
        const gabarit = dict[cle] || '';
        const echappe = gabarit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const avecJokers = echappe.replace(/\\\{param\d?\\\}/g, '[\\s\\S]*?');
        return { cle, regex: new RegExp('^' + avecJokers + '$') };
    });
    return _motifsCompiles;
}

/**
 * Retrouve la clé du contrôle ayant produit une raison de détection.
 * @param {string} raison
 * @returns {string} Clé du motif, ou '' si aucune détection, ou '?' si inconnue.
 */
function identifierMotif(raison) {
    if (!raison) return '';
    for (const m of getMotifsCompiles_()) {
        if (m.regex.test(raison)) return m.cle;
    }
    return '?';
}

module.exports = { analyser, identifierMotif, FICHIERS_MOTEUR, CLES_MOTIFS };
