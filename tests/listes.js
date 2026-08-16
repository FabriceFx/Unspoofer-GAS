#!/usr/bin/env node
/**
 * ============================================================================
 *  UNSPOOFER - tests/listes.js
 * ============================================================================
 *  Rôle : Vérifie que les listes de référence sont bien modifiables à chaud —
 *         qu'un ajout ou un retrait depuis le tableau de bord change
 *         effectivement le comportement du moteur, sans redéploiement.
 *
 *  Usage : node tests/listes.js
 * ============================================================================
 */

'use strict';

const { analyser, executer } = require('./harness.js');

let reussites = 0;
let echecs = 0;

/**
 * @param {string} intitule
 * @param {boolean} condition
 * @param {string} [detail]
 */
function verifier(intitule, condition, detail) {
    if (condition) {
        reussites++;
        console.log(`  ok    | ${intitule}`);
    } else {
        echecs++;
        console.log(`  ECHEC | ${intitule}${detail ? '  → ' + detail : ''}`);
    }
}

/** Message type : plateforme d'emailing avec adresse de réponse divergente. */
const MESSAGE_PLATEFORME = {
    de: '"Lettre du club" <campagne@plateforme-maison-exemple.com>',
    replyTo: 'secretariat@club-exemple.fr',
    objet: 'Notre lettre mensuelle',
};

/** Message type : entreprise homonyme d'une marque surveillée. */
const MESSAGE_HOMONYME = {
    de: '"Boulanger Patisserie" <contact@boulanger-patisserie-exemple.fr>',
    objet: 'Votre commande de pain',
};

console.log('\n═══ Listes modifiables à chaud ═══\n');

// ─── Plateformes d'envoi tierces ───────────────────────────────────────────

console.log('Plateformes d\'envoi tierces');
{
    const stockage = {};

    const avant = analyser(MESSAGE_PLATEFORME, { stockage }).resultat;
    verifier('plateforme inconnue → Reply-To divergent signalé',
        avant.estUsurpation, 'aucune alerte alors qu\'une alerte était attendue');

    const ajout = executer(
        "ajouterEntreeListe('plateformesTierces', 'plateforme-maison-exemple.com')",
        { stockage });
    verifier('ajout accepté par le point d\'accès', ajout.ok === true, ajout.message);

    const apres = analyser(MESSAGE_PLATEFORME, { stockage }).resultat;
    verifier('après ajout → plus d\'alerte, sans redéploiement',
        !apres.estUsurpation, 'alerte persistante : ' + apres.raison);

    executer("retirerEntreeListe('plateformesTierces', 'plateforme-maison-exemple.com')",
        { stockage });
    const retire = analyser(MESSAGE_PLATEFORME, { stockage }).resultat;
    verifier('après retrait → l\'alerte revient', retire.estUsurpation);
}

// ─── Neutralisation d'une valeur livrée par défaut ─────────────────────────

console.log('\nNeutralisation d\'un défaut');
{
    const stockage = {};
    const MESSAGE_BREVO = {
        de: '"Infolettre" <campagne@brevo.com>',
        replyTo: 'contact@asso-exemple.fr',
        objet: 'Nouvelles du mois',
    };

    const avant = analyser(MESSAGE_BREVO, { stockage }).resultat;
    verifier('brevo.com livré par défaut → pas d\'alerte', !avant.estUsurpation);

    executer("retirerEntreeListe('plateformesTierces', 'brevo.com')", { stockage });
    const apres = analyser(MESSAGE_BREVO, { stockage }).resultat;
    verifier('retrait explicite d\'un défaut → alerte rétablie', apres.estUsurpation);

    const liste = executer("getListeModifiable('plateformesTierces')", { stockage });
    const entree = liste.entrees.find((e) => e.valeur === 'brevo.com');
    verifier('le défaut neutralisé reste visible dans l\'interface',
        entree && entree.origine === 'defaut_desactive',
        entree ? 'origine=' + entree.origine : 'entrée absente');

    executer("reinitialiserListe('plateformesTierces')", { stockage });
    const restaure = analyser(MESSAGE_BREVO, { stockage }).resultat;
    verifier('réinitialisation → retour au comportement livré', !restaure.estUsurpation);
}

// ─── Libellés de marque ambigus ────────────────────────────────────────────

console.log('\nLibellés de marque ambigus');
{
    const stockage = {};

    const avant = analyser(MESSAGE_HOMONYME, { stockage }).resultat;
    verifier('« boulanger » ambigu par défaut → pas de fausse alerte',
        !avant.estUsurpation, avant.raison);

    executer("retirerEntreeListe('marquesAmbigues', 'boulanger')", { stockage });
    const apres = analyser(MESSAGE_HOMONYME, { stockage }).resultat;
    verifier('retiré des ambigus → la marque redevient signalable',
        apres.estUsurpation, 'aucune alerte après retrait de l\'ambiguïté');

    executer("ajouterEntreeListe('marquesAmbigues', 'boulanger')", { stockage });
    const restaure = analyser(MESSAGE_HOMONYME, { stockage }).resultat;
    verifier('réajouté → la fausse alerte disparaît de nouveau',
        !restaure.estUsurpation);
}

// ─── Validation des saisies ────────────────────────────────────────────────

console.log('\nValidation des saisies');
{
    const stockage = {};

    const vide = executer("ajouterEntreeListe('plateformesTierces', '   ')", { stockage });
    verifier('valeur vide refusée', vide.ok === false, vide.message);

    const malforme = executer("ajouterEntreeListe('plateformesTierces', 'pas un domaine')",
        { stockage });
    verifier('domaine malformé refusé', malforme.ok === false, malforme.message);

    const arobase = executer("ajouterEntreeListe('plateformesTierces', '@Exemple.COM ')",
        { stockage });
    verifier('normalisation (casse, espaces, arobase)',
        arobase.ok === true &&
        arobase.liste.entrees.some((e) => e.valeur === 'exemple.com'),
        arobase.message);

    const inconnue = executer("ajouterEntreeListe('listeQuiNexistePas', 'x.fr')", { stockage });
    verifier('liste inconnue rejetée proprement', inconnue.ok === false, inconnue.message);

    const corrompu = analyser(MESSAGE_PLATEFORME, {
        stockage: { liste_plateformesTierces: '{ceci n\'est pas du JSON' },
    }).resultat;
    verifier('stockage corrompu → repli sur les défauts sans planter',
        corrompu !== undefined);
}

// ─── Exposition au tableau de bord ─────────────────────────────────────────

console.log('\nExposition au tableau de bord');
{
    const stockage = {};
    const listes = executer('getListesModifiables()', { stockage });

    verifier('getListesModifiables() retourne les deux listes',
        Array.isArray(listes) && listes.length === 2,
        'reçu : ' + JSON.stringify(listes && listes.map((l) => l.nom)));

    verifier('chaque liste porte libellé, description et exemple',
        listes.every((l) => l.libelle && l.description && l.exemple));

    verifier('chaque entrée indique son origine',
        listes.every((l) => l.entrees.every((e) => ['defaut', 'ajout', 'defaut_desactive']
            .includes(e.origine))));

    const plateformes = listes.find((l) => l.nom === 'plateformesTierces');
    verifier('sendgrid.net désormais reconnu comme plateforme d\'envoi',
        plateformes.entrees.some((e) => e.valeur === 'sendgrid.net'));
}

console.log(`\n  ${reussites}/${reussites + echecs} vérifications réussies\n`);
process.exit(echecs > 0 ? 1 : 0);
