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
    ['bnpparibas.com', 'mabanque.bnpparibas.fr'],
    ['orange.fr', 'sosh.fr'],
    ['laposte.fr', 'colissimo.fr'],
    ['creditagricole.fr', 'ca-paris.fr', 'ca-centrest.fr'],
    ['societegenerale.fr', 'boursorama.com'],
    ['free.fr', 'iliad.fr'],
];

let _indexMarques = null;

/**
 * Construit un index des marques pour une recherche plus rapide (O(1) pour les noms).
 * Évite la double boucle O(n²) (Point 7).
 * @returns {{parDomaine: string[], parNom: Map<string, string>}}
 */
function getIndexMarques_() {
    if (_indexMarques) return _indexMarques;
    _indexMarques = { parDomaine: [], parNom: new Map() };
    for (const domaine of DOMAINES_MARQUES) {
        _indexMarques.parDomaine.push(domaine);
        const nom = extraireNomMarque(domaine);
        // Ne stocker que les noms de marques uniques et de longueur >= 3
        if (nom.length >= 3 && !_indexMarques.parNom.has(nom)) {
            _indexMarques.parNom.set(nom, domaine);
        }
    }
    return _indexMarques;
}

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

    const index = getIndexMarques_();

    // Premier passage : vérification du domaine complet
    for (const domaine of index.parDomaine) {
        if (nomAffichageNormalise.includes(domaine)) {
            return { domaine: domaine, nomMarque: extraireNomMarque(domaine) };
        }
    }

    // Deuxième passage : noms de marques seuls via l'index Map (Point 7)
    // On itère sur les marques indexées pour vérifier si elles sont présentes en tant que mot autonome
    for (const [nom, domaine] of index.parNom.entries()) {
        const pos = nomAffichageNormalise.indexOf(nom);
        if (pos !== -1) {
            const avant = pos > 0 ? nomAffichageNormalise[pos - 1] : ' ';
            const apres = pos + nom.length < nomAffichageNormalise.length
                ? nomAffichageNormalise[pos + nom.length] : ' ';
            const estDelimiteur = (ch) => /[^a-z0-9]/.test(ch);
            if (estDelimiteur(avant) && estDelimiteur(apres)) {
                return { domaine: domaine, nomMarque: nom };
            }
        }
    }

    return null;
}

// ─── Détection de typosquatting (distance de Levenshtein) ──────────────

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * Optimisé pour utiliser O(n) mémoire au lieu de O(n*m) (Point 2).
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
function verifierTyposquatting(racineExpediteur) {
    if (!racineExpediteur) return null;
    const nomExpediteur = racineExpediteur.split('.')[0];
    if (nomExpediteur.length < 3) return null;

    const index = getIndexMarques_();

    for (const [nomMarque, domaine] of index.parNom.entries()) {
        // Trop courts -> trop de faux positifs entre petites marques légitimes (Point 10)
        if (nomMarque.length < 4) continue;

        // Ne pas vérifier si les noms sont identiques
        if (nomExpediteur === nomMarque) continue;

        // Seuil adaptatif (Point 3)
        const seuilMax = nomMarque.length >= 6 ? 2 : 1;

        // Garde sur la différence de longueur pour éviter les comparaisons inutiles (Point 3)
        const diffLongueur = Math.abs(nomExpediteur.length - nomMarque.length);
        if (diffLongueur > seuilMax) continue;

        const distance = distanceLevenshtein(nomExpediteur, nomMarque);

        if (distance > 0 && distance <= seuilMax) {
            return { domaine: domaine, nomMarque: nomMarque };
        }
    }
    return null;
}
