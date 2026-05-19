/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Serveur.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Détecteur Phishing
 *  Rôle        : Contrôleur Web App et points d'accès RPC pour le Dashboard interactif.
 *  Version     : 2.2.0
 * ============================================================================
 */

/**
 * Point d'entrée de la Web App Google Apps Script.
 * Charge l'interface du Dashboard avec le bac à sable IFRAME et le support responsive.
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
      derniereAnalyse: stats.derniereAnalyse || 'Aucune analyse effectuée',
      tauxDetection: stats.totalAnalyses > 0 ? ((stats.totalUsurpations / stats.totalAnalyses) * 100).toFixed(1) + '%' : '0%'
    },
    triggers: {
      active: hasScanTrigger && hasReportTrigger,
      scanActive: hasScanTrigger,
      reportActive: hasReportTrigger
    },
    whitelist: listeBlanche,
    customBrands: customBrands,
    userEmail: getEmailProprietaire_(),
    lang: getLangueUtilisateur_()
  };
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
 * @returns {string[]} Liste blanche mise à jour
 */
function addWhitelistEntry(entree) {
  if (!entree) return getListeBlanche_();
  const nettoye = entree.trim().toLowerCase();
  ajouterALaListeBlanche(nettoye);
  return getListeBlanche_();
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
 * @returns {Array<{nomMarque: string, domaine: string}>} Liste mise à jour
 */
function addCustomBrand(nomMarque, domaine) {
  if (!nomMarque || !domaine) return getCustomBrands_();
  
  const nomNettoye = nomMarque.trim();
  const domaineNettoye = domaine.trim().toLowerCase();
  
  const customBrands = getCustomBrands_();
  const existe = customBrands.some(cb => cb.domaine === domaineNettoye);
  
  if (!existe) {
    customBrands.push({ nomMarque: nomNettoye, domaine: domaineNettoye });
    PropertiesService.getScriptProperties().setProperty(
      'customBrands', JSON.stringify(customBrands)
    );
    // Invalider l'index mémoire des marques pour forcer la reconstruction
    _indexMarques = null;
    Logger.log('Marque personnalisée ajoutée : ' + nomNettoye + ' (' + domaineNettoye + ')');
  }
  return customBrands;
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
