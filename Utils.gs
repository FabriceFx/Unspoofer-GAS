/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Utils.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Détecteur Phishing
 *  Rôle        : Utilitaires généraux côté serveur (helpers d'inclusion HTML, formatage, etc.).
 *  Version     : 2.1.0
 * ============================================================================
 */

/**
 * Utils.gs — Fonctions utilitaires d'aide pour Unspoofer.
 */

/**
 * Récupère l'adresse e-mail du propriétaire actuel de manière fiable.
 * @returns {string}
 */
function getEmailProprietaire_() {
  try {
    return Session.getEffectiveUser().getEmail() ||
           Session.getActiveUser().getEmail() ||
           "";
  } catch (e) {
    return "";
  }
}

/**
 * Retourne la fenêtre d'analyse en jours (configurable via ScriptProperties).
 * @returns {number}
 */
function getFenetreAnalyse_() {
  try {
    const val = PropertiesService.getScriptProperties().getProperty('fenetreAnalyseJours');
    return parseInt(val, 10) || 7;
  } catch (e) {
    return 7;
  }
}

/**
 * Détermine de manière robuste la langue à utiliser (FR ou EN) pour l'utilisateur.
 * @returns {string} 'fr' ou 'en'
 */
function getLangueUtilisateur_() {
  if (CONFIG.LANGUAGE) {
    return CONFIG.LANGUAGE.toLowerCase() === 'en' ? 'en' : 'fr';
  }
  try {
    const locale = (Session.getActiveUserLocale() || 'fr').toLowerCase();
    return locale.startsWith('en') ? 'en' : 'fr';
  } catch (e) {
    return 'fr';
  }
}

/**
 * Échappe les caractères HTML sensibles pour éviter les injections dans les e-mails.
 * @param {string} str - Chaîne à échapper.
 * @returns {string} Chaîne sécurisée.
 */
function echapHtml_(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Tronque une chaîne à la longueur maximale spécifiée en ajoutant des points de suspension.
 * @param {string} s - Chaîne à tronquer.
 * @param {number} max - Longueur maximale.
 * @returns {string} Chaîne tronquée.
 */
function tronquerChaine_(s, max) {
  return s && s.length > max ? s.slice(0, max) + '…' : (s || '');
}
