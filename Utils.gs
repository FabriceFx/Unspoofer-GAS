/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Utils.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : Détecteur Phishing
 *  Rôle        : Utilitaires généraux côté serveur (helpers d'inclusion HTML, formatage, etc.).
 *  Version     : 2.4.0
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

/** Clé de stockage de la préférence de langue choisie dans le tableau de bord. */
const CLE_PROPRIETE_LANGUE = 'languePreferee';

/**
 * Plafond retenu pour une valeur de propriété de script.
 *
 * Apps Script limite chaque valeur à 9 Ko. On s'arrête un peu avant : dépasser
 * la limite lève une exception que le code appelant avalait dans un `catch`,
 * de sorte qu'un ajout échouait sans que rien ne l'indique à l'utilisateur.
 */
const MAX_OCTETS_PROPRIETE = 9000;

/**
 * Taille d'une chaîne en octets UTF-8.
 *
 * Calculée à la main plutôt que via Utilities.newBlob() : la fonction reste
 * ainsi exécutable hors Apps Script, donc testable.
 *
 * @param {string} chaine
 * @returns {number}
 */
function tailleOctets_(chaine) {
  let octets = 0;
  for (let i = 0; i < chaine.length; i++) {
    const code = chaine.charCodeAt(i);
    if (code < 0x80) octets += 1;
    else if (code < 0x800) octets += 2;
    else if (code >= 0xD800 && code <= 0xDBFF) { octets += 4; i++; }  // paire de substitution
    else octets += 3;
  }
  return octets;
}

/**
 * Écrit une propriété de script après avoir vérifié qu'elle tient dans le
 * plafond. Retourne un compte rendu au lieu de laisser échouer l'écriture.
 *
 * @param {string} cle
 * @param {string} valeur - Contenu sérialisé
 * @returns {{ok: boolean, taille: number, limite: number}}
 */
function ecrireProprieteLimitee_(cle, valeur) {
  const taille = tailleOctets_(valeur);
  if (taille > MAX_OCTETS_PROPRIETE) {
    Logger.log('Écriture refusée pour « ' + cle + ' » : ' + taille +
               ' octets pour un plafond de ' + MAX_OCTETS_PROPRIETE + '.');
    return { ok: false, taille: taille, limite: MAX_OCTETS_PROPRIETE };
  }
  PropertiesService.getScriptProperties().setProperty(cle, valeur);
  return { ok: true, taille: taille, limite: MAX_OCTETS_PROPRIETE };
}

/**
 * Détermine la langue à utiliser (FR ou EN), par ordre de priorité :
 *
 *   1. la préférence choisie explicitement dans le tableau de bord ;
 *   2. CONFIG.LANGUAGE, si elle impose 'fr' ou 'en' ;
 *   3. la langue du compte Google de l'utilisateur ;
 *   4. le français, par défaut.
 *
 * Historiquement, CONFIG.LANGUAGE valait "fr" : la condition étant toujours
 * vraie, les étapes suivantes n'étaient jamais atteintes et la moitié anglaise
 * des dictionnaires ne servait jamais. La valeur 'auto' lève ce blocage.
 *
 * @returns {string} 'fr' ou 'en'
 */
function getLangueUtilisateur_() {
  // 1. Préférence explicite de l'utilisateur
  try {
    const choisie = PropertiesService.getScriptProperties()
      .getProperty(CLE_PROPRIETE_LANGUE);
    if (choisie === 'fr' || choisie === 'en') return choisie;
  } catch (e) { /* propriétés indisponibles : on poursuit */ }

  // 2. Langue imposée par la configuration
  const configuree = (CONFIG.LANGUAGE || '').toLowerCase();
  if (configuree === 'fr' || configuree === 'en') return configuree;

  // 3. Langue du compte Google
  try {
    const locale = (Session.getActiveUserLocale() || '').toLowerCase();
    if (locale) return locale.startsWith('en') ? 'en' : 'fr';
  } catch (e) { /* locale indisponible */ }

  // 4. Repli
  return 'fr';
}

/**
 * Enregistre la langue choisie par l'utilisateur dans le tableau de bord.
 * @param {string} langue - 'fr', 'en', ou 'auto' pour revenir à la détection.
 * @returns {string} La langue effectivement appliquée après enregistrement.
 */
function definirLangueUtilisateur_(langue) {
  const proprietes = PropertiesService.getScriptProperties();
  if (langue === 'fr' || langue === 'en') {
    proprietes.setProperty(CLE_PROPRIETE_LANGUE, langue);
  } else {
    proprietes.deleteProperty(CLE_PROPRIETE_LANGUE);
  }
  return getLangueUtilisateur_();
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
