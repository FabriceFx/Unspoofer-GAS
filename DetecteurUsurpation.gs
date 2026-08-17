/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - DetecteurUsurpation.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : Détecteur Phishing
 *  Rôle        : Moteur principal d'analyse heuristique des e-mails suspects et de détection de phishing.
 *  Version     : 2.5.0
 * ============================================================================
 */

/**
 * Logique de détection d'usurpation : analyse de l'expéditeur, normalisation, comparaison de domaines.
 * Inclut la vérification SPF/DMARC, les niveaux de sévérité et le chargement paresseux des en-têtes.
 */

const CLE_PROPRIETE_LISTE_BLANCHE = 'senderWhitelist';

/**
 * Domaines de plateformes couramment utilisés pour envoyer des emails de phishing.
 */
const PLATEFORMES_SUSPECTES = [
    'firebaseapp.com',
    'appspot.com',
];

/**
 * Domaines transactionnels ou marketing légitimes qui utilisent couramment un Reply-To divergent.
 *
 * Valeurs par défaut : la liste effective est obtenue via
 * getPlateformesTierces_(), qui y applique les ajouts et retraits de
 * l'utilisateur (voir Listes.gs). Une plateforme d'emailing peut ainsi être
 * déclarée depuis le tableau de bord, sans redéploiement.
 */
const PLATEFORMES_ENVOI_TIERS_DEFAUT = new Set([
    // Billetterie et événementiel
    'weezevent.com', 'eventbrite.com', 'eventbrite.fr', 'billetweb.fr',
    'helloasso.com',
    // Emailing et marketing
    'mailchimp.com', 'sendinblue.com', 'brevo.com', 'mailjet.com',
    'sendgrid.net', 'sendgrid.com', 'mailgun.org', 'postmarkapp.com',
    'amazonses.com', 'sparkpostmail.com', 'mandrillapp.com',
    'klaviyo.com', 'activecampaign.com', 'getresponse.com',
    'constantcontact.com', 'mailerlite.com',
    // Publication et lettres d'information
    'substack.com', 'beehiiv.com',
    // Commerce et paiement
    'stripe.com', 'shopify.com', 'wix.com', 'squarespace.com',
    // Relation client et productivité
    'hubspot.com', 'salesforce.com', 'intercom.com', 'zendesk.com',
    'typeform.com', 'calendly.com', 'docusign.net', 'yousign.com',
    // Notificateurs de partage de documents : le message part du domaine de la
    // plateforme, mais l'adresse de réponse est celle de la personne qui
    // partage. Divergence par conception, sans rapport avec une usurpation.
    // Ces domaines sont hors de portée d'un attaquant : leur courrier est
    // authentifié par l'infrastructure de l'éditeur, pas par un compte client.
    'google.com', 'googlemail.com', 'dropbox.com', 'dropboxmail.com',
    'sharepoint.com', 'box.com',
]);

/**
 * Liste effective des plateformes d'envoi tierces, modifications utilisateur
 * comprises.
 * @returns {Set<string>}
 */
function getPlateformesTierces_() {
    return getListeEffective_('plateformesTierces');
}

/**
 * Sélecteurs DKIM utilisés par des plateformes suspectes.
 */
const SELECTEURS_DKIM_SUSPECTS = [
    { plateforme: 'firebase', motif: /(?:header\.s|\bs)=firebase1\b/ },
];

/**
 * Motifs d'échec d'authentification dans l'en-tête Authentication-Results.
 */
const MOTIFS_AUTH_ECHEC = [
    { type: 'spf', motif: /\bspf=fail\b/i },
    { type: 'dmarc', motif: /\bdmarc=fail\b/i },
    { type: 'dkim', motif: /\bdkim=fail\b/i },
];

/**
 * Compteur de quota pour getRawContent et getPlainBody afin d'éviter les erreurs Google "Service invoked too many times".
 * Point 3.
 */
let _appelsRawContent = 0;
const MAX_RAW_CONTENT_PAR_EXEC = 50;
let _appelsPlainBody = 0;
const MAX_PLAIN_BODY_PAR_EXEC = 30;

// ─── Fonctions utilitaires d'en-têtes (factorisées — Fix #9) ───────────

/**
 * Extrait la section des en-têtes d'un contenu brut de message email.
 * Gère à la fois \r\n\r\n (RFC 2822) et \n\n (normalisation Gmail).
 * @param {string} contenuBrut - Contenu brut complet du message
 * @returns {string} Les en-têtes du message, ou chaîne vide si non trouvés
 */
function extraireEnTetes_(contenuBrut) {
    if (!contenuBrut) return '';
    let fin = contenuBrut.indexOf('\r\n\r\n');
    if (fin <= 0) fin = contenuBrut.indexOf('\n\n');
    if (fin <= 0) return '';
    return contenuBrut.substring(0, fin);
}

/**
 * Vérifie si un domaine d'expéditeur est un sous-domaine d'une plateforme suspecte connue.
 * @param {string} domaineEmail
 * @returns {string|null} La plateforme correspondante ou null
 */
function estUnePlateformeSuspecte_(domaineEmail) {
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
 * Vérifie les en-têtes pour les sélecteurs DKIM associés aux plateformes suspectes.
 * @param {string} enTetes - En-têtes du message (déjà extraits)
 * @returns {string|null} Le nom de la plateforme correspondante ou null
 */
function verifierSelecteurDkimSuspect_(enTetes) {
    if (!enTetes) return null;
    for (const entree of SELECTEURS_DKIM_SUSPECTS) {
        if (entree.motif.test(enTetes)) {
            return entree.plateforme;
        }
    }
    return null;
}

/**
 * Vérifie les résultats d'authentification email (SPF, DKIM, DMARC) dans les en-têtes.
 * @param {string} enTetes - En-têtes du message (déjà extraits)
 * @returns {{spfEchec: boolean, dkimEchec: boolean, dmarcEchec: boolean, details: string}}
 */
function verifierAuthentificationEmail_(enTetes) {
    const resultat = { spfEchec: false, dkimEchec: false, dmarcEchec: false, details: '' };
    if (!enTetes) return resultat;

    const echecs = [];
    for (const motif of MOTIFS_AUTH_ECHEC) {
        if (motif.motif.test(enTetes)) {
            if (motif.type === 'spf') resultat.spfEchec = true;
            if (motif.type === 'dkim') resultat.dkimEchec = true;
            if (motif.type === 'dmarc') resultat.dmarcEchec = true;
            echecs.push(motif.type + '=fail');
        }
    }
    if (echecs.length > 0) {
        resultat.details = echecs.join(', ');
    }
    return resultat;
}

/**
 * Détermine si un échec d'authentification est significatif.
 * @param {{spfEchec: boolean, dkimEchec: boolean, dmarcEchec: boolean}} auth
 * @returns {boolean}
 */
function estAuthEchouee_(auth) {
    return auth.spfEchec || auth.dmarcEchec;
}

// ─── Cache et liste blanche ────────────────────────────────────────────

/** @type {string[]|null} */
let _cacheListeBlanche = null;

/** @type {string|null} */
let _cacheDomaineProprietaire = null;

/**
 * Retourne le domaine racine du propriétaire de la boîte de réception (mis en cache par exécution).
 * @returns {string}
 */
function getDomaineProprietaire_() {
    if (_cacheDomaineProprietaire !== null) return _cacheDomaineProprietaire;
    try {
        const email = (Session.getEffectiveUser().getEmail() ||
            Session.getActiveUser().getEmail() || '').toLowerCase();
        const domaine = email.split('@')[1] || '';
        _cacheDomaineProprietaire = domaine ? extraireDomaineRacine_(domaine) : '';
    } catch (e) {
        _cacheDomaineProprietaire = '';
    }
    return _cacheDomaineProprietaire;
}

/**
 * Retourne la liste blanche des expéditeurs (mise en cache par exécution).
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
 * Vérifie si un email d'expéditeur est en liste blanche.
 * @param {string} email
 * @returns {boolean}
 */
function estExpediteurEnListeBlanche_(email) {
    if (!email) return false;
    const listeBlanche = getListeBlanche_();
    if (listeBlanche.length === 0) return false;

    const domaine = email.split('@')[1];
    if (!domaine) return false;
    const racine = extraireDomaineRacine_(domaine);

    for (const entree of listeBlanche) {
        if (entree === email || entree === domaine || entree === racine) return true;
    }
    return false;
}

// ─── Analyse de l'expéditeur ───────────────────────────────────────────

/**
 * Analyse une chaîne d'en-tête "De" pour extraire le nom d'affichage et l'email.
 * Plus robuste que la regex simple : gère les parenthèses, guillemets et formats variés (Point 1).
 * @param {string} chaineDe
 * @returns {{nomAffichage: string, email: string}}
 */
function analyserExpediteur_(chaineDe) {
    if (!chaineDe) return { nomAffichage: '', email: '' };

    // Cherche d'abord <email> n'importe où
    const matchAngle = chaineDe.match(/<([^>]+)>/);
    if (matchAngle) {
        const email = matchAngle[1].trim().toLowerCase();
        // Le nom est tout ce qui précède le < (nettoyé des guillemets)
        const nom = chaineDe.slice(0, chaineDe.lastIndexOf('<')).trim().replace(/^"|"$/g, '');
        return { nomAffichage: nom, email: email };
    }

    // Adresse email seule
    return { nomAffichage: '', email: chaineDe.trim().toLowerCase() };
}

const TLD_COMPOSES = new Set([
    'co.uk', 'co.il', 'co.jp', 'co.nz', 'co.za',
    'com.au', 'com.br', 'com.mx', 'com.tr',
    'net.au', 'org.uk', 'gouv.fr', 'gov.uk', 'edu.au'
]);

/**
 * Extrait le domaine racine d'une chaîne de domaine complète.
 * Gère les TLD composés via une liste explicite (Point 8).
 * @param {string} domaine
 * @returns {string}
 */
function extraireDomaineRacine_(domaine) {
    if (!domaine) return '';
    const d = domaine.toLowerCase();
    const parties = d.split('.');
    if (parties.length <= 2) return d;

    const suffixe2 = parties.slice(-2).join('.');
    if (TLD_COMPOSES.has(suffixe2) || parties[parties.length - 2] === 'gouv' || parties[parties.length - 2] === 'gov') {
        return parties.slice(-3).join('.');
    }

    return suffixe2;
}

/**
 * Extensions acceptées comme terminaison d'un vrai nom de domaine.
 *
 * Sans cette validation, « Jean M.Dupont », « Dr.Martin » ou « Service.Client »
 * sont lus comme des domaines (le motif accepte n'importe quelles lettres en
 * terminaison) et déclenchent une alerte d'usurpation générique.
 */
const TLD_CONNUS = new Set([
    // Génériques
    'com', 'net', 'org', 'info', 'biz', 'name', 'pro', 'int',
    'app', 'dev', 'io', 'ai', 'co', 'me', 'tv', 'cc', 'xyz', 'online',
    'site', 'shop', 'store', 'cloud', 'tech', 'agency', 'group', 'email',
    'edu', 'gov', 'mil',
    // Europe
    'fr', 'be', 'ch', 'lu', 'de', 'es', 'it', 'pt', 'nl', 'uk', 'ie',
    'at', 'dk', 'se', 'no', 'fi', 'pl', 'cz', 'gr', 'ro', 'hu', 'eu',
    // Reste du monde
    'us', 'ca', 'mx', 'br', 'ar', 'ru', 'ua', 'cn', 'jp', 'kr', 'in',
    'au', 'nz', 'za', 'il', 'tr', 'ma', 'sn', 'ci',
    // Terminaisons fréquemment employées par les campagnes d'hameçonnage
    'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'link', 'click', 'live', 'icu',
]);

/**
 * Extrait un motif de domaine d'un nom d'affichage après normalisation.
 * La terminaison doit être une extension connue, faute de quoi un nom propre
 * ponctué serait pris pour un domaine.
 * @param {string} nomAffichage
 * @returns {string|null}
 */
function extraireDomaineDuNomAffichage_(nomAffichage) {
    if (!nomAffichage) return null;

    const normalise = normaliserEnAscii_(nomAffichage);
    const motifDomaine = /([a-z0-9][-a-z0-9]*\.)+[a-z]{2,}/g;
    const correspondances = normalise.match(motifDomaine);
    if (!correspondances) return null;

    for (const candidat of correspondances) {
        const parties = candidat.split('.');
        if (TLD_CONNUS.has(parties[parties.length - 1])) return candidat;
    }
    return null;
}

// ─── Détermination de la sévérité (Fix #7) ─────────────────────────────

/**
 * Détermine le niveau de sévérité d'une usurpation détectée.
 * @param {string} typeDetection - 'plateforme', 'dkim', 'marque', 'generique', 'typosquatting', 'auth', 'liens', 'pj', 'replyto'
 * @param {string} nomMarque - Nom de la marque détectée
 * @param {boolean} homoglyphesPresents - Si des homoglyphes ont été utilisés
 * @param {boolean} authEchouee - Si l'authentification SPF/DMARC a échoué
 * @returns {string} 'critique', 'elevee', ou 'moyenne'
 */
function determinerSeverite_(typeDetection, nomMarque, homoglyphesPresents, authEchouee) {
    // Critique : marque financière + homoglyphes, OU échec d'authentification sur marque, OU liens suspects
    if (authEchouee && typeDetection !== 'auth') return 'critique';
    if (homoglyphesPresents && MARQUES_FINANCIERES.has(nomMarque)) return 'critique';
    if (typeDetection === 'liens') return 'critique';

    // Élevée : marque connue, plateforme suspecte, DKIM, typosquatting, PJ dangereuse
    if (['plateforme', 'dkim', 'marque', 'typosquatting', 'pj'].includes(typeDetection)) return 'elevee';

    // Moyenne : domaine générique, authentification seule, Reply-To divergent
    return 'moyenne';
}

// ─── Nouvelles Détections (Points 4, 5, 6) ─────────────────────────────

/**
 * Détecteur de liens suspects dans le corps du message (Point 4).
 *
 * Une marque qui exploite plusieurs extensions renvoie couramment vers ses
 * autres domaines depuis ses propres messages : doctolib.fr vers doctolib.com,
 * amazon.fr vers amazon.com. Comparé à la seule base des marques, ce lien passe
 * pour un changement de TLD, donc pour un typosquat — et l'alerte part en
 * « critique » alors que l'expéditeur EST la marque visée. Le domaine de
 * l'expéditeur est donc désormais transmis, pour écarter ce cas.
 *
 * @param {string|null} corps - Corps du message, ou null s'il n'a pas pu être lu
 *   (quota d'appels Gmail épuisé).
 * @param {string} [racineExpediteur] - Domaine racine de l'expéditeur.
 * @returns {{suspect: boolean, url: string, marque: string}}
 */
function verifierLiensSuspects_(corps, racineExpediteur) {
    if (corps === null) return { suspect: false, url: '', marque: '', quotaEpuise: true };
    try {
        // Regex pour extraire les URLs
        const urls = corps.match(/https?:\/\/[^\s"<>]+/gi) || [];
        for (const url of urls) {
            try {
                // Extraire le domaine de l'URL
                const matchDomaine = url.match(/https?:\/\/([^/:\s]+)/i);
                if (matchDomaine) {
                    const domaine = extraireDomaineRacine_(matchDomaine[1]);
                    const typo = verifierTyposquatting_(domaine);
                    if (typo && !estLienVersSaPropreMarque_(racineExpediteur, typo.domaine)) {
                        return { suspect: true, url: url, marque: typo.nomMarque };
                    }
                }
            } catch (e) { /* URL malformée */ }
        }
    } catch (e) { /* ignore body errors */ }
    return { suspect: false, url: '', marque: '', quotaEpuise: false };
}

/**
 * Indique qu'un lien vise la marque de l'expéditeur lui-même — cas d'un
 * message parti du domaine officiel et renvoyant vers un domaine frère.
 *
 * L'exemption est volontairement étroite : elle exige que l'expéditeur soit le
 * domaine de référence de la marque visée, ou un domaine du même groupe. Un
 * message parti d'ailleurs et pointant vers « paypal.co » reste signalé.
 *
 * @param {string} racineExpediteur - Domaine racine de l'expéditeur.
 * @param {string} domaineMarque - Domaine de référence de la marque visée par le lien.
 * @returns {boolean}
 */
function estLienVersSaPropreMarque_(racineExpediteur, domaineMarque) {
    if (!racineExpediteur || !domaineMarque) return false;
    const racineMarque = extraireDomaineRacine_(domaineMarque);
    return racineMarque === racineExpediteur ||
        estUnDomaineMarqueLie_(racineMarque, racineExpediteur);
}

/**
 * Détecteur d'écarts texte/lien HTML (HTML Link Text Mismatch).
 * Gère le cas classique où le texte d'un lien affiche un domaine de confiance (ex : paypal.com)
 * mais pointe en réalité vers un domaine externe non lié.
 * @param {string|null} html - Corps du message, ou null si non lu (quota épuisé).
 * @returns {{suspect: boolean, texteAffiche: string, urlReelle: string, domaineReel: string, quotaEpuise: boolean}}
 */
function verifierEcartsLiensHtml_(html) {
    if (html === null) {
        return { suspect: false, texteAffiche: '', urlReelle: '', domaineReel: '', quotaEpuise: true };
    }
    try {
        
        // Regex pour capturer les balises <a href="...">...</a>
        const regexLien = /<a\s+(?:[^>]*?\s+)?href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        
        while ((match = regexLien.exec(html)) !== null) {
            const urlReelle = match[1];
            // Nettoyer le texte affiché d'éventuelles balises internes (ex: <b>paypal.com</b>)
            const texteAffiche = match[2].replace(/<[^>]*>/g, '').trim();
            
            // Chercher si le texte affiché contient un domaine ou ressemble à un domaine
            const domaineAffiche = extraireDomaineDuNomAffichage_(texteAffiche);
            if (domaineAffiche) {
                const racineAffichee = extraireDomaineRacine_(domaineAffiche);
                
                // Extraire le domaine de l'URL réelle du href
                const matchUrlReelle = urlReelle.match(/https?:\/\/([^/:\s]+)/i);
                if (matchUrlReelle) {
                    const domaineReel = matchUrlReelle[1];
                    const racineReelle = extraireDomaineRacine_(domaineReel);
                    
                    // Si le domaine affiché correspond à une marque connue ET que l'URL réelle pointe ailleurs
                    const marqueAffichee = trouverMarqueUsurpee_(normaliserEnAscii_(domaineAffiche));
                    if (marqueAffichee) {
                        const racineMarque = extraireDomaineRacine_(marqueAffichee.domaine);
                        
                        // Exemption : pas d'usurpation possible entre domaines
                        // restreints d'une même autorité publique (cf. Marque.gs)
                        const estExempte = estMemeAutoriteEtatique_(racineMarque, racineReelle);

                        if (!estExempte && racineReelle !== racineMarque && !estUnDomaineMarqueLie_(racineMarque, racineReelle)) {
                            return {
                                suspect: true,
                                texteAffiche: domaineAffiche,
                                urlReelle: urlReelle,
                                domaineReel: domaineReel
                            };
                        }
                    }
                }
            }
        }
    } catch (e) {
        Logger.log('Erreur verifierEcartsLiensHtml_ : ' + e.message);
    }
    return { suspect: false, texteAffiche: '', urlReelle: '', domaineReel: '', quotaEpuise: false };
}

/**
 * Détecte les pièces jointes avec des extensions dangereuses (Point 6).
 * @param {GmailMessage} message
 * @returns {{suspecte: boolean, nom: string}}
 */
function verifierPiecesJointes_(message) {
    const EXTENSIONS_DANGEREUSES = ['.exe', '.js', '.vbs', '.bat', '.cmd', '.iso', '.html', '.htm', '.zip', '.7z'];
    try {
        const pj = message.getAttachments();
        for (const piece of pj) {
            const nom = piece.getName().toLowerCase();
            if (EXTENSIONS_DANGEREUSES.some(ext => nom.endsWith(ext))) {
                return { suspecte: true, nom: piece.getName() };
            }
        }
    } catch (e) { /* ignore attachments errors */ }
    return { suspecte: false, nom: '' };
}

// ─── Détection principale ──────────────────────────────────────────────

/**
 * Vérification principale d'usurpation pour un seul message Gmail.
 * Utilise le chargement paresseux pour getRawContent() (Fix #10).
 * Gère le bilinguisme des raisons de détection.
 * @param {GmailMessage} message
 * @returns {{estUsurpation: boolean, raison: string, marque: string, details: string, severite: string}}
 */
function verifierUsurpation_(message) {
    const de = message.getFrom();
    // analysePartielle : un contrôle a été sauté faute de quota d'appels Gmail.
    // L'appelant ne doit alors PAS mémoriser le message comme définitivement
    // traité, sous peine de ne jamais l'examiner en entier.
    const resultat = { estUsurpation: false, raison: '', marque: '', details: '',
                       severite: '', analysePartielle: false };
    
    // Initialisation du dictionnaire bilingue
    const lang = getLangueUtilisateur_();
    const dict = EMAIL_TRANSLATIONS[lang] || EMAIL_TRANSLATIONS['en'];

    // Chargement paresseux du contenu brut avec gestion du quota (Point 3)
    let _enTetesCache;
    const getEnTetes = () => {
        if (_enTetesCache === undefined) {
            if (_appelsRawContent >= MAX_RAW_CONTENT_PAR_EXEC) {
                // En-têtes non lus : SPF/DKIM/DMARC ne peuvent pas être évalués.
                resultat.analysePartielle = true;
                _enTetesCache = '';
                return '';
            }
            try {
                _enTetesCache = extraireEnTetes_(message.getRawContent());
                _appelsRawContent++;
            }
            catch (e) { _enTetesCache = ''; }
        }
        return _enTetesCache;
    };

    // Chargement paresseux du corps : un seul appel Gmail par message, partagé
    // par la recherche de liens typosquattés et le contrôle des liens trompeurs.
    // Auparavant chacun appelait Gmail de son côté (getPlainBody puis getBody),
    // consommant deux unités de quota pour lire deux fois le même message : la
    // couverture effective tombait à quinze messages par exécution.
    let _corpsCache;
    const getCorps = () => {
        if (_corpsCache === undefined) {
            if (_appelsPlainBody >= MAX_PLAIN_BODY_PAR_EXEC) {
                _corpsCache = null;   // null = non lu faute de quota
                return null;
            }
            try {
                _corpsCache = message.getBody() || '';
                _appelsPlainBody++;
            } catch (e) {
                _corpsCache = '';
            }
        }
        return _corpsCache;
    };

    // 1. Analyser l'expéditeur
    const expediteur = analyserExpediteur_(de);
    if (!expediteur.email) return resultat;

    // 1b. Ignorer les e-mails d'alerte et de rapports générés par Unspoofer lui-même pour éviter les faux positifs en boucle
    const sujet = message.getSubject() || '';
    const expediteurEmail = expediteur.email ? expediteur.email.toLowerCase() : '';
    const proprietaireEmail = getEmailProprietaire_().toLowerCase();
    if (expediteurEmail === proprietaireEmail && 
        (sujet.includes(CONFIG.PROJECT_NAME) || 
         sujet.includes("Alerte usurpation") || 
         sujet.includes("Spoofing alert"))) {
        Logger.log('E-mail d\'alerte/rapport auto-généré ignoré : ' + sujet);
        return resultat;
    }

    // 2. Vérifier la liste blanche
    if (estExpediteurEnListeBlanche_(expediteur.email)) return resultat;

    // 3. Vérifier plateforme suspecte (pas d'appel API)
    const domaineExpediteur = expediteur.email.split('@')[1];
    const plateformeSuspecte = estUnePlateformeSuspecte_(domaineExpediteur);
    if (plateformeSuspecte) {
        resultat.estUsurpation = true;
        resultat.marque = plateformeSuspecte;
        resultat.raison = dict.reasonPlatform.replace('{param}', plateformeSuspecte);
        resultat.details = 'De : ' + de + ' | Domaine plateforme : ' + domaineExpediteur;
        resultat.severite = 'elevee';
        return resultat;
    }

    // 4. (Le contrôle Reply-To a été déplacé après l'analyse de marque —
    //     voir l'étape 9b. C'est un signal faible : placé ici, il court-circuitait
    //     la détection d'usurpation de marque et déclassait une alerte critique
    //     en alerte moyenne.)

    // 5. Normaliser le nom d'affichage et chercher une correspondance de marque
    const nomNormalise = expediteur.nomAffichage ? normaliserEnAscii_(expediteur.nomAffichage) : '';
    const homoglyphesPresents = expediteur.nomAffichage ? contientHomoglyphes_(expediteur.nomAffichage) : false;
    let correspondanceMarque = trouverMarqueUsurpee_(nomNormalise);

    // 5b. Vérifier la partie locale de l'email
    if (!correspondanceMarque) {
        const partieLocale = expediteur.email.split('@')[0].replace(/[._+-]/g, ' ');
        correspondanceMarque = trouverMarqueUsurpee_(partieLocale);
    }

    // 6. Extraire le domaine racine de l'expéditeur
    if (!domaineExpediteur) return resultat;
    const racineActuelle = extraireDomaineRacine_(domaineExpediteur);

    // 7. Évaluation de la correspondance de marque
    //
    // Conclure « ce n'est pas une usurpation » ne doit PAS interrompre
    // l'analyse : un message parti du vrai domaine d'une marque peut tout de
    // même porter une adresse de réponse détournée, un lien trompeur ou une
    // pièce jointe dangereuse. Ces cas sortaient auparavant par un return
    // immédiat, sans jamais atteindre les contrôles suivants.
    if (correspondanceMarque) {
        const racineMarque = extraireDomaineRacine_(correspondanceMarque.domaine);
        const memeMarque = racineActuelle === racineMarque ||
            estUnDomaineMarqueLie_(racineMarque, racineActuelle) ||
            // Deux domaines d'une même autorité publique ne peuvent pas
            // s'usurper : leur enregistrement est contrôlé.
            estMemeAutoriteEtatique_(racineMarque, racineActuelle);

        if (memeMarque) correspondanceMarque = null;
    }

    if (correspondanceMarque) {
        const racineMarque = extraireDomaineRacine_(correspondanceMarque.domaine);
        const domaineImplicite = extraireDomaineDuNomAffichage_(expediteur.nomAffichage);
        if (domaineImplicite) {
            const racineImplicite = extraireDomaineRacine_(domaineImplicite);
            if (racineImplicite === racineActuelle) return resultat;
        }

        // Usurpation de marque confirmée
        const authEmail = verifierAuthentificationEmail_(getEnTetes());

        // Libellé de marque qui est aussi un mot courant : sans corroboration,
        // on refuse de conclure (« Square Habitat », « April Formation »).
        if (correspondanceMarque.ambigu &&
            !corroboreMarqueAmbigue_(correspondanceMarque.nomMarque, nomNormalise,
                racineActuelle, homoglyphesPresents, estAuthEchouee_(authEmail))) {
            correspondanceMarque = null;
        } else {
            resultat.estUsurpation = true;
            resultat.marque = correspondanceMarque.nomMarque;
            resultat.raison = dict.reasonImpersonation
                .replace('{param1}', correspondanceMarque.domaine)
                .replace('{param2}', racineActuelle);
            resultat.details = 'De : ' + de + ' | Normalisé : ' + nomNormalise +
                ' | Domaine réel : ' + racineActuelle;
            if (authEmail.details) resultat.details += ' | Auth : ' + authEmail.details;
            resultat.severite = determinerSeverite_('marque', correspondanceMarque.nomMarque,
                homoglyphesPresents, estAuthEchouee_(authEmail));
            return resultat;
        }
    }

    // 8. Vérification générique : domaine dans le nom d'affichage
    const domaineImplicite = extraireDomaineDuNomAffichage_(expediteur.nomAffichage);
    if (domaineImplicite) {
        const racineImplicite = extraireDomaineRacine_(domaineImplicite);
        const domaineProprietaire = getDomaineProprietaire_();
        if (domaineProprietaire && racineImplicite === domaineProprietaire) {
            // C'est le propre domaine du destinataire (service de formulaire) — OK
        } else if (racineImplicite !== racineActuelle && !estUnDomaineMarqueLie_(racineImplicite, racineActuelle)) {
            resultat.estUsurpation = true;
            resultat.marque = racineImplicite.split('.')[0];
            resultat.raison = dict.reasonGenericDomain
                .replace('{param1}', domaineImplicite)
                .replace('{param2}', racineActuelle);
            resultat.details = 'De : ' + de + ' | Domaine affiché : ' + domaineImplicite +
                ' | Domaine réel : ' + racineActuelle;
            resultat.severite = determinerSeverite_('generique', '', false, false);
            return resultat;
        }
    }

    // 9. Vérification du typosquatting sur le domaine de l'expéditeur
    const typosquatting = verifierTyposquatting_(racineActuelle);
    if (typosquatting) {
        resultat.estUsurpation = true;
        resultat.marque = typosquatting.nomMarque;
        resultat.raison = dict.reasonTyposquatting
            .replace('{param1}', racineActuelle)
            .replace('{param2}', typosquatting.domaine);
        resultat.details = 'De : ' + de + ' | Domaine expéditeur : ' + racineActuelle +
            ' | Marque visée : ' + typosquatting.domaine;
        resultat.severite = determinerSeverite_('typosquatting', typosquatting.nomMarque, false, false);
        return resultat;
    }

    // 9b. Reply-To divergent (Point 5) — signal faible, évalué après les
    //     contrôles d'usurpation de marque pour ne pas les court-circuiter.
    try {
        const replyTo = message.getReplyTo ? message.getReplyTo() : '';
        if (replyTo) {
            const analyseReply = analyserExpediteur_(replyTo);
            const replyDomaine = extraireDomaineRacine_(analyseReply.email.split('@')[1] || '');
            // Adresse de réponse = le titulaire de la boîte lui-même : il n'y a
            // personne à usurper. C'est le cas de tous les partages Drive,
            // Docs ou Agenda que l'utilisateur a initiés — le notificateur
            // Google place le partageur en Reply-To.
            const proprietaire = getEmailProprietaire_().toLowerCase();
            const repondAuProprietaire =
                !!proprietaire && analyseReply.email === proprietaire;
            if (!repondAuProprietaire &&
                replyDomaine && racineActuelle && replyDomaine !== racineActuelle &&
                !estUnDomaineMarqueLie_(racineActuelle, replyDomaine) &&
                !getPlateformesTierces_().has(racineActuelle)) {
                resultat.estUsurpation = true;
                resultat.marque = '';
                resultat.raison = dict.reasonReplyTo.replace('{param}', analyseReply.email);
                resultat.details = 'De : ' + de + ' | Reply-To : ' + replyTo;
                resultat.severite = 'moyenne';
                return resultat;
            }
        }
    } catch (e) { /* ignore reply-to errors */ }

    // 10. Vérification des liens suspects dans le corps (Point 4)
    const liensSuspects = verifierLiensSuspects_(getCorps(), racineActuelle);
    if (liensSuspects.quotaEpuise) resultat.analysePartielle = true;
    if (liensSuspects.suspect) {
        resultat.estUsurpation = true;
        resultat.marque = liensSuspects.marque;
        resultat.raison = dict.reasonBodyLink;
        resultat.details = 'URL suspecte : ' + liensSuspects.url + ' | Marque visée : ' + liensSuspects.marque;
        resultat.severite = 'critique';
        return resultat;
    }

    // 10b. Vérification des écarts texte/lien HTML (HTML Link Text Mismatch)
    const ecartLienHtml = verifierEcartsLiensHtml_(getCorps());
    if (ecartLienHtml.quotaEpuise) resultat.analysePartielle = true;
    if (ecartLienHtml.suspect) {
        resultat.estUsurpation = true;
        resultat.marque = '';
        resultat.raison = dict.reasonHtmlLinkMismatch
            .replace('{param1}', ecartLienHtml.texteAffiche)
            .replace('{param2}', ecartLienHtml.domaineReel);
        resultat.details = 'Texte affiché : ' + ecartLienHtml.texteAffiche + ' | Pointait vers : ' + ecartLienHtml.urlReelle;
        resultat.severite = 'critique';
        return resultat;
    }

    // 11. Vérification des pièces jointes suspectes (Point 6)
    const pjSuspecte = verifierPiecesJointes_(message);
    if (pjSuspecte.suspecte) {
        resultat.estUsurpation = true;
        resultat.marque = '';
        resultat.raison = dict.reasonAttachment.replace('{param}', pjSuspecte.nom);
        resultat.details = 'Extension potentiellement dangereuse : ' + pjSuspecte.nom;
        resultat.severite = 'elevee';
        return resultat;
    }

    // 12. Vérification DKIM (chargement paresseux — ne charge les en-têtes que si nécessaire)
    const plateformeDkim = verifierSelecteurDkimSuspect_(getEnTetes());
    if (plateformeDkim) {
        resultat.estUsurpation = true;
        resultat.marque = plateformeDkim;
        resultat.raison = dict.reasonDkim.replace('{param}', plateformeDkim);
        resultat.details = 'De : ' + de + ' | Domaine expéditeur : ' + domaineExpediteur;
        resultat.severite = 'elevee';
        return resultat;
    }

    // 13. Vérification SPF/DMARC seule (dernier recours)
    const authEmail = verifierAuthentificationEmail_(getEnTetes());
    if (estAuthEchouee_(authEmail)) {
        resultat.estUsurpation = true;
        resultat.marque = '';
        resultat.raison = dict.reasonAuthFail.replace('{param}', authEmail.details);
        resultat.details = 'De : ' + de + ' | Domaine expéditeur : ' + domaineExpediteur +
            ' | Auth : ' + authEmail.details;
        resultat.severite = 'moyenne';
        return resultat;
    }

    return resultat;
}
