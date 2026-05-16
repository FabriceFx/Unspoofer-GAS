/**
 * Logique de détection d'usurpation : analyse de l'expéditeur, normalisation, comparaison de domaines.
 */

const CLE_PROPRIETE_LISTE_BLANCHE = 'senderWhitelist';

/**
 * Domaines de plateformes couramment utilisés pour envoyer des emails de phishing.
 * Les emails provenant de sous-domaines de ceux-ci sont signalés comme suspects.
 */
const PLATEFORMES_SUSPECTES = [
    'firebaseapp.com',
    'appspot.com',
];

/**
 * Sélecteurs DKIM utilisés par des plateformes suspectes.
 * Permet de détecter les emails avec domaine personnalisé envoyés via ces plateformes (ex: Firebase avec un
 * domaine enregistré au lieu de *.firebaseapp.com).
 */
const SELECTEURS_DKIM_SUSPECTS = [
    { plateforme: 'firebase', motif: /(?:header\.s|\bs)=firebase1\b/ },
];

/**
 * Vérifie si un domaine d'expéditeur est un sous-domaine d'une plateforme suspecte connue.
 * @param {string} domaineEmail - ex : "kriyiasahbi.firebaseapp.com"
 * @returns {string|null} La plateforme correspondante ou null
 */
function estUnePlateformeSuspecte(domaineEmail) {
    if (!domaineEmail) return null;
    const domaine = domaineEmail.toLowerCase();
    for (const plateforme of PLATEFORMES_SUSPECTES) {
        if (domaine === plateforme || domaine.endsWith('.' + plateforme)) {
            return plateforme;
        }
    }
    return null;
}

/**
 * Vérifie les en-têtes bruts du message pour les sélecteurs DKIM associés aux plateformes suspectes.
 * Cela permet de détecter les emails envoyés via des plateformes comme Firebase en utilisant un domaine personnalisé
 * (ex : noreply@qgui777com.com avec le sélecteur DKIM "firebase1").
 * @param {GmailMessage} message
 * @returns {string|null} Le nom de la plateforme correspondante ou null
 */
function verifierSelecteurDkimSuspect(message) {
    try {
        const brut = message.getRawContent();
        // Analyser uniquement les en-têtes (tout ce qui précède la première ligne vide).
        // Gérer à la fois \r\n\r\n (RFC 2822) et \n\n (normalisation Gmail).
        let finEnTete = brut.indexOf('\r\n\r\n');
        if (finEnTete <= 0) finEnTete = brut.indexOf('\n\n');
        if (finEnTete <= 0) return null;
        const enTetes = brut.substring(0, finEnTete);

        for (const entree of SELECTEURS_DKIM_SUSPECTS) {
            if (entree.motif.test(enTetes)) {
                return entree.plateforme;
            }
        }
        return null;
    } catch (e) {
        Logger.log('La vérification du sélecteur DKIM a échoué : ' + e.message);
        return null;
    }
}

/** @type {string[]|null} */
let _cacheListeBlanche = null;

/** @type {string|null} */
let _cacheDomaineProprietaire = null;

/**
 * Retourne le domaine racine du propriétaire de la boîte de réception (mis en cache par exécution).
 * Utilisé pour reconnaître les notifications légitimes concernant le propre domaine du destinataire
 * (ex : emails de services de formulaires comme Netlify Forms qui mettent le domaine du client
 * dans le nom d'affichage).
 * @returns {string}
 */
function getDomaineProprietaire_() {
    if (_cacheDomaineProprietaire !== null) return _cacheDomaineProprietaire;
    try {
        const email = (Session.getEffectiveUser().getEmail() ||
            Session.getActiveUser().getEmail() || '').toLowerCase();
        const domaine = email.split('@')[1] || '';
        _cacheDomaineProprietaire = domaine ? extraireDomaineRacine(domaine) : '';
    } catch (e) {
        _cacheDomaineProprietaire = '';
    }
    return _cacheDomaineProprietaire;
}

/**
 * Retourne la liste blanche des expéditeurs depuis les propriétés du script (mise en cache par exécution).
 * @returns {string[]}
 */
function getListeBlanche_() {
    if (_cacheListeBlanche !== null) return _cacheListeBlanche;
    try {
        const brut = PropertiesService.getScriptProperties().getProperty(CLE_PROPRIETE_LISTE_BLANCHE);
        _cacheListeBlanche = brut ? JSON.parse(brut) : [];
    } catch (e) {
        _cacheListeBlanche = [];
    }
    return _cacheListeBlanche;
}

/**
 * Vérifie si un email d'expéditeur est en liste blanche par adresse, domaine complet ou domaine racine.
 * @param {string} email
 * @returns {boolean}
 */
function estExpediteurEnListeBlanche(email) {
    if (!email) return false;
    const listeBlanche = getListeBlanche_();
    if (listeBlanche.length === 0) return false;

    const domaine = email.split('@')[1];
    if (!domaine) return false;
    const racine = extraireDomaineRacine(domaine);

    for (const entree of listeBlanche) {
        if (entree === email || entree === domaine || entree === racine) return true;
    }
    return false;
}

/**
 * Analyse une chaîne d'en-tête "De" pour extraire le nom d'affichage et l'email.
 * Gère les formats :
 *   "Nom d'affichage" <email@domaine.com>
 *   Nom d'affichage <email@domaine.com>
 *   email@domaine.com
 * @param {string} chaineDe
 * @returns {{nomAffichage: string, email: string}}
 */
function analyserExpediteur(chaineDe) {
    if (!chaineDe) return { nomAffichage: '', email: '' };

    // Tenter "Nom" <email> ou Nom <email>
    const correspondance = chaineDe.match(/^"?(.+?)"?\s*<([^>]+)>$/);
    if (correspondance) {
        return { nomAffichage: correspondance[1].trim(), email: correspondance[2].trim().toLowerCase() };
    }

    // Adresse email seule
    const emailSeul = chaineDe.trim().toLowerCase();
    return { nomAffichage: '', email: emailSeul };
}

/**
 * Extrait le domaine racine d'une chaîne de domaine complète.
 * Gère les TLD composés comme .co.il, .co.uk, .com.au, .org.il.
 * @param {string} domaine - ex : "mail.wix.com" ou "info.leumi.co.il"
 * @returns {string} - ex : "wix.com" ou "leumi.co.il"
 */
function extraireDomaineRacine(domaine) {
    if (!domaine) return '';
    const parties = domaine.toLowerCase().split('.');
    if (parties.length <= 2) return domaine.toLowerCase();

    // TLD composés : si l'avant-dernier segment fait 2 caractères ou moins (co, ac, or, ne, etc.)
    const avantDernier = parties[parties.length - 2];
    if (avantDernier.length <= 2) {
        // Prendre les 3 derniers segments (ex : leumi.co.il)
        return parties.slice(-3).join('.');
    }

    // TLD standard : prendre les 2 derniers segments (ex : wix.com)
    return parties.slice(-2).join('.');
}

/**
 * Tente d'extraire un motif ressemblant à un domaine d'un nom d'affichage après normalisation des homoglyphes.
 * Cherche des motifs comme "mot.tld" dans le texte normalisé.
 * @param {string} nomAffichage - Nom d'affichage brut (peut contenir des homoglyphes)
 * @returns {string|null} - Domaine extrait ou null
 */
function extraireDomaineDuNomAffichage(nomAffichage) {
    if (!nomAffichage) return null;

    const normalise = normaliserEnAscii(nomAffichage);

    // Correspondance avec des motifs de type domaine : mot.mot ou mot.mot.mot
    const motifDomaine = /([a-z0-9][-a-z0-9]*\.)+[a-z]{2,}/g;
    const correspondance = normalise.match(motifDomaine);

    return correspondance ? correspondance[0] : null;
}

/**
 * Vérification principale d'usurpation pour un seul message Gmail.
 * @param {GmailMessage} message
 * @returns {{estUsurpation: boolean, raison: string, marque: string, details: string}}
 */
function verifierUsurpation(message) {
    const de = message.getFrom();
    const resultat = { estUsurpation: false, raison: '', marque: '', details: '' };

    // 1. Analyser l'expéditeur
    const expediteur = analyserExpediteur(de);
    if (!expediteur.email) return resultat;

    // 2. Vérifier la liste blanche des expéditeurs
    if (estExpediteurEnListeBlanche(expediteur.email)) return resultat;

    // 3. Vérifier si l'expéditeur provient d'une plateforme suspecte (ex : firebaseapp.com)
    const domaineExpediteur = expediteur.email.split('@')[1];
    const plateformeSuspecte = estUnePlateformeSuspecte(domaineExpediteur);
    if (plateformeSuspecte) {
        resultat.estUsurpation = true;
        resultat.marque = plateformeSuspecte;
        resultat.raison = 'Envoyé depuis une plateforme suspecte : ' + plateformeSuspecte;
        resultat.details = 'De : ' + de + ' | Domaine plateforme : ' + domaineExpediteur;
        return resultat;
    }

    // 3b. Vérifier le sélecteur DKIM pour les plateformes suspectes utilisant des domaines personnalisés
    //     (ex : Firebase avec le sélecteur "firebase1" sur un domaine aléatoire)
    const plateformeDkim = verifierSelecteurDkimSuspect(message);
    if (plateformeDkim) {
        resultat.estUsurpation = true;
        resultat.marque = plateformeDkim;
        resultat.raison = 'Envoyé via une plateforme suspecte : ' + plateformeDkim + ' (domaine personnalisé)';
        resultat.details = 'De : ' + de + ' | Domaine expéditeur : ' + domaineExpediteur;
        return resultat;
    }

    // 4. Normaliser le nom d'affichage et chercher une correspondance de marque
    const nomNormalise = expediteur.nomAffichage ? normaliserEnAscii(expediteur.nomAffichage) : '';
    let correspondanceMarque = trouverMarqueUsurpee(nomNormalise);

    // 4b. Vérifier également la partie locale de l'email pour l'usurpation de marque
    //     (ex : domains.notifications.wix.renew@investireinlettonia.it)
    if (!correspondanceMarque) {
        const partieLocale = expediteur.email.split('@')[0].replace(/[._+-]/g, ' ');
        correspondanceMarque = trouverMarqueUsurpee(partieLocale);
    }
    // 5. Extraire le domaine racine de l'expéditeur (nécessaire pour les vérifications de marque et génériques)
    if (!domaineExpediteur) return resultat;
    const racineActuelle = extraireDomaineRacine(domaineExpediteur);

    // 5b. Vérification générique : le nom d'affichage contient un domaine qui ne correspond pas à l'expéditeur.
    //     Détecte les usurpations pour les marques NON présentes dans la liste des marques (ex : "Support - nouvellemarque.com"
    //     envoyé depuis domaine-non-lie.de).
    if (!correspondanceMarque) {
        const domaineImplicite = extraireDomaineDuNomAffichage(expediteur.nomAffichage);
        if (domaineImplicite) {
            const racineImplicite = extraireDomaineRacine(domaineImplicite);
            // Ignorer lorsque le domaine implicite est le propre domaine du propriétaire de la boîte. Les notifications
            // de services de formulaires (Netlify Forms, Formspree, etc.) mettent légitimement le domaine du
            // destinataire dans le nom d'affichage ; le phishing usurpe d'autres marques,
            // pas votre propre domaine envers vous-même.
            const domaineProprietaire = getDomaineProprietaire_();
            if (domaineProprietaire && racineImplicite === domaineProprietaire) return resultat;
            if (racineImplicite !== racineActuelle && !estUnDomaineMarqueLie(racineImplicite, racineActuelle)) {
                resultat.estUsurpation = true;
                resultat.marque = racineImplicite.split('.')[0];
                resultat.raison = 'Le nom d\'affichage contient le domaine ' + domaineImplicite +
                    ' mais l\'email provient de ' + racineActuelle;
                resultat.details = 'De : ' + de + ' | Domaine affiché : ' + domaineImplicite +
                    ' | Domaine réel : ' + racineActuelle;
            }
        }
        return resultat;
    }

    // 6. Vérifier si le domaine réel de l'expéditeur correspond au domaine de la marque
    const racineMarque = extraireDomaineRacine(correspondanceMarque.domaine);
    if (racineActuelle === racineMarque) return resultat; // Légitime — le domaine réel correspond à la marque

    // 7. Vérifier si l'expéditeur est un domaine lié connu pour cette marque (ex : YouTube ↔ Google)
    if (estUnDomaineMarqueLie(racineMarque, racineActuelle)) return resultat;

    // 8. Extraire également le domaine du nom d'affichage s'il est présent, et comparer
    const domaineImplicite = extraireDomaineDuNomAffichage(expediteur.nomAffichage);
    if (domaineImplicite) {
        const racineImplicite = extraireDomaineRacine(domaineImplicite);
        if (racineImplicite === racineActuelle) return resultat; // Le domaine affiché correspond au domaine de l'expéditeur — OK
    }

    // 9. Usurpation détectée
    resultat.estUsurpation = true;
    resultat.marque = correspondanceMarque.nomMarque;
    resultat.raison = 'Le nom d\'affichage usurpe ' + correspondanceMarque.domaine +
        ' mais l\'email provient de ' + racineActuelle;
    resultat.details = 'De : ' + de + ' | Normalisé : ' + nomNormalise +
        ' | Domaine réel : ' + racineActuelle;

    return resultat;
}
