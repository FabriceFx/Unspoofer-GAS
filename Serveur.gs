/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Serveur.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : Détecteur Phishing
 *  Rôle        : Contrôleur Web App et points d'accès RPC pour le Dashboard interactif.
 *  Version     : 2.5.2
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
  const stats = getStatistiques_();
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
    theme: getThemeUtilisateur_(),
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
 * Longueur au-delà de laquelle une saisie ne peut plus être un domaine ni une
 * adresse e-mail valide (RFC 5321 : 254 caractères).
 */
const LONGUEUR_MAX_SAISIE = 254;

/**
 * Forme attendue d'un nom de domaine. Même motif que la validation des listes
 * de référence (voir LISTES_MODIFIABLES dans Listes.gs) : au moins un point,
 * pas d'espace, pas de schéma d'URL.
 */
const FORMAT_DOMAINE = /^[a-z0-9][-a-z0-9]*(\.[a-z0-9][-a-z0-9]*)+$/;

/**
 * Ramène un paramètre reçu de `google.script.run` à une chaîne exploitable.
 *
 * Le client n'est pas une source de confiance : rien n'empêche un appel de
 * transmettre un nombre, un objet ou une chaîne de dix mille caractères. Les
 * points d'accès appelaient `.trim()` directement, ce qui lève une exception
 * sur tout ce qui n'est pas une chaîne.
 *
 * @param {*} valeur - Paramètre brut reçu du client.
 * @returns {string} Chaîne nettoyée, vide si la valeur est inexploitable.
 */
function texteRecu_(valeur) {
  if (typeof valeur !== 'string') return '';
  return valeur.trim().slice(0, LONGUEUR_MAX_SAISIE);
}

/**
 * Change la langue de l'interface et renvoie l'état complet du tableau de bord
 * dans la nouvelle langue.
 * @param {string} langue - 'fr', 'en', ou 'auto' pour suivre le compte Google.
 * @returns {Object} Données du tableau de bord, dictionnaire compris.
 */
function setLangue(langue) {
  const appliquee = definirLangueUtilisateur_(texteRecu_(langue));
  Logger.log('Langue de l\'interface : ' + appliquee);
  return getDashboardData();
}

/**
 * Change le thème de l'interface et renvoie l'état complet du tableau de bord.
 * @param {string} theme - 'auto', 'clair' ou 'sombre'
 * @returns {Object} Données du tableau de bord
 */
function setTheme(theme) {
  const applique = definirThemeUtilisateur_(texteRecu_(theme));
  Logger.log('Thème de l\'interface : ' + applique);
  return getDashboardData();
}

/**
 * Active ou désactive les déclencheurs temporels automatiques.
 * @param {boolean} active - Si true, configure les déclencheurs ; si false, les supprime.
 * @returns {boolean} Statut final d'activité
 */
function toggleTriggers(active) {
  // La cadence est définie une seule fois, dans Principal.gs.
  try {
    reinstallerDeclencheurs_(!!active);
  } catch (e) {
    Logger.log('ÉCHEC de toggleTriggers(' + active + ') : ' + e.message);
    throw new Error('Impossible de modifier les déclencheurs : ' + e.message);
  }

  Logger.log(active ? 'Déclencheurs activés via le Dashboard'
                    : 'Déclencheurs désactivés via le Dashboard');
  return !!active;
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
  const saisie = texteRecu_(entree).toLowerCase();
  if (!saisie) return { ok: false, motif: 'vide', liste: getListeBlanche_() };
  const resultat = ajouterALaListeBlanche(saisie);
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
  const cible = texteRecu_(entree).toLowerCase();
  if (!cible) return getListeBlanche_();
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
  const nomNettoye = texteRecu_(nomMarque);
  const domaineNettoye = texteRecu_(domaine).toLowerCase();
  if (!nomNettoye || !domaineNettoye) {
    return { ok: false, motif: 'vide', marques: getCustomBrands_() };
  }
  if (!FORMAT_DOMAINE.test(domaineNettoye)) {
    Logger.log('Domaine refusé (format) : ' + domaineNettoye);
    return { ok: false, motif: 'format', marques: getCustomBrands_() };
  }
  
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
  const cible = texteRecu_(domaine).toLowerCase();
  if (!cible) return getCustomBrands_();
  
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

// ─── Points d'accès de maintenance ─────────────────────────────────────

/**
 * Exécute le diagnostic des alertes et le renvoie au tableau de bord.
 *
 * Les dates sont converties en chaînes ISO : google.script.run ne transmet
 * pas les objets Date au client.
 *
 * @returns {{etiquetteExiste: boolean, filsEtiquetes: number,
 *            statUsurpations: number, ecart: number, exemples: Array<Object>}}
 */
function runDiagnostic() {
  Logger.log('Diagnostic lancé depuis le tableau de bord');
  const rapport = diagnostiquerAlertes();
  return {
    etiquetteExiste: rapport.etiquetteExiste,
    filsEtiquetes: rapport.filsEtiquetes,
    statUsurpations: rapport.statUsurpations,
    ecart: rapport.ecart,
    exemples: (rapport.exemples || []).map(function (e) {
      return {
        objet: e.objet,
        de: e.de,
        date: e.date ? new Date(e.date).toISOString() : '',
      };
    }),
  };
}

/**
 * Vide le cache des messages traités puis relance une analyse complète.
 * C'est l'action de reprise après un incident : étiquette supprimée,
 * messages désétiquetés, ou modification profonde des listes.
 * @returns {Object} État du tableau de bord après l'opération
 */
function runFullRescan() {
  Logger.log('Ré-analyse complète lancée depuis le tableau de bord');
  reanalyserBoiteReception();
  return getDashboardData();
}

/**
 * Remet les compteurs à zéro. Ne touche ni aux messages, ni aux étiquettes,
 * ni aux listes : seules les statistiques cumulées sont effacées.
 * @returns {Object} État du tableau de bord après remise à zéro
 */
function resetStats() {
  Logger.log('Remise à zéro des compteurs depuis le tableau de bord');
  reinitialiserStatistiques();
  return getDashboardData();
}

// ─── Points d'accès des listes de référence ────────────────────────────
// (getListesModifiables, ajouterEntreeListe, retirerEntreeListe et
//  reinitialiserListe sont définis dans Listes.gs et directement appelables.)

/**
 * Modifie une liste de référence et renvoie l'état complet du tableau de bord,
 * de sorte que l'interface se rafraîchisse d'un seul aller-retour.
 *
 * @param {string} operation - 'ajouter', 'retirer' ou 'reinitialiser'
 * @param {string} nomListe
 * @param {string} [valeur]
 * @returns {{ok: boolean, message: string, donnees: Object}}
 */
function modifierListeReference(operation, nomListe, valeur) {
  const op = texteRecu_(operation);
  const liste = texteRecu_(nomListe);
  const val = texteRecu_(valeur);

  let resultat;
  if (op === 'ajouter') resultat = ajouterEntreeListe(liste, val);
  else if (op === 'retirer') resultat = retirerEntreeListe(liste, val);
  else if (op === 'reinitialiser') resultat = reinitialiserListe(liste);
  else resultat = { ok: false, message: 'Opération inconnue : ' + op };

  return {
    ok: resultat.ok,
    message: resultat.message,
    donnees: getDashboardData(),
  };
}

/**
 * Remise à zéro complète depuis le tableau de bord.
 * @returns {Object} État du tableau de bord après reconstruction
 */
function runFullReset() {
  Logger.log('Remise à zéro complète lancée depuis le tableau de bord');
  const bilan = repartirDeZero();
  const donnees = getDashboardData();
  donnees.filsDesetiquetes = bilan.filsDesetiquetes;
  return donnees;
}
