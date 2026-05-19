/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Cache.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Détecteur Phishing
 *  Rôle        : Routines de stockage temporaire et gestion de cache de haute performance.
 *  Version     : 2.1.0
 * ============================================================================
 */

/**
 * Enveloppe PropertiesService pour le suivi des ID de messages traités.
 * Utilise un tableau JSON stocké dans les propriétés du script avec une fenêtre glissante.
 */

const CLE_CACHE = 'processedMessageIds';
const CLE_STATS = 'unspooferStats';
// Limite étendue à 500 grâce à la compression de stockage brute.
// Un ID Gmail (16 hex chars) + 1 virgule = 17 octets. 500 IDs ≈ 8.5 KB.
const MAX_IDS_CACHES = 500;

/** @type {Set<string>|null} */
let _ensembleTraite = null;
/** @type {string[]|null} */
let _listeTraite = null;
let _cacheModifie = false;

/**
 * Charge le cache des ID traités depuis les propriétés du script (rétrocompatible JSON).
 */
function chargerCache_() {
    if (_ensembleTraite !== null) return;
    try {
        const brut = PropertiesService.getScriptProperties().getProperty(CLE_CACHE);
        if (brut) {
            if (brut.startsWith('[')) {
                // Migration : ancien format JSON array
                _listeTraite = JSON.parse(brut);
            } else {
                // Nouveau format compressé brute
                _listeTraite = brut.split(',');
            }
        } else {
            _listeTraite = [];
        }
    } catch (e) {
        _listeTraite = [];
    }
    _ensembleTraite = new Set(_listeTraite);
}

/**
 * Vérifie si un ID de message a déjà été traité.
 * Optimisé avec double couche RAM (Set exécution + CacheService script).
 * @param {string} id
 * @returns {boolean}
 */
function estTraite(id) {
    // 1. Couche mémoire de l'exécution actuelle (O(1))
    if (_ensembleTraite !== null && _ensembleTraite.has(id)) {
        return true;
    }

    // 2. Couche CacheService (RAM partagée Apps Script, ultra-rapide)
    try {
        const cached = CacheService.getScriptCache().get('msg_' + id);
        if (cached === '1') {
            if (_ensembleTraite === null) {
                _ensembleTraite = new Set();
                _listeTraite = [];
            }
            if (!_ensembleTraite.has(id)) {
                _ensembleTraite.add(id);
                _listeTraite.push(id);
            }
            return true;
        }
    } catch (e) {
        Logger.log('Erreur CacheService.get : ' + e.message);
    }

    // 3. Couche persistante ScriptProperties (Disque lent)
    chargerCache_();
    return _ensembleTraite.has(id);
}

/**
 * Marque un ID de message comme traité (RAM + CacheService + file d'attente d'écriture).
 * @param {string} id
 */
function marquerCommeTraite(id) {
    chargerCache_();
    if (!_ensembleTraite.has(id)) {
        _ensembleTraite.add(id);
        _listeTraite.push(id);
        _cacheModifie = true;

        // Écriture immédiate en cache RAM partagé (TTL max 6h = 21600s)
        try {
            CacheService.getScriptCache().put('msg_' + id, '1', 21600);
        } catch (e) {
            Logger.log('Erreur CacheService.put : ' + e.message);
        }
    }
}

/**
 * Écrit le cache compacté dans les ScriptProperties à la fin de l'analyse.
 */
function persisterCache() {
    if (!_cacheModifie || !_listeTraite) return;

    if (_listeTraite.length > MAX_IDS_CACHES) {
        _listeTraite = _listeTraite.slice(_listeTraite.length - MAX_IDS_CACHES);
        _ensembleTraite = new Set(_listeTraite);
    }

    try {
        PropertiesService.getScriptProperties().setProperty(CLE_CACHE, _listeTraite.join(','));
        _cacheModifie = false;
    } catch (e) {
        Logger.log('ERREUR persisterCache : ' + e.message);
        // Tentative de repli d'urgence
        _listeTraite = _listeTraite.slice(_listeTraite.length - Math.floor(MAX_IDS_CACHES / 2));
        _ensembleTraite = new Set(_listeTraite);
        try {
            PropertiesService.getScriptProperties().setProperty(CLE_CACHE, _listeTraite.join(','));
            _cacheModifie = false;
        } catch (e2) {
            Logger.log('ERREUR critique persisterCache (repli) : ' + e2.message);
        }
    }
}

/**
 * Efface le cache persistant et RAM.
 */
function effacerCacheTraite() {
    PropertiesService.getScriptProperties().deleteProperty(CLE_CACHE);
    _ensembleTraite = null;
    _listeTraite = null;
    _cacheModifie = false;
}

// ─── Statistiques persistantes ─────────────────────────────────────────

/**
 * Incrémente les statistiques cumulées après chaque analyse.
 * @param {number} analyses - Nombre de messages analysés cette exécution
 * @param {number} usurpations - Nombre d'usurpations détectées cette exécution
 */
function incrementerStatistiques_(analyses, usurpations) {
    try {
        const stats = getStatistiques();
        stats.totalAnalyses += analyses;
        stats.totalUsurpations += usurpations;
        stats.totalExecutions += 1;
        stats.derniereAnalyse = new Date().toISOString();
        PropertiesService.getScriptProperties().setProperty(CLE_STATS, JSON.stringify(stats));
    } catch (e) {
        Logger.log('Erreur lors de la mise à jour des statistiques : ' + e.message);
    }
}

/**
 * Retourne les statistiques cumulées d'Unspoofer.
 * Point 8 : Ajout du snapshot hebdomadaire.
 * @returns {{totalAnalyses: number, totalUsurpations: number, totalExecutions: number, derniereAnalyse: string, snapshotHebdo: {analyses: number, usurpations: number, date: string}}}
 */
function getStatistiques() {
    let stats = {
        totalAnalyses: 0,
        totalUsurpations: 0,
        totalExecutions: 0,
        derniereAnalyse: '',
        snapshotHebdo: { analyses: 0, usurpations: 0, date: '' }
    };
    try {
        const brut = PropertiesService.getScriptProperties().getProperty(CLE_STATS);
        if (brut) {
            const charge = JSON.parse(brut);
            // Fusionner avec les valeurs par défaut pour les nouveaux champs
            stats = Object.assign(stats, charge);
        }
    } catch (e) { /* ignore */ }
    return stats;
}

/**
 * Sauvegarde l'état actuel des statistiques pour le calcul des deltas hebdomadaires.
 */
function sauvegarderSnapshotHebdo_() {
    try {
        const stats = getStatistiques();
        stats.snapshotHebdo = {
            analyses: stats.totalAnalyses,
            usurpations: stats.totalUsurpations,
            date: new Date().toISOString()
        };
        PropertiesService.getScriptProperties().setProperty(CLE_STATS, JSON.stringify(stats));
    } catch (e) {
        Logger.log('Erreur sauvegarde snapshot hebdo : ' + e.message);
    }
}

/**
 * Affiche les statistiques cumulées dans le journal d'exécution.
 */
function afficherStatistiques() {
    const stats = getStatistiques();
    Logger.log('=== Statistiques Unspoofer ===');
    Logger.log('Total messages analysés : ' + stats.totalAnalyses);
    Logger.log('Total usurpations détectées : ' + stats.totalUsurpations);
    Logger.log('Total exécutions : ' + stats.totalExecutions);
    Logger.log('Dernière analyse : ' + (stats.derniereAnalyse || 'jamais'));
}

/**
 * Réinitialise les statistiques cumulées.
 */
function reinitialiserStatistiques() {
    PropertiesService.getScriptProperties().deleteProperty(CLE_STATS);
    Logger.log('Statistiques réinitialisées.');
}