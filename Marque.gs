/**
 * Liste des marques/domaines et logique de correspondance pour la détection d'usurpation.
 * Inclut les marques internationales, françaises et européennes.
 */

const DOMAINES_MARQUES = [
    // Géants de la technologie
    'google.com', 'apple.com', 'microsoft.com', 'amazon.com', 'meta.com',
    'facebook.com', 'instagram.com', 'whatsapp.com',

    // IA
    'openai.com', 'chatgpt.com',

    // Cloud / SaaS
    'wix.com', 'squarespace.com', 'shopify.com', 'godaddy.com',
    'dropbox.com', 'zoom.us', 'slack.com', 'notion.so',
    'salesforce.com', 'hubspot.com', 'mailchimp.com',

    // Email / communications
    'outlook.com', 'yahoo.com', 'protonmail.com',

    // Paiements
    'paypal.com', 'stripe.com', 'wise.com', 'revolut.com', 'venmo.com',
    'square.com',

    // Streaming / médias
    'netflix.com', 'spotify.com', 'youtube.com', 'twitch.tv',
    'linkedin.com', 'twitter.com', 'x.com',

    // Expédition internationale
    'fedex.com', 'ups.com', 'dhl.com', 'usps.com',

    // Banques américaines
    'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citibank.com',
    'capitalone.com',

    // Banques israéliennes
    'leumi.co.il', 'poalim.co.il', 'discount.co.il', 'mizrahi-tefahot.co.il',
    'fibi.co.il',

    // Services israéliens
    'walla.co.il', 'ynet.co.il', 'gett.com',

    // Sécurité / infrastructure
    'cloudflare.com', 'github.com', 'gitlab.com',

    // E-commerce international
    'ebay.com', 'aliexpress.com', 'etsy.com',

    // ── Banques françaises ──
    'creditagricole.fr', 'bnpparibas.com', 'societegenerale.fr',
    'labanquepostale.fr', 'lcl.fr', 'caisse-epargne.fr',
    'boursorama.com', 'creditlyonnais.fr', 'creditmutuel.fr',
    'banquepopulaire.fr', 'hsbc.fr', 'ing.fr',

    // ── Services publics français ──
    'impots.gouv.fr', 'ameli.fr', 'caf.fr', 'pole-emploi.fr',
    'service-public.fr', 'cpam.fr',

    // ── Télécoms / FAI français ──
    'orange.fr', 'sfr.fr', 'free.fr', 'bouyguestelecom.fr',
    'sosh.fr',

    // ── E-commerce français / européen ──
    'leboncoin.fr', 'cdiscount.com', 'fnac.com', 'vinted.fr',
    'veepee.fr',

    // ── Expédition française / européenne ──
    'laposte.fr', 'colissimo.fr', 'chronopost.fr', 'mondialrelay.fr',
    'dpd.fr',
];

/**
 * Groupes de domaines liés appartenant à la même entreprise.
 * Si un nom d'affichage correspond à la marque X et que l'expéditeur provient d'un domaine lié, c'est légitime.
 */
const GROUPES_MARQUES = [
    ['google.com', 'youtube.com', 'googlemail.com'],
    ['microsoft.com', 'outlook.com', 'live.com', 'hotmail.com', 'office.com', 'office365.com'],
    ['apple.com', 'icloud.com', 'me.com', 'mac.com'],
    ['meta.com', 'facebook.com', 'instagram.com', 'whatsapp.com'],
    ['amazon.com', 'amazonaws.com'],
    ['openai.com', 'chatgpt.com'],
    // Groupes français
    ['bnpparibas.com', 'mabanque.bnpparibas'],
    ['orange.fr', 'sosh.fr'],
    ['laposte.fr', 'colissimo.fr'],
    ['creditagricole.fr', 'ca-paris.fr', 'ca-centrest.fr'],
    ['societegenerale.fr', 'boursorama.com'],
    ['free.fr', 'iliad.fr'],
];

/**
 * Marques financières — utilisées pour attribuer un niveau de sévérité critique
 * lorsqu'elles sont usurpées avec des homoglyphes.
 */
const MARQUES_FINANCIERES = new Set([
    'paypal', 'stripe', 'wise', 'revolut', 'venmo', 'square',
    'chase', 'bankofamerica', 'wellsfargo', 'citibank', 'capitalone',
    'leumi', 'poalim', 'discount', 'mizrahi-tefahot', 'fibi',
    'creditagricole', 'bnpparibas', 'societegenerale', 'labanquepostale',
    'lcl', 'caisse-epargne', 'boursorama', 'creditmutuel', 'banquepopulaire',
    'creditlyonnais', 'hsbc', 'ing',
]);

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
                _cacheDomaineLie[racine] = racines;
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
 * @param {string} nomAffichageNormalise - Déjà normalisé (ASCII, minuscules)
 * @returns {{domaine: string, nomMarque: string}|null}
 */
function trouverMarqueUsurpee(nomAffichageNormalise) {
    if (!nomAffichageNormalise) return null;

    for (const domaine of DOMAINES_MARQUES) {
        if (nomAffichageNormalise.includes(domaine)) {
            return { domaine: domaine, nomMarque: extraireNomMarque(domaine) };
        }
    }

    // Deuxième passage : noms de marques seuls (ex : "paypal" sans .com)
    for (const domaine of DOMAINES_MARQUES) {
        const marque = extraireNomMarque(domaine);
        if (marque.length < 3) continue; // Ignorer les noms courts pour éviter les faux positifs
        const index = nomAffichageNormalise.indexOf(marque);
        if (index !== -1) {
            const avant = index > 0 ? nomAffichageNormalise[index - 1] : ' ';
            const apres = index + marque.length < nomAffichageNormalise.length
                ? nomAffichageNormalise[index + marque.length]
                : ' ';
            const estDelimiteur = (ch) => /[^a-z0-9]/.test(ch);
            if (estDelimiteur(avant) && estDelimiteur(apres)) {
                return { domaine: domaine, nomMarque: marque };
            }
        }
    }

    return null;
}

// ─── Détection de typosquatting (distance de Levenshtein) ──────────────

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function distanceLevenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const matrice = [];
    for (let i = 0; i <= b.length; i++) matrice[i] = [i];
    for (let j = 0; j <= a.length; j++) matrice[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cout = b[i - 1] === a[j - 1] ? 0 : 1;
            matrice[i][j] = Math.min(
                matrice[i - 1][j] + 1,
                matrice[i][j - 1] + 1,
                matrice[i - 1][j - 1] + cout
            );
        }
    }
    return matrice[b.length][a.length];
}

/**
 * Vérifie si le domaine de l'expéditeur ressemble à un domaine de marque connue (typosquatting).
 * Ex : "paypa1.com" ≈ "paypal.com", "arnazon.com" ≈ "amazon.com"
 * @param {string} racineExpediteur - Domaine racine de l'expéditeur (ex : "paypa1.com")
 * @returns {{domaine: string, nomMarque: string}|null}
 */
function verifierTyposquatting(racineExpediteur) {
    if (!racineExpediteur) return null;
    const nomExpediteur = racineExpediteur.split('.')[0];
    if (nomExpediteur.length < 3) return null;

    for (const domaine of DOMAINES_MARQUES) {
        const nomMarque = extraireNomMarque(domaine);
        if (nomMarque.length < 3) continue;

        // Ne pas vérifier si les noms sont identiques (c'est légitime)
        if (nomExpediteur === nomMarque) continue;

        // Seuil adaptatif : distance max 1 pour les noms courts, 2 pour les longs
        const seuilMax = nomMarque.length >= 6 ? 2 : 1;
        const distance = distanceLevenshtein(nomExpediteur, nomMarque);

        if (distance > 0 && distance <= seuilMax) {
            return { domaine: domaine, nomMarque: nomMarque };
        }
    }
    return null;
}
