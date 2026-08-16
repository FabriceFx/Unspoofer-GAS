/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Serveur.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : Détecteur Phishing
 *  Rôle        : Contrôleur Web App et points d'accès RPC pour le Dashboard interactif.
 *  Version     : 2.4.0
 * ============================================================================
 */

/**
 * Point d'entrée de la Web App Google Apps Script.
 * Charge l'interface du Dashboard avec le bac à sable IFRAME et le support responsive.
 * @param {Object} e - Paramètres de la requête HTTP GET fournis par Apps Script
 *   (non utilisés : le tableau de bord n'accepte aucun paramètre d'URL).
 * @returns {HtmlOutput} La page du tableau de bord, prête à être servie.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setTitle(CONFIG.PROJECT_NAME + ' — Tableau de Bord')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Récupère l'ensemble des données d'état pour alimenter l'interface utilisateur.
 * @returns {Object} Données d'état du Dashboard
 */
function getDashboardData() {
  const langue = getLangueUtilisateur_();
  const stats = getStatistiques();
  const listeBlanche = getListeBlanche_();
  const customBrands = getCustomBrands_();
  const triggers = ScriptApp.getProjectTriggers();
  
  const hasScanTrigger = triggers.some(t => t.getHandlerFunction() === 'analyserBoiteReception');
  const hasReportTrigger = triggers.some(t => t.getHandlerFunction() === 'envoyerRapportHebdomadaire_');

  return {
    projectName: CONFIG.PROJECT_NAME,
    version: CONFIG.VERSION,
    stats: {
      totalAnalyses: stats.totalAnalyses || 0,
      totalUsurpations: stats.totalUsurpations || 0,
      totalExecutions: stats.totalExecutions || 0,
      // Date ISO brute : la mise en forme et la traduction reviennent au client,
      // qui connaît la langue et le fuseau de l'utilisateur.
      derniereAnalyse: stats.derniereAnalyse || '',
      tauxDetection: stats.totalAnalyses > 0 ? ((stats.totalUsurpations / stats.totalAnalyses) * 100).toFixed(1) + '%' : '0%'
    },
    triggers: {
      active: hasScanTrigger && hasReportTrigger,
      scanActive: hasScanTrigger,
      reportActive: hasReportTrigger
    },
    whitelist: listeBlanche,
    customBrands: customBrands,
    // Listes de référence modifiables depuis l'interface (voir Listes.gs)
    listesModifiables: getListesModifiables(),
    // Contrôle de cohérence : un compteur positif sans aucune alerte visible
    // dans Gmail signifie que la protection ne fait plus ce qu'elle annonce.
    sante: verifierCoherenceEtiquette_(),
    userEmail: getEmailProprietaire_(),
    lang: langue,
    // Dictionnaire de l'interface, appliqué côté client via data-i18n
    i18n: UI_TRANSLATIONS[langue] || UI_TRANSLATIONS.fr
  };
}

/**
 * Vérifie que les alertes annoncées par les compteurs sont bien retrouvables
 * dans Gmail.
 *
 * Deux incidents observés en usage réel : l'étiquette supprimée depuis Gmail
 * (ce qui la retire de tous les messages) et les messages signalés effacés
 * depuis. Dans les deux cas, le tableau de bord affichait un total rassurant
 * sans que rien ne soit consultable.
 *
 * @returns {{etiquetteExiste: boolean, alertesVisibles: boolean}}
 */
function verifierCoherenceEtiquette_() {
  try {
    const etiquette = GmailApp.getUserLabelByName(NOM_ETIQUETTE);
    if (!etiquette) return { etiquetteExiste: false, alertesVisibles: false };
    // Recherche volontairement limitée à un résultat : on veut savoir s'il en
    // existe au moins un, pas les dénombrer.
    const trouve = GmailApp.search('label:' + NOM_ETIQUETTE, 0, 1);
    return { etiquetteExiste: true, alertesVisibles: trouve.length > 0 };
  } catch (e) {
    Logger.log('Contrôle de cohérence impossible : ' + e.message);
    return { etiquetteExiste: true, alertesVisibles: true };
  }
}

/**
 * Change la langue de l'interface et renvoie l'état complet du tableau de bord
 * dans la nouvelle langue.
 * @param {string} langue - 'fr', 'en', ou 'auto' pour suivre le compte Google.
 * @returns {Object} Données du tableau de bord, dictionnaire compris.
 */
function setLangue(langue) {
  const appliquee = definirLangueUtilisateur_(langue);
  Logger.log('Langue de l\'interface : ' + appliquee);
  return getDashboardData();
}

/**
 * Active ou désactive les déclencheurs temporels automatiques.
 * @param {boolean} active - Si true, configure les déclencheurs ; si false, les supprime.
 * @returns {boolean} Statut final d'activité
 */
function toggleTriggers(active) {
  const declencheurs = ScriptApp.getProjectTriggers();
  for (const declencheur of declencheurs) {
    const handler = declencheur.getHandlerFunction();
    if (handler === 'analyserBoiteReception' || handler === 'envoyerRapportHebdomadaire_') {
      ScriptApp.deleteTrigger(declencheur);
    }
  }

  if (active) {
    // Configurer à nouveau (chaque 10 min et chaque lundi)
    ScriptApp.newTrigger('analyserBoiteReception')
      .timeBased()
      .everyMinutes(10)
      .create();

    ScriptApp.newTrigger('envoyerRapportHebdomadaire_')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(ScriptApp.WeekDay.MONDAY)
      .atHour(9)
      .create();
    
    Logger.log('Déclencheurs activés via le Dashboard');
    return true;
  } else {
    Logger.log('Déclencheurs désactivés via le Dashboard');
    return false;
  }
}

/**
 * Lance un scan manuel immédiat de la boîte de réception.
 * @returns {Object} Nouvelles statistiques après le scan
 */
function runManualScan() {
  Logger.log('Scan manuel initié depuis le Dashboard');
  analyserBoiteReception();
  return getDashboardData();
}

/**
 * Exécute la suite complète de 20 tests unitaires d'Unspoofer.
 * @returns {Object} Rapport des résultats des tests
 */
function runUnitTests() {
  Logger.log('Exécution des tests unitaires initiée depuis le Dashboard');
  return testerDetection(true);
}

// ─── Whitelist Endpoints ───────────────────────────────────────────────

/**
 * Ajoute un domaine ou une adresse e-mail à la liste blanche.
 * @param {string} entree
 * @returns {{ok: boolean, motif: string, liste: string[]}} Compte rendu et
 *   liste blanche à jour. `motif` vaut 'ajout', 'doublon', 'vide' ou 'plafond'.
 */
function addWhitelistEntry(entree) {
  if (!entree) return { ok: false, motif: 'vide', liste: getListeBlanche_() };
  const resultat = ajouterALaListeBlanche(entree.trim().toLowerCase());
  return {
    ok: resultat.ok,
    motif: resultat.motif,
    liste: getListeBlanche_(),
  };
}

/**
 * Supprime un domaine ou une adresse e-mail de la liste blanche.
 * @param {string} entree
 * @returns {string[]} Liste blanche mise à jour
 */
function removeWhitelistEntry(entree) {
  if (!entree) return getListeBlanche_();
  const cible = entree.trim().toLowerCase();
  const liste = getListeBlanche_();
  const index = liste.indexOf(cible);
  if (index !== -1) {
    liste.splice(index, 1);
    PropertiesService.getScriptProperties().setProperty(
      CLE_PROPRIETE_LISTE_BLANCHE, JSON.stringify(liste)
    );
    // Vider le cache de l'exécution
    _cacheListeBlanche = liste;
    Logger.log('Supprimé de la liste blanche : ' + cible);
  }
  return liste;
}

// ─── Custom Brands Endpoints ───────────────────────────────────────────

/**
 * Récupère la liste des marques personnalisées stockée en propriétés.
 * @returns {Array<{nomMarque: string, domaine: string}>}
 */
function getCustomBrands_() {
  try {
    const brut = PropertiesService.getScriptProperties().getProperty('customBrands');
    return brut ? JSON.parse(brut) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Ajoute une marque personnalisée à surveiller dynamiquement.
 * @param {string} nomMarque - Nom de la marque (ex: 'MonEntreprise')
 * @param {string} domaine - Domaine racine légitime (ex: 'monentreprise.fr')
 * @returns {{ok: boolean, motif: string, marques: Array<Object>}} Compte rendu
 *   et liste à jour. `motif` vaut 'ajout', 'doublon' ou 'plafond'.
 */
function addCustomBrand(nomMarque, domaine) {
  if (!nomMarque || !domaine) return { ok: false, motif: 'vide', marques: getCustomBrands_() };
  
  const nomNettoye = nomMarque.trim();
  const domaineNettoye = domaine.trim().toLowerCase();
  
  const customBrands = getCustomBrands_();
  const existe = customBrands.some(cb => cb.domaine === domaineNettoye);
  
  if (existe) return { ok: true, motif: 'doublon', marques: customBrands };

  // Liste candidate construite à part : si l'écriture est refusée, l'état
  // en mémoire ne doit pas diverger de celui réellement stocké.
  const candidate = customBrands.concat([{ nomMarque: nomNettoye, domaine: domaineNettoye }]);
  const ecriture = ecrireProprieteLimitee_('customBrands', JSON.stringify(candidate));
  if (!ecriture.ok) {
    Logger.log('Marques personnalisées pleines — « ' + nomNettoye + ' » non ajouté.');
    return { ok: false, motif: 'plafond', marques: customBrands };
  }

  // Invalider l'index mémoire des marques pour forcer la reconstruction
  _indexMarques = null;
  Logger.log('Marque personnalisée ajoutée : ' + nomNettoye + ' (' + domaineNettoye + ')');
  return { ok: true, motif: 'ajout', marques: candidate };
}

/**
 * Supprime une marque personnalisée de la surveillance.
 * @param {string} domaine - Domaine de la marque à supprimer
 * @returns {Array<{nomMarque: string, domaine: string}>} Liste mise à jour
 */
function removeCustomBrand(domaine) {
  if (!domaine) return getCustomBrands_();
  
  const cible = domaine.trim().toLowerCase();
  let customBrands = getCustomBrands_();
  const tailleInitiale = customBrands.length;
  
  customBrands = customBrands.filter(cb => cb.domaine !== cible);
  
  if (customBrands.length !== tailleInitiale) {
    PropertiesService.getScriptProperties().setProperty(
      'customBrands', JSON.stringify(customBrands)
    );
    // Invalider l'index mémoire des marques
    _indexMarques = null;
    Logger.log('Marque personnalisée supprimée : ' + cible);
  }
  return customBrands;
}
