/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Config.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : FF Labs - Détecteur Phishing
 *  Rôle        : Centralisation des constantes globales, des variables d'environnement et de configuration.
 *  Version     : 2.1.0
 * ============================================================================
 */

/**
 * Config.gs — Configuration centralisée et dictionnaire bilingue pour Unspoofer.
 */

const CONFIG = {
  PROJECT_NAME: "Unspoofer",
  VERSION: "2.1.0",
  LANGUAGE: "fr",           /* Langue par défaut ('fr' ou 'en') */
  COLORS: {
    PRIMARY: "#0b57d0",     /* Bleu Google Workspace */
    SECONDARY: "#444746",   /* Anthracite secondaire */
    BACKGROUND: "#f3f6fc",  /* Gris-Bleu de fond officiel */
    CRITICAL: "#b3261e",    /* Rouge alerte critique */
    HIGH: "#f57c00",        /* Orange alerte élevée */
    MEDIUM: "#444746",      /* Muted alerte moyenne */
    BORDER: "#e3e3e3"
  }
};

/**
 * Dictionnaire de traduction bilingue (FR/EN) pour les alertes et rapports d'Unspoofer.
 * En français, seul le premier mot commence par une majuscule (Sentence case).
 */
const EMAIL_TRANSLATIONS = {
  fr: {
    alertSubjectCritique: "[CRITIQUE] Alerte usurpation : ",
    alertSubjectStandard: "[ALERTE] Alerte usurpation : ",
    alertTitle: "Messages suspects détectés",
    alertSubtitleSingle: "1 message suspect a été intercepté dans votre boîte de réception.",
    alertSubtitlePlural: "{count} messages suspects ont été interceptés dans votre boîte de réception.",
    alertCriticalWarning: "Attention, ce rapport contient des menaces classées critiques.",
    colSeverity: "Sévérité",
    colSubject: "Objet",
    colEmail: "E-mail",
    colDisplayName: "Nom affiché",
    colReason: "Raison",
    severityCritique: "Critique",
    severityElevee: "Élevée",
    severityMoyenne: "Moyenne",
    footerTextAlert: "Ces messages suspects ont été automatiquement étiquetés ALERTE-USURPATION dans votre boîte Gmail.",
    
    // Motifs de détection (Sentence case en français)
    reasonPlatform: "Envoyé depuis une plateforme suspecte : {param}",
    reasonReplyTo: "Répondre à (Reply-To) divergent : {param}",
    reasonImpersonation: "Le nom d'affichage usurpe {param1} mais l'e-mail provient de {param2}",
    reasonGenericDomain: "Le nom d'affichage contient le domaine {param1} mais l'e-mail provient de {param2}",
    reasonTyposquatting: "Domaine suspect par typosquatting : {param1} ressemble à {param2}",
    reasonBodyLink: "Lien suspect détecté (typosquatting) dans le corps du message",
    reasonHtmlLinkMismatch: "Lien trompeur détecté : le texte affiche {param1} mais pointe vers {param2}",
    reasonAttachment: "Pièce jointe suspecte détectée : {param}",
    reasonDkim: "Envoyé via une plateforme suspecte : {param} (domaine personnalisé)",
    reasonAuthFail: "Échec d'authentification e-mail : {param}",
    
    reportSubject: "\uD83D\uDCCA Rapport hebdomadaire Unspoofer",
    reportTitle: "Rapport hebdomadaire Unspoofer",
    reportSubtitle: "Voici le résumé de votre protection de messagerie pour cette semaine :",
    statAnalyzed: "Messages analysés",
    statBlocked: "Usurpations bloquées",
    statRate: "Taux de détection",
    statCumulative: "Total cumulé depuis l'installation :",
    statExecutions: "Exécutions : {exec} | Analyses : {analyzed} | Usurpations : {blocked}",
    footerTextReport: "Votre protection Unspoofer est active et surveille votre boîte de réception en arrière-plan.",
    
    authorSignature: "&lt;&gt; par Fabrice Faucheux",
    helpLinkText: "Centre d'aide"
  },
  en: {
    alertSubjectCritique: "[CRITICAL] Spoofing alert: ",
    alertSubjectStandard: "[ALERT] Spoofing alert: ",
    alertTitle: "Suspicious messages detected",
    alertSubtitleSingle: "1 suspicious message has been intercepted in your inbox.",
    alertSubtitlePlural: "{count} suspicious messages have been intercepted in your inbox.",
    alertCriticalWarning: "Warning: this report contains threats flagged as critical.",
    colSeverity: "Severity",
    colSubject: "Subject",
    colEmail: "Email",
    colDisplayName: "Display name",
    colReason: "Reason",
    severityCritique: "Critical",
    severityElevee: "High",
    severityMoyenne: "Medium",
    footerTextAlert: "These suspicious messages have been automatically labeled ALERTE-USURPATION in your Gmail inbox.",
    
    // Detection reasons (English)
    reasonPlatform: "Sent from a suspicious platform: {param}",
    reasonReplyTo: "Mismatching Reply-To address: {param}",
    reasonImpersonation: "Display name impersonates {param1} but the email comes from {param2}",
    reasonGenericDomain: "Display name contains the domain {param1} but the email comes from {param2}",
    reasonTyposquatting: "Suspicious typosquatting domain: {param1} resembles {param2}",
    reasonBodyLink: "Suspicious typosquatting link detected in the email body",
    reasonHtmlLinkMismatch: "Misleading link detected: display text shows {param1} but points to {param2}",
    reasonAttachment: "Suspicious attachment detected: {param}",
    reasonDkim: "Sent via a suspicious platform: {param} (custom domain)",
    reasonAuthFail: "Email authentication failure: {param}",
    
    reportSubject: "\uD83D\uDCCA Unspoofer weekly report",
    reportTitle: "Unspoofer weekly report",
    reportSubtitle: "Here is the summary of your email protection for this week:",
    statAnalyzed: "Messages analyzed",
    statBlocked: "Impersonations blocked",
    statRate: "Detection rate",
    statCumulative: "Cumulative total since installation:",
    statExecutions: "Executions: {exec} | Analyzed: {analyzed} | Impersonations: {blocked}",
    footerTextReport: "Your Unspoofer protection is active and scanning your inbox in the background.",
    
    authorSignature: "&lt;&gt; by Fabrice Faucheux",
    helpLinkText: "Help center"
  }
};
