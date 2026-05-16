/**
 * Liste des marques/domaines et logique de correspondance pour la détection d'usurpation.
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

    // Expédition
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

    // E-commerce
    'ebay.com', 'aliexpress.com', 'etsy.com',
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
];

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
        // Vérifier la correspondance du domaine complet (ex : "wix.com" dans le nom d'affichage)
        if (nomAffichageNormalise.includes(domaine)) {
            return { domaine: domaine, nomMarque: extraireNomMarque(domaine) };
        }
    }

    // Deuxième passage : vérifier les noms de marques seuls (ex : "paypal" sans .com)
    // Ne faire correspondre que les noms de marques qui ressemblent à des mots autonomes
    for (const domaine of DOMAINES_MARQUES) {
        const marque = extraireNomMarque(domaine);
        if (marque.length < 2) continue; // Ignorer les noms d'un seul caractère comme "x" pour éviter les faux positifs
        const index = nomAffichageNormalise.indexOf(marque);
        if (index !== -1) {
            // Vérification élémentaire de délimiteur de mot : la marque ne doit pas être une sous-chaîne d'un mot plus long
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
