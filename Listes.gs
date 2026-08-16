/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Listes.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : Détecteur Phishing
 *  Rôle        : Listes de référence modifiables sans redéploiement du code.
 *  Version     : 2.4.0
 * ============================================================================
 */

/**
 * Certaines listes du moteur doivent pouvoir évoluer plus vite que le code.
 *
 * Une plateforme d'emailing apparaît, une entreprise porte le même nom qu'une
 * marque surveillée : l'utilisateur doit pouvoir corriger le comportement
 * depuis le tableau de bord, sans attendre une nouvelle version ni toucher
 * aux fichiers .gs.
 *
 * Chaque liste combine trois couches :
 *   1. les valeurs par défaut, livrées avec le code ;
 *   2. les ajouts de l'utilisateur ;
 *   3. les retraits de l'utilisateur, qui l'emportent sur les deux premières.
 *
 * Les retraits sont conservés explicitement : sans eux, il serait impossible
 * de désactiver une valeur par défaut, et une mise à jour du code la
 * réintroduirait silencieusement.
 */

/** Préfixe des clés de stockage dans ScriptProperties. */
const PREFIXE_CLE_LISTE = 'liste_';

/**
 * Registre des listes modifiables.
 *
 * `defauts` est une fonction : les constantes correspondantes sont déclarées
 * dans d'autres fichiers, et l'évaluation doit rester paresseuse.
 */
const LISTES_MODIFIABLES = {

    plateformesTierces: {
        libelle: 'Plateformes d\'envoi tierces',
        description: 'Services d\'emailing et de billetterie qui utilisent ' +
            'légitimement une adresse de réponse différente de leur domaine ' +
            'd\'envoi. Y figurer évite une alerte « Reply-To divergent ».',
        exemple: 'sendgrid.net',
        defauts: () => PLATEFORMES_ENVOI_TIERS_DEFAUT,
        normaliser: (v) => String(v || '').trim().toLowerCase().replace(/^@/, ''),
        valider: (v) => /^[a-z0-9][-a-z0-9]*(\.[a-z0-9][-a-z0-9]*)+$/.test(v),
        messageInvalide: 'Attendu : un nom de domaine, par exemple « sendgrid.net ».',
    },

    marquesAmbigues: {
        libelle: 'Libellés de marque ambigus',
        description: 'Noms de marque qui sont aussi des mots courants. Une ' +
            'correspondance sur ces seuls libellés ne suffit pas à conclure ' +
            'à une usurpation : une corroboration est exigée.',
        exemple: 'boulanger',
        defauts: () => MARQUES_AMBIGUES_DEFAUT,
        normaliser: (v) => String(v || '').trim().toLowerCase(),
        valider: (v) => /^[a-z0-9][-a-z0-9]{1,}$/.test(v),
        messageInvalide: 'Attendu : un libellé de marque seul, sans extension, ' +
            'par exemple « orange ».',
    },

};

/** Cache par exécution : { nomListe: Set } */
let _cacheListes = null;

/**
 * Vide le cache mémoire des listes.
 * À appeler après toute écriture, et après ajout ou retrait d'une marque
 * personnalisée : l'index des marques dépend de la liste des libellés ambigus.
 */
function invaliderCacheListes_() {
    _cacheListes = null;
    _indexMarques = null;
}

/**
 * Lit les modifications utilisateur d'une liste.
 * @param {string} nom - Clé dans LISTES_MODIFIABLES
 * @returns {{ajouts: string[], retraits: string[]}}
 */
function getModificationsListe_(nom) {
    const vide = { ajouts: [], retraits: [] };
    try {
        const brut = PropertiesService.getScriptProperties()
            .getProperty(PREFIXE_CLE_LISTE + nom);
        if (!brut) return vide;
        const donnees = JSON.parse(brut);
        return {
            ajouts: Array.isArray(donnees.ajouts) ? donnees.ajouts : [],
            retraits: Array.isArray(donnees.retraits) ? donnees.retraits : [],
        };
    } catch (e) {
        Logger.log('Liste « ' + nom +' » illisible, retour aux valeurs par défaut : ' + e.message);
        return vide;
    }
}

/**
 * Écrit les modifications utilisateur d'une liste.
 * @param {string} nom
 * @param {{ajouts: string[], retraits: string[]}} modifications
 */
function setModificationsListe_(nom, modifications) {
    PropertiesService.getScriptProperties().setProperty(
        PREFIXE_CLE_LISTE + nom, JSON.stringify(modifications)
    );
    invaliderCacheListes_();
}

/**
 * Retourne la liste effective : défauts + ajouts − retraits.
 * Résultat mis en cache pour la durée de l'exécution.
 *
 * @param {string} nom - Clé dans LISTES_MODIFIABLES
 * @returns {Set<string>}
 */
function getListeEffective_(nom) {
    if (!_cacheListes) _cacheListes = {};
    if (_cacheListes[nom]) return _cacheListes[nom];

    const definition = LISTES_MODIFIABLES[nom];
    if (!definition) {
        Logger.log('Liste inconnue : ' + nom);
        return new Set();
    }

    const effective = new Set(definition.defauts());
    const modifications = getModificationsListe_(nom);

    for (const valeur of modifications.ajouts) effective.add(valeur);
    for (const valeur of modifications.retraits) effective.delete(valeur);

    _cacheListes[nom] = effective;
    return effective;
}

// ─── Points d'accès pour le tableau de bord ────────────────────────────────

/**
 * Décrit une liste et son contenu courant, pour affichage dans l'interface.
 *
 * @param {string} nom
 * @returns {{nom: string, libelle: string, description: string, exemple: string,
 *            entrees: Array<{valeur: string, origine: string}>}|null}
 */
function getListeModifiable(nom) {
    const definition = LISTES_MODIFIABLES[nom];
    if (!definition) return null;

    const defauts = new Set(definition.defauts());
    const modifications = getModificationsListe_(nom);
    const retraits = new Set(modifications.retraits);

    const entrees = [];
    for (const valeur of defauts) {
        entrees.push({
            valeur: valeur,
            origine: retraits.has(valeur) ? 'defaut_desactive' : 'defaut',
        });
    }
    for (const valeur of modifications.ajouts) {
        if (!defauts.has(valeur)) entrees.push({ valeur: valeur, origine: 'ajout' });
    }
    entrees.sort((a, b) => a.valeur.localeCompare(b.valeur));

    return {
        nom: nom,
        libelle: definition.libelle,
        description: definition.description,
        exemple: definition.exemple,
        entrees: entrees,
    };
}

/**
 * Retourne toutes les listes modifiables, pour alimenter le tableau de bord.
 * @returns {Array<Object>}
 */
function getListesModifiables() {
    return Object.keys(LISTES_MODIFIABLES).map(getListeModifiable);
}

/**
 * Ajoute une valeur à une liste, ou réactive une valeur par défaut retirée.
 *
 * @param {string} nom - Clé dans LISTES_MODIFIABLES
 * @param {string} valeur
 * @returns {{ok: boolean, message: string, liste: Object|null}}
 */
function ajouterEntreeListe(nom, valeur) {
    const definition = LISTES_MODIFIABLES[nom];
    if (!definition) return { ok: false, message: 'Liste inconnue : ' + nom, liste: null };

    const propre = definition.normaliser(valeur);
    if (!propre) {
        return { ok: false, message: 'Valeur vide.', liste: getListeModifiable(nom) };
    }
    if (!definition.valider(propre)) {
        return { ok: false, message: definition.messageInvalide, liste: getListeModifiable(nom) };
    }

    const modifications = getModificationsListe_(nom);
    const estDefaut = new Set(definition.defauts()).has(propre);

    // Réactivation d'une valeur par défaut précédemment retirée
    const positionRetrait = modifications.retraits.indexOf(propre);
    if (positionRetrait !== -1) modifications.retraits.splice(positionRetrait, 1);

    if (!estDefaut && modifications.ajouts.indexOf(propre) === -1) {
        modifications.ajouts.push(propre);
    }

    setModificationsListe_(nom, modifications);
    Logger.log('Liste « ' + nom + ' » : ajout de « ' + propre + ' »');
    return { ok: true, message: '« ' + propre + ' » ajouté.', liste: getListeModifiable(nom) };
}

/**
 * Retire une valeur d'une liste. Une valeur par défaut est neutralisée par un
 * retrait explicite, de sorte qu'une mise à jour du code ne la réintroduise pas.
 *
 * @param {string} nom - Clé dans LISTES_MODIFIABLES
 * @param {string} valeur
 * @returns {{ok: boolean, message: string, liste: Object|null}}
 */
function retirerEntreeListe(nom, valeur) {
    const definition = LISTES_MODIFIABLES[nom];
    if (!definition) return { ok: false, message: 'Liste inconnue : ' + nom, liste: null };

    const propre = definition.normaliser(valeur);
    const modifications = getModificationsListe_(nom);

    const positionAjout = modifications.ajouts.indexOf(propre);
    if (positionAjout !== -1) modifications.ajouts.splice(positionAjout, 1);

    const estDefaut = new Set(definition.defauts()).has(propre);
    if (estDefaut && modifications.retraits.indexOf(propre) === -1) {
        modifications.retraits.push(propre);
    }

    setModificationsListe_(nom, modifications);
    Logger.log('Liste « ' + nom + ' » : retrait de « ' + propre + ' »');
    return { ok: true, message: '« ' + propre + ' » retiré.', liste: getListeModifiable(nom) };
}

/**
 * Annule toutes les modifications d'une liste et revient aux valeurs livrées.
 *
 * @param {string} nom
 * @returns {{ok: boolean, message: string, liste: Object|null}}
 */
function reinitialiserListe(nom) {
    if (!LISTES_MODIFIABLES[nom]) {
        return { ok: false, message: 'Liste inconnue : ' + nom, liste: null };
    }
    PropertiesService.getScriptProperties().deleteProperty(PREFIXE_CLE_LISTE + nom);
    invaliderCacheListes_();
    Logger.log('Liste « ' + nom + ' » réinitialisée');
    return { ok: true, message: 'Liste réinitialisée.', liste: getListeModifiable(nom) };
}
