/**
 * Enveloppe PropertiesService pour le suivi des ID de messages traités.
 * Utilise un tableau JSON stocké dans les propriétés du script avec une fenêtre glissante.
 */

const CLE_CACHE = 'processedMessageIds';
const MAX_IDS_CACHES = 10000;

/** @type {Set<string>|null} */
let _ensembleTraite = null;
/** @type {string[]|null} */
let _listeTraite = null;
let _cacheModifie = false;

/**
 * Charge le cache des ID traités depuis les propriétés du script (une fois par exécution).
 */
function chargerCache_() {
    if (_ensembleTraite !== null) return;
    const brut = PropertiesService.getScriptProperties().getProperty(CLE_CACHE);
    _listeTraite = brut ? JSON.parse(brut) : [];
    _ensembleTraite = new Set(_listeTraite);
}

/**
 * Vérifie si un ID de message a déjà été traité.
 * @param {string} id
 * @returns {boolean}
 */
function estTraite(id) {
    chargerCache_();
    return _ensembleTraite.has(id);
}

/**
 * Marque un ID de message comme traité (par lots — appeler viderCache() à la fin de l'exécution).
 * @param {string} id
 */
function marquerCommeTraite(id) {
    chargerCache_();
    if (!_ensembleTraite.has(id)) {
        _ensembleTraite.add(id);
        _listeTraite.push(id);
        _cacheModifie = true;
    }
}

/**
 * Écrit le cache dans les propriétés du script. Appeler une fois à la fin de l'analyse.
 */
function viderCache() {
    if (!_cacheModifie || !_listeTraite) return;

    // Élaguer si la limite est dépassée — conserver les ID les plus récents
    if (_listeTraite.length > MAX_IDS_CACHES) {
        _listeTraite = _listeTraite.slice(_listeTraite.length - MAX_IDS_CACHES);
        _ensembleTraite = new Set(_listeTraite);
    }

    PropertiesService.getScriptProperties().setProperty(CLE_CACHE, JSON.stringify(_listeTraite));
    _cacheModifie = false;
}

/**
 * Efface tout le cache des ID traités.
 */
function effacerCacheTraite() {
    PropertiesService.getScriptProperties().deleteProperty(CLE_CACHE);
    _ensembleTraite = null;
    _listeTraite = null;
    _cacheModifie = false;
}