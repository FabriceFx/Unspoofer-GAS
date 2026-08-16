/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Marque.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Détecteur Phishing
 *  Rôle        : Contrôle de conformité de l'identité de marque et des signatures de confiance.
 *  Version     : 2.1.0
 * ============================================================================
 */

/**
 * Liste des marques/domaines et logique de correspondance pour la détection d'usurpation.
 * Inclut les marques internationales, françaises et européennes.
 *
 * Sources de référence pour la priorisation :
 *   - APWG eCrime Reports (https://apwg.org/resources/apwg-reports/)
 *   - Vade Secure Phishers' Favorites (top 25 mensuel)
 *   - Proofpoint State of the Phish Report
 *
 * Dernière mise à jour : mai 2025
 */

const DOMAINES_MARQUES = [

    // ── Géants de la technologie ──────────────────────────────────────────
    'google.com', 'apple.com', 'microsoft.com', 'amazon.com', 'meta.com',
    'facebook.com', 'instagram.com', 'whatsapp.com', 'tiktok.com',

    // ── Intelligence artificielle ─────────────────────────────────────────
    'openai.com', 'chatgpt.com', 'anthropic.com', 'mistral.ai', 'gemini.google.com',

    // ── Cloud & infrastructure ────────────────────────────────────────────
    'cloudflare.com', 'github.com', 'gitlab.com',
    'ovh.com', 'ovhcloud.com', 'scaleway.com', 'ionos.fr',
    'digitalocean.com', 'netlify.com', 'vercel.com', 'heroku.com',
    'aws.amazon.com',

    // ── SaaS / productivité ───────────────────────────────────────────────
    'wix.com', 'squarespace.com', 'shopify.com', 'godaddy.com',
    'dropbox.com', 'zoom.us', 'slack.com', 'notion.so',
    'salesforce.com', 'hubspot.com', 'mailchimp.com',
    'docusign.com', 'adobe.com', 'canva.com', 'figma.com',
    'atlassian.com', 'trello.com', 'asana.com',

    // ── Messagerie / communications ───────────────────────────────────────
    'outlook.com', 'yahoo.com', 'protonmail.com', 'icloud.com',

    // ── Paiements & fintech internationaux ───────────────────────────────
    // Priorité maximale — vecteur d'arnaque principal
    'paypal.com', 'stripe.com', 'wise.com', 'revolut.com', 'venmo.com',
    'square.com', 'cash.app', 'zelle.com', 'klarna.com',

    // ── Cryptomonnaies ────────────────────────────────────────────────────
    // Très ciblées, arnaques en forte hausse depuis 2023
    'coinbase.com', 'binance.com', 'ledger.com', 'kraken.com',
    'metamask.io', 'blockchain.com', 'crypto.com',

    // ── Streaming / médias / réseaux sociaux ─────────────────────────────
    'netflix.com', 'spotify.com', 'youtube.com', 'twitch.tv', 'disneyplus.com',
    'linkedin.com', 'twitter.com', 'x.com', 'snapchat.com', 'pinterest.com',

    // ── E-commerce international ──────────────────────────────────────────
    'ebay.com', 'aliexpress.com', 'etsy.com',

    // ── Expédition internationale ─────────────────────────────────────────
    'fedex.com', 'ups.com', 'dhl.com', 'usps.com',
    'royalmail.com', 'poste.it', 'correos.es', 'bpost.be',

    // ── Banques américaines ───────────────────────────────────────────────
    'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citibank.com',
    'capitalone.com',

    // ── Banques israéliennes ──────────────────────────────────────────────
    'leumi.co.il', 'poalim.co.il', 'discount.co.il', 'mizrahi-tefahot.co.il',
    'fibi.co.il',

    // ── Services israéliens ───────────────────────────────────────────────
    'walla.co.il', 'ynet.co.il', 'gett.com',

    // ══ FRANCE ════════════════════════════════════════════════════════════

    // ── Banques françaises classiques ─────────────────────────────────────
    'creditagricole.fr', 'bnpparibas.com', 'societegenerale.fr',
    'labanquepostale.fr', 'lcl.fr', 'caisse-epargne.fr',
    'boursorama.com', 'creditlyonnais.fr', 'creditmutuel.fr',
    'banquepopulaire.fr', 'hsbc.fr', 'ing.fr',

    // ── Banques et néobanques françaises — nouvelles ──────────────────────
    'fortuneo.fr', 'monabanq.com', 'hellobank.fr',
    'bforbank.com', 'nickel.eu', 'floa.fr',
    'sumeria.fr',                                   // ex-Lydia, très ciblée en 2024-25

    // ── Services publics français ─────────────────────────────────────────
    // Vecteur d'arnaque majeur — usurpations fréquentes et crédibles
    'impots.gouv.fr', 'ameli.fr', 'caf.fr', 'pole-emploi.fr',
    'service-public.fr', 'cpam.fr', 'urssaf.fr',
    'tresor.gouv.fr', 'securite-sociale.fr',
    'antai.fr',                                     // Amendes routières — très usurpé
    'ants.gouv.fr',                                 // Permis de conduire / passeports
    'france-connect.fr',

    // ── Télécoms / FAI français ───────────────────────────────────────────
    'orange.fr', 'sfr.fr', 'free.fr', 'bouyguestelecom.fr', 'sosh.fr',
    'numericable.fr', 'coriolis.fr',

    // ── Énergie française ─────────────────────────────────────────────────
    // Arnaques en forte hausse depuis 2022 (crise énergétique)
    'edf.fr', 'engie.fr', 'totalenergies.fr',
    'ekwateur.fr', 'octopusenergy.fr',

    // ── Assurance & mutuelle française ───────────────────────────────────
    'axa.fr', 'maif.fr', 'macif.fr', 'maaf.fr', 'groupama.fr',
    'harmonie-mutuelle.fr', 'mgen.fr', 'malakoffhumanis.com',
    'april.fr', 'matmut.fr', 'covea.fr',

    // ── E-commerce français / européen ───────────────────────────────────
    'leboncoin.fr', 'cdiscount.com', 'fnac.com', 'vinted.fr',
    'veepee.fr', 'boulanger.fr', 'darty.com', 'ldlc.com',

    // ── Expédition française / européenne ────────────────────────────────
    'laposte.fr', 'colissimo.fr', 'chronopost.fr', 'mondialrelay.fr',
    'dpd.fr', 'gls-france.fr',
    'relaiscolis.com', 'tnt.fr',

    // ── Crédit à la consommation ─────────────────────────────────────────
    // Cible fréquente : promesse de crédit ou régularisation d'échéance
    'cetelem.fr', 'cofidis.fr', 'sofinco.fr', 'younited-credit.com',

    // ── Formation & retraite ─────────────────────────────────────────────
    // moncompteformation : un des vecteurs d'arnaque les plus actifs en France
    'moncompteformation.gouv.fr', 'lassuranceretraite.fr',
    'agirc-arrco.fr', 'info-retraite.fr',

    // ── Services publics complémentaires ─────────────────────────────────
    'franceconnect.gouv.fr', 'msa.fr', 'demarches-simplifiees.fr',

    // ── Distribution d'énergie ───────────────────────────────────────────
    'enedis.fr', 'grdf.fr',

    // ── E-commerce & plateformes grand public ────────────────────────────
    'rakuten.fr', 'zalando.fr', 'shein.com', 'temu.com', 'backmarket.fr',
    'doctolib.fr',

    // ── Streaming complémentaire ─────────────────────────────────────────
    'canalplus.com', 'primevideo.com',

    // ── Cryptomonnaies complémentaires ───────────────────────────────────
    'trezor.io', 'bitpanda.com',

];

/**
 * Groupes de domaines liés appartenant à la même entreprise.
 * Si un nom d'affichage correspond à la marque X et que l'expéditeur provient
 * d'un domaine lié, l'email est considéré comme légitime.
 */
const GROUPES_MARQUES = [
    // Technologie internationale
    ['google.com', 'youtube.com', 'googlemail.com', 'gemini.google.com', 'googlegroups.com'],
    ['microsoft.com', 'outlook.com', 'live.com', 'hotmail.com', 'office.com',
        'office365.com', 'microsoftonline.com', 'sharepoint.com'],
    ['apple.com', 'icloud.com', 'me.com', 'mac.com'],
    ['meta.com', 'facebook.com', 'instagram.com', 'whatsapp.com', 'facebookmail.com'],
    ['amazon.com', 'amazonaws.com'],
    ['openai.com', 'chatgpt.com'],
    ['atlassian.com', 'trello.com', 'jira.com', 'confluence.com'],

    // Paiements
    ['paypal.com', 'paypal.me'],
    ['square.com', 'cash.app', 'squareup.com'],

    // Cryptomonnaies
    ['coinbase.com', 'coinbase.pro'],

    // Cloud FR
    ['ovh.com', 'ovhcloud.com'],

    // ── Groupes français ──
    ['bnpparibas.com', 'mabanque.bnpparibas.fr', 'hellobank.fr'],
    ['orange.fr', 'sosh.fr'],
    ['laposte.fr', 'colissimo.fr'],
    ['creditagricole.fr', 'ca-paris.fr', 'ca-centrest.fr', 'ca-normandie.fr',
        'ca-briepicardie.fr', 'ca-alsace-vosges.fr'],
    ['societegenerale.fr', 'boursorama.com'],
    ['free.fr', 'iliad.fr', 'freebox.fr'],
    ['edf.fr', 'edf-particuliers.fr', 'relation-client-edf.fr'],
    ['axa.fr', 'axa-banque.fr', 'axa-assurance.fr'],
    ['maif.fr', 'maif-vie.fr'],
    ['macif.fr', 'macif-mutualite.fr'],
    ['groupama.fr', 'gan.fr'],
    ['malakoffhumanis.com', 'malakoffmederic.com', 'humanis.com'],
    ['fnac.com', 'darty.com'],                      // Groupe Fnac-Darty
    ['totalenergies.fr', 'total.fr'],

    // ── Administrations de l'État français ──
    // La DGFiP affiche la marque impots.gouv.fr mais émet depuis finances.gouv.fr
    ['impots.gouv.fr', 'finances.gouv.fr', 'tresor.gouv.fr', 'dgfip.finances.gouv.fr'],
    ['ameli.fr', 'cpam.fr', 'securite-sociale.fr', 'assurance-maladie.fr'],
    ['pole-emploi.fr', 'francetravail.fr'],         // Renommage France Travail (2024)
    ['edf.fr', 'enedis.fr'],
    ['engie.fr', 'grdf.fr'],
];

/**
 * Suffixes réservés à des autorités publiques : leur enregistrement est
 * contrôlé, donc une usurpation d'un de ces domaines par un autre est
 * impossible en pratique. Sert à éteindre les faux positifs entre
 * administrations d'un même État.
 */
const SUFFIXES_ETATIQUES = ['.gouv.fr', '.gov', '.gov.uk', '.gc.ca', '.edu', '.mil'];

/**
 * Indique si deux domaines relèvent de la même autorité publique.
 * @param {string} racineA
 * @param {string} racineB
 * @returns {boolean}
 */
function estMemeAutoriteEtatique(racineA, racineB) {
    if (!racineA || !racineB) return false;
    const a = racineA.toLowerCase();
    const b = racineB.toLowerCase();
    return SUFFIXES_ETATIQUES.some((s) => a.endsWith(s) && b.endsWith(s));
}

/**
 * Libellés de marque qui sont aussi des mots courants du français ou de
 * l'anglais. Une correspondance sur ces seuls libellés ne suffit pas :
 * « Square Habitat », « L'Orange Bleue » ou « April Formation » sont des
 * entreprises réelles sans rapport avec square.com, orange.fr ou april.fr.
 *
 * Ces marques exigent une corroboration (voir verifierUsurpation).
 */
const MARQUES_AMBIGUES = new Set([
    'april', 'blockchain', 'boulanger', 'cash', 'crypto', 'discount',
    'free', 'gett', 'ing', 'ledger', 'meta', 'nickel', 'notion',
    'orange', 'poste', 'slack', 'square', 'total', 'walla', 'wise', 'zoom',
]);

/**
 * Noms usuels d'organismes qui ne correspondent pas à leur nom de domaine.
 * Clé : forme compacte du nom affiché. Valeur : domaine officiel.
 *
 * Sans cette table, « Assurance Maladie » ou « France Travail » ne peuvent
 * pas être rapprochés d'ameli.fr ou de pole-emploi.fr.
 */
const ALIAS_MARQUES = {
    'assurancemaladie': 'ameli.fr',
    'lassurancemaladie': 'ameli.fr',
    'cartevitale': 'ameli.fr',
    'francetravail': 'pole-emploi.fr',
    'poleemploi': 'pole-emploi.fr',
    'tresorpublic': 'tresor.gouv.fr',
    'directiongeneraledesfinancespubliques': 'impots.gouv.fr',
    'dgfip': 'impots.gouv.fr',
    'moncompteformation': 'moncompteformation.gouv.fr',
    'comptepersonneldeformation': 'moncompteformation.gouv.fr',
    'lassuranceretraite': 'lassuranceretraite.fr',
    'caissedallocationsfamiliales': 'caf.fr',
    'agencenationaledestitressecurises': 'ants.gouv.fr',
    'assurancevieillesse': 'lassuranceretraite.fr',
};

/**
 * Marques financières — déclenchent un niveau de sévérité CRITIQUE
 * lorsqu'elles sont usurpées avec des homoglyphes ou un échec d'auth.
 *
 * Règle d'inclusion : toute marque dont l'usurpation peut entraîner
 * une perte financière directe pour l'utilisateur.
 */
const MARQUES_FINANCIERES = new Set([
    // Paiements internationaux
    'paypal', 'stripe', 'wise', 'revolut', 'venmo', 'square',
    'cash', 'zelle', 'klarna',

    // Cryptomonnaies
    'coinbase', 'binance', 'ledger', 'kraken', 'metamask', 'blockchain', 'crypto',

    // Banques américaines
    'chase', 'bankofamerica', 'wellsfargo', 'citibank', 'capitalone',

    // Banques israéliennes
    'leumi', 'poalim', 'discount', 'mizrahi-tefahot', 'fibi',

    // Banques françaises classiques
    'creditagricole', 'bnpparibas', 'societegenerale', 'labanquepostale',
    'lcl', 'caisse-epargne', 'boursorama', 'creditmutuel', 'banquepopulaire',
    'creditlyonnais', 'hsbc', 'ing',

    // Néobanques françaises
    'fortuneo', 'monabanq', 'hellobank', 'bforbank', 'nickel', 'floa', 'sumeria',

    // Services publics financiers (remboursements frauduleux très fréquents)
    'impots', 'tresor', 'urssaf', 'caf', 'ameli', 'cpam', 'antai',
]);

// ─── Logique de correspondance (inchangée) ─────────────────────────────────

let _indexMarques = null;

/**
 * Longueur minimale d'un libellé compact pour autoriser une correspondance
 * par inclusion. En dessous, le risque de collision fortuite à l'intérieur
 * d'un nom plus long est trop élevé.
 */
const LONGUEUR_MIN_COMPACTE = 8;

/**
 * Construit un index des marques pour une recherche plus rapide (O(1) pour les noms).
 * Évite la double boucle O(n²).
 *
 * Trois entrées :
 *   parDomaine  — domaines complets, correspondance la plus fiable
 *   parNom      — libellé seul (« paypal »), avec test de délimitation
 *   parCompacte — libellé sans séparateur ni accent (« creditagricole »),
 *                 pour rapprocher un nom affiché en plusieurs mots de son domaine
 *
 * @returns {{parDomaine: string[], parNom: Map<string, string>, parCompacte: Map<string, string>}}
 */
function getIndexMarques_() {
    if (_indexMarques) return _indexMarques;
    _indexMarques = { parDomaine: [], parNom: new Map(), parCompacte: new Map() };

    // 1. Charger les marques statiques du fichier
    const toutesLesMarques = [...DOMAINES_MARQUES];

    // 2. Charger les marques personnalisées dynamiques stockées par le Dashboard
    try {
        const customBruts = PropertiesService.getScriptProperties().getProperty('customBrands');
        if (customBruts) {
            const customBrands = JSON.parse(customBruts);
            for (const cb of customBrands) {
                if (cb.domaine && !toutesLesMarques.includes(cb.domaine)) {
                    toutesLesMarques.push(cb.domaine.trim().toLowerCase());
                }
            }
        }
    } catch (e) {
        Logger.log('Erreur chargement marques personnalisées : ' + e.message);
    }

    for (const domaine of toutesLesMarques) {
        _indexMarques.parDomaine.push(domaine);
        const nom = extraireNomMarque(domaine);
        if (nom.length >= 3 && !_indexMarques.parNom.has(nom)) {
            _indexMarques.parNom.set(nom, domaine);
        }
        // Forme compacte : « pole-emploi » → « poleemploi »
        const compacte = normaliserEnFormeCompacte(nom);
        if (compacte.length >= LONGUEUR_MIN_COMPACTE &&
            !MARQUES_AMBIGUES.has(nom) &&
            !_indexMarques.parCompacte.has(compacte)) {
            _indexMarques.parCompacte.set(compacte, domaine);
        }
    }

    // 3. Noms usuels d'organismes qui diffèrent de leur nom de domaine
    for (const alias in ALIAS_MARQUES) {
        if (alias.length >= LONGUEUR_MIN_COMPACTE && !_indexMarques.parCompacte.has(alias)) {
            _indexMarques.parCompacte.set(alias, ALIAS_MARQUES[alias]);
        }
    }

    return _indexMarques;
}

let _cacheDomaineLie = null;

/**
 * Vérifie si deux domaines racines appartiennent au même groupe de marque.
 * @param {string} racineMarque
 * @param {string} racineExpediteur
 * @returns {boolean}
 */
function estUnDomaineMarqueLie(racineMarque, racineExpediteur) {
    if (!_cacheDomaineLie) {
        _cacheDomaineLie = {};
        for (const groupe of GROUPES_MARQUES) {
            const racines = groupe.map(d => extraireDomaineRacine(d));
            for (const racine of racines) {
                // Fusion, et non remplacement : un domaine peut figurer dans
                // plusieurs groupes (edf.fr appartient au groupe historique EDF
                // et au groupe de distribution EDF/Enedis). Écraser l'entrée
                // ferait perdre silencieusement les liens du premier groupe.
                if (!_cacheDomaineLie[racine]) _cacheDomaineLie[racine] = [];
                for (const r of racines) {
                    if (!_cacheDomaineLie[racine].includes(r)) {
                        _cacheDomaineLie[racine].push(r);
                    }
                }
            }
        }
    }
    const lie = _cacheDomaineLie[racineMarque];
    return lie ? lie.includes(racineExpediteur) : false;
}

/**
 * Extrait le nom de la marque seule d'un domaine (ex : "paypal.com" → "paypal").
 * @param {string} domaine
 * @returns {string}
 */
function extraireNomMarque(domaine) {
    return domaine.split('.')[0];
}

/**
 * Vérifie si un nom d'affichage normalisé contient un domaine de marque connu ou un nom de marque.
 * Retourne le domaine de marque correspondant ou null.
 *
 * Les trois passages vont du plus fiable au moins fiable. Le dernier peut
 * correspondre sur un libellé qui est aussi un mot courant : il est alors
 * marqué `ambigu`, à charge pour l'appelant d'exiger une corroboration.
 *
 * @param {string} nomAffichageNormalise - Déjà normalisé (ASCII, minuscules)
 * @returns {{domaine: string, nomMarque: string, ambigu: boolean}|null}
 */
function trouverMarqueUsurpee(nomAffichageNormalise) {
    if (!nomAffichageNormalise) return null;

    const index = getIndexMarques_();

    // Premier passage : domaine complet cité dans le nom affiché (« paypal.com »)
    for (const domaine of index.parDomaine) {
        if (nomAffichageNormalise.includes(domaine)) {
            return { domaine: domaine, nomMarque: extraireNomMarque(domaine), ambigu: false };
        }
    }

    // Deuxième passage : forme compacte, pour les raisons sociales en plusieurs
    // mots et les noms usuels (« Crédit Agricole », « Assurance Maladie »)
    const compacte = normaliserEnFormeCompacte(nomAffichageNormalise);
    if (compacte) {
        for (const [cle, domaine] of index.parCompacte.entries()) {
            if (compacte.includes(cle)) {
                return { domaine: domaine, nomMarque: extraireNomMarque(domaine), ambigu: false };
            }
        }
    }

    // Troisième passage : libellé seul, en exigeant une délimitation de mot
    for (const [nom, domaine] of index.parNom.entries()) {
        const pos = nomAffichageNormalise.indexOf(nom);
        if (pos !== -1) {
            const avant = pos > 0 ? nomAffichageNormalise[pos - 1] : ' ';
            const apres = pos + nom.length < nomAffichageNormalise.length
                ? nomAffichageNormalise[pos + nom.length] : ' ';
            const estDelimiteur = (ch) => /[^a-z0-9]/.test(ch);
            if (estDelimiteur(avant) && estDelimiteur(apres)) {
                return { domaine: domaine, nomMarque: nom, ambigu: MARQUES_AMBIGUES.has(nom) };
            }
        }
    }

    return null;
}

/**
 * Cherche une corroboration lorsque la marque détectée porte un libellé
 * ambigu. Sans elle, « Square Habitat » ou « April Formation » seraient
 * signalés comme des usurpations.
 *
 * Signaux retenus :
 *   - le nom affiché est exactement le nom de la marque (les homonymes
 *     légitimes portent presque toujours un qualificatif) ;
 *   - le domaine expéditeur combine le nom de la marque et un mot-clé
 *     d'hameçonnage (« orange-securite.tk ») ;
 *   - des homoglyphes ou un échec d'authentification accompagnent le message.
 *
 * @param {string} nomMarque
 * @param {string} nomAffichageNormalise
 * @param {string} racineExpediteur
 * @param {boolean} homoglyphesPresents
 * @param {boolean} authEchouee
 * @returns {boolean}
 */
function corroboreMarqueAmbigue(nomMarque, nomAffichageNormalise, racineExpediteur,
    homoglyphesPresents, authEchouee) {
    if (homoglyphesPresents || authEchouee) return true;

    const affiche = normaliserEnFormeCompacte(nomAffichageNormalise);
    if (affiche === normaliserEnFormeCompacte(nomMarque)) return true;

    const label = (racineExpediteur || '').split('.')[0];
    if (label.includes(nomMarque)) {
        for (const mot of MOTS_CLES_PHISHING) {
            if (label.includes(mot)) return true;
        }
    }

    return false;
}

// ─── Détection de typosquatting (distance de Levenshtein) ──────────────────

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * Optimisé O(n) en mémoire (deux lignes glissantes).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function distanceLevenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    let precedent = Array.from({ length: a.length + 1 }, (_, i) => i);
    for (let i = 1; i <= b.length; i++) {
        const courant = [i];
        for (let j = 1; j <= a.length; j++) {
            courant[j] = b[i - 1] === a[j - 1]
                ? precedent[j - 1]
                : 1 + Math.min(precedent[j], courant[j - 1], precedent[j - 1]);
        }
        precedent = courant;
    }
    return precedent[a.length];
}

/**
 * Vérifie si le domaine de l'expéditeur ressemble à un domaine de marque connue (typosquatting).
 * Ex : "paypa1.com" ≈ "paypal.com", "arnazon.com" ≈ "amazon.com"
 * @param {string} racineExpediteur - Domaine racine de l'expéditeur (ex : "paypa1.com")
 * @returns {{domaine: string, nomMarque: string}|null}
 */
const MOTS_CLES_PHISHING = [
    'login', 'signin', 'security', 'securite', 'support', 'update', 
    'compte', 'verification', 'verif', 'portal', 'portail', 'alert', 
    'alerte', 'service', 'client', 'facture', 'assistance', 'secure'
];

/**
 * Vérifie si le domaine de l'expéditeur ressemble à un domaine de marque connue (typosquatting).
 * Ex : "paypa1.com" ≈ "paypal.com" (Levenshtein), ou "paypal-securite.com" (Concaténation).
 * @param {string} racineExpediteur - Domaine racine de l'expéditeur (ex : "paypa1.com")
 * @returns {{domaine: string, nomMarque: string}|null}
 */
function verifierTyposquatting(racineExpediteur) {
    if (!racineExpediteur) return null;

    // Éviter les faux positifs sur les domaines gouvernementaux et académiques hautement restreints (ex: finances.gouv.fr)
    const domaineMin = racineExpediteur.toLowerCase();
    if (domaineMin.endsWith('.gouv.fr') || 
        domaineMin.endsWith('.gov') || 
        domaineMin.endsWith('.gov.uk') || 
        domaineMin.endsWith('.gc.ca') || 
        domaineMin.endsWith('.edu') || 
        domaineMin.endsWith('.mil')) {
        return null;
    }

    const nomExpediteur = racineExpediteur.split('.')[0];
    if (nomExpediteur.length < 3) return null;

    const index = getIndexMarques_();

    // 0. Changement de TLD : libellé identique à une marque, domaine différent.
    //    « paypal.co » ou « ameli.co » ne coûtent presque rien à l'attaquant et
    //    échappent à la distance de Levenshtein, qui ne compare que le libellé.
    const entreeExacte = index.parNom.get(nomExpediteur);
    if (entreeExacte && !MARQUES_AMBIGUES.has(nomExpediteur)) {
        const racineMarque = extraireDomaineRacine(entreeExacte);
        if (racineMarque === racineExpediteur ||
            estUnDomaineMarqueLie(racineMarque, racineExpediteur)) {
            return null;   // domaine officiel de la marque
        }
        return { domaine: entreeExacte, nomMarque: nomExpediteur };
    }

    // 1. Détection par concaténation de mots-clés de phishing
    for (const [nomMarque, domaine] of index.parNom.entries()) {
        if (nomMarque.length < 4) continue;
        
        // Si le nom de l'expéditeur contient le nom de marque en entier
        if (nomExpediteur.includes(nomMarque) && nomExpediteur !== nomMarque) {
            for (const mot of MOTS_CLES_PHISHING) {
                if (nomExpediteur.includes(nomMarque + '-' + mot) || 
                    nomExpediteur.includes(mot + '-' + nomMarque) ||
                    nomExpediteur.includes(nomMarque + mot) || 
                    nomExpediteur.includes(mot + nomMarque)) {
                    return { domaine: domaine, nomMarque: nomMarque };
                }
            }
        }
    }

    // 2. Détection par distance de Levenshtein classique
    for (const [nomMarque, domaine] of index.parNom.entries()) {
        // Ignorer les noms trop courts — trop de faux positifs entre marques légitimes
        if (nomMarque.length < 4) continue;

        // Ne pas vérifier si les noms sont identiques (domaine légitime)
        if (nomExpediteur === nomMarque) continue;

        // Seuil adaptatif : distance max 1 pour noms courts, 2 pour noms longs
        const seuilMax = nomMarque.length >= 6 ? 2 : 1;

        // Garde rapide sur la différence de longueur
        const diffLongueur = Math.abs(nomExpediteur.length - nomMarque.length);
        if (diffLongueur > seuilMax) continue;

        const distance = distanceLevenshtein(nomExpediteur, nomMarque);
        if (distance > 0 && distance <= seuilMax) {
            return { domaine: domaine, nomMarque: nomMarque };
        }
    }
    return null;
}
