/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Config.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : Détecteur Phishing
 *  Rôle        : Centralisation des constantes globales, des variables d'environnement et de configuration.
 *  Version     : 2.4.0
 * ============================================================================
 */

/**
 * Config.gs — Configuration centralisée et dictionnaire bilingue pour Unspoofer.
 */

const CONFIG = {
  PROJECT_NAME: "Unspoofer",
  VERSION: "2.4.0",
  /* Langue : 'auto' suit le compte Google de l'utilisateur ; 'fr' ou 'en'
     imposent une langue. Une préférence choisie depuis le tableau de bord
     l'emporte sur cette valeur. Voir getLangueUtilisateur_() dans Utils.gs. */
  LANGUAGE: "auto",
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
    alertSubjectSuffixSingle: "message suspect détecté",
    alertSubjectSuffixPlural: "messages suspects détectés",
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
    
    reportSubject: "📊 Rapport hebdomadaire Unspoofer",
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
    alertSubjectSuffixSingle: "suspicious message detected",
    alertSubjectSuffixPlural: "suspicious messages detected",
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
    
    reportSubject: "📊 Unspoofer weekly report",
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

/**
 * Dictionnaire de l'interface web (tableau de bord).
 *
 * Séparé d'EMAIL_TRANSLATIONS : les alertes par e-mail et l'interface n'ont ni
 * le même vocabulaire ni le même cycle de vie. Les deux sont servis par
 * getDashboardData() et appliqués côté client via les attributs data-i18n.
 *
 * Les valeurs peuvent contenir des marqueurs {n}, {a}, {b} remplacés à
 * l'exécution, et un balisage HTML simple (<strong>, <em>, <code>, <br>)
 * lorsque la clé est appliquée en tant que contenu riche.
 */
const UI_TRANSLATIONS = {
  fr: {
    /* En-tête et navigation */
    appSubtitle: "Bouclier anti-usurpation Gmail",
    navStatus: "Statut & KPIs",
    navWhitelist: "Liste blanche",
    navBrands: "Marques perso",
    navTests: "Suite de tests",
    navGuide: "Guide",
    langLabel: "Langue de l'interface",

    /* Encart de première utilisation */
    firstRunTitle: "Aucune analyse n'a encore été effectuée.",
    firstRunBody: "Activez la surveillance automatique ci-dessous, ou lancez un premier scan manuel. Unspoofer examinera les messages reçus dans votre boîte de réception au cours des 7 derniers jours.",
    firstRunBtn: "Lire le guide de démarrage",

    /* Indicateurs */
    kpiAnalyzed: "Messages analysés",
    kpiAnalyzedDesc: "Total cumulé dans la boîte",
    kpiBlocked: "Usurpations bloquées",
    kpiBlockedDesc: "Menaces réelles identifiées",
    kpiRate: "Taux de phishing",
    kpiRateDesc: "Proportion d'e-mails hostiles",
    kpiExecutions: "Exécutions totales",
    kpiExecutionsDesc: "Cycles de surveillance automatiques",

    /* Panneau de contrôle */
    ctlTitle: "Contrôle du détecteur",
    ctlAuto: "Surveillance automatique",
    ctlAutoDesc: "Analyse en arrière-plan toutes les 10 minutes",
    ctlLastScan: "Dernière analyse",
    ctlLastScanNone: "aucune",
    ctlLastScanPrefix: "Dernier passage : ",
    ctlScanNow: "Lancer un scan immédiat",
    logTitle: "Historique d'activité",
    logConnected: "Tableau de bord de sécurité Unspoofer connecté.",

    /* Liste blanche */
    wlTitle: "Gestion de la liste blanche",
    wlIntro: "Ajoutez des adresses e-mail complètes (ex : <code>finance@paypal.com</code>) ou des domaines de confiance (ex : <code>laposte.fr</code>) pour désactiver l'analyse et éviter les fausses alertes sur ces émetteurs sécurisés.",
    wlPlaceholder: "Ex : ameli.fr ou contact@societegenerale.fr",
    wlAdd: "Approuver l'expéditeur",
    wlColEntry: "Domaine ou adresse approuvée",
    wlColActions: "Actions",
    wlEmpty: "Aucun expéditeur en liste blanche. Les alertes sont actives pour tout le monde.",
    wlRemoveTitle: "Supprimer de la liste blanche",

    /* Marques personnalisées */
    brTitle: "Surveillance de marques personnalisées",
    brIntro: "Unspoofer surveille <strong>191 domaines de marques</strong> en standard : banques, services publics, télécoms, énergie, assurance, e-commerce, transport, crypto. Ajoutez ici les domaines qui vous concernent en propre — votre entreprise, vos partenaires, vos clients — pour être averti si quelqu'un tente de se faire passer pour eux.",
    brIntro2: "<strong>Le nom sert à la reconnaissance, le domaine à la vérification.</strong> Si un message affiche votre nom de marque sans provenir du domaine déclaré, il sera signalé. Déclarez donc bien le domaine <em>légitime</em>, celui d'où partent vos vrais e-mails.",
    brNamePlaceholder: "Nom de marque (ex : MonEntreprise)",
    brDomainPlaceholder: "Domaine légitime (ex : monentreprise.com)",
    brAdd: "Ajouter la marque",
    brColName: "Marque",
    brColDomain: "Domaine légitime",
    brColActions: "Actions",
    brEmpty: "Aucune marque personnalisée configurée.",
    brRemoveTitle: "Supprimer la marque",

    /* Suite de tests */
    tsTitle: "Banc d'essais et tests unitaires",
    tsIntro: "Vingt messages fictifs sont soumis au moteur : <strong>13 frauduleux</strong>, qui doivent être signalés, et <strong>7 légitimes</strong>, qui ne doivent surtout pas l'être. Un test réussit quand le verdict du moteur correspond à ce qui est attendu — repérer une fraude, mais aussi laisser passer un message honnête.<br><br><strong>Aucun de vos e-mails n'est lu</strong> : ces vingt cas sont écrits dans le code.<br><br>À quoi cela sert : après avoir modifié votre liste blanche ou vos marques personnalisées, relancez la suite. Un test qui passe à l'échec signale que votre modification a cassé une détection, ou en a créé une de trop.",
    tsExpectedThreat: "Menace attendue",
    tsExpectedLegit: "Légitime attendu",
    tsPass: "Conforme",
    tsFail: "Écart",
    tsVerdict: "Verdict du moteur",
    tsNoThreat: "Aucune menace détectée",
    tsRun: "Lancer les 20 tests",
    tsPassed: "{n}/20 tests validés avec succès",
    tsFailedCount: "Tests en échec : {n}",
    tsEmpty: "Cliquez sur « Lancer les 20 tests » pour observer les résultats de l'analyse heuristique simulée.",

    /* Guide */
    gdWhatTitle: "À quoi sert Unspoofer",
    gdWhatBody: "Gmail bloque déjà très bien le spam, les pièces jointes malveillantes et les adresses dont l'authentification échoue. Mais un escroc peut acheter un domaine, le configurer correctement, et écrire <strong>« Crédit Agricole »</strong> dans le nom d'affichage : rien n'est techniquement anormal, et le message arrive dans votre boîte de réception.<br><br><strong>Unspoofer regarde ce que ces filtres ne regardent pas : la mise en scène.</strong> Il n'analyse que la boîte de réception, jamais les spams — tout ce qu'il signale est donc un message qui avait déjà passé les protections de Google.",
    gdStartTitle: "Démarrer en trois étapes",
    gdStep1: "Activez la surveillance automatique",
    gdStep1Body: "Onglet <em>Statut &amp; KPIs</em>, interrupteur « Surveillance automatique ». Une analyse se lancera toutes les 10 minutes, et un rapport récapitulatif vous sera envoyé chaque lundi matin.",
    gdStep2: "Lancez un premier scan manuel",
    gdStep2Body: "Sans attendre le prochain cycle, le bouton « Lancer un scan immédiat » examine les messages des 7 derniers jours. C'est le moyen le plus rapide de voir l'outil à l'œuvre.",
    gdStep3: "Consultez vos alertes dans Gmail",
    gdStep3Body: "Les messages suspects reçoivent l'étiquette <code>ALERTE-USURPATION</code> et sont suivis d'une étoile. Un e-mail récapitulatif vous est adressé. Ouvrez cette étiquette dans Gmail pour les retrouver toutes.",
    gdDetectTitle: "Ce qui se passe en cas de détection",
    gdDetectIntro: "Unspoofer <strong>ne supprime jamais rien</strong> et ne déplace aucun message. Il se contente de trois actions réversibles :",
    gdDetect1: "l'étiquette <code>ALERTE-USURPATION</code> est posée sur la conversation ;",
    gdDetect2: "le message est suivi d'une étoile pour le repérer d'un coup d'œil ;",
    gdDetect3: "un e-mail d'alerte vous est envoyé, à vous seul, avec le motif retenu.",
    gdDetectOutro: "Une alerte injustifiée ne coûte donc qu'une étiquette à retirer.",
    gdSevTitle: "Les trois niveaux de sévérité",
    gdSevCritical: "<strong>Critique</strong> — usurpation d'une marque financière avec caractères trompeurs, échec d'authentification, ou lien dont le texte ment sur sa destination. À traiter en priorité.",
    gdSevHigh: "<strong>Élevée</strong> — usurpation d'une marque connue, typosquatting, pièce jointe à extension risquée, envoi depuis une plateforme d'hébergement détournée.",
    gdSevMedium: "<strong>Moyenne</strong> — signaux plus faibles : adresse de réponse divergente, domaine annoncé dans le nom d'affichage qui ne correspond pas à l'expéditeur réel.",
    gdFpTitle: "Un message légitime a été signalé",
    gdFpIntro: "C'est le cas le plus fréquent, et il se règle en quelques secondes. Deux possibilités selon la situation :",
    gdFp1: "<strong>Un expéditeur précis</strong> — ajoutez son adresse ou son domaine dans l'onglet <em>Liste blanche</em>. Il ne sera plus jamais analysé.",
    gdFp2: "<strong>Votre propre entreprise ou un partenaire</strong> — déclarez-la dans l'onglet <em>Marques perso</em> : elle sera surveillée, et ses vrais domaines cesseront de déclencher des alertes.",
    gdFpOutro: "Retirer une étiquette dans Gmail ne suffit pas : sans liste blanche, le message pourrait être re-signalé lors d'une prochaine analyse approfondie.",
    gdKpiTitle: "Comprendre les indicateurs",
    gdKpi1: "<strong>Messages analysés</strong> — total cumulé depuis l'installation. Un message déjà vu n'est pas recompté.",
    gdKpi2: "<strong>Usurpations bloquées</strong> — nombre de messages ayant reçu l'étiquette d'alerte.",
    gdKpi3: "<strong>Taux de phishing</strong> — part des messages analysés qui ont été signalés. Sur une boîte saine, quelques pourcents au plus.",
    gdKpi4: "<strong>Exécutions totales</strong> — nombre de cycles de surveillance déclenchés depuis l'activation.",
    gdPrivacyTitle: "Confidentialité",
    gdPrivacyBody: "Unspoofer s'exécute <strong>entièrement dans votre propre compte Google</strong>. Le script n'effectue aucun appel vers un serveur externe : le contenu de vos messages ne quitte jamais votre environnement, et les e-mails d'alerte ne sont adressés qu'à vous. Le code est publié sous licence MIT et peut être relu intégralement.",

    /* Messages transitoires */
    loading: "Chargement des données de sécurité...",
    msgTriggersOn: "Déclencheurs activés (scan 10 min et rapport hebdomadaire).",
    msgTriggersOff: "Déclencheurs arrêtés.",
    msgScanDone: "Scan manuel terminé.",
    msgTestsDone: "Banc d'essais exécuté ({n} réussis).",
    msgWlAdded: "Expéditeur ajouté à la liste blanche.",
    msgWlRemoved: "Expéditeur retiré de la liste blanche.",
    msgBrandAdded: "Marque personnalisée ajoutée.",
    msgBrandRemoved: "Marque personnalisée supprimée.",
    msgFillBoth: "Veuillez remplir les deux champs.",
    msgLangChanged: "Langue de l'interface modifiée.",
    healthTitle: "Vos alertes sont introuvables dans Gmail.",
    healthBodyNoLabel: "L'étiquette <code>ALERTE-USURPATION</code> a été supprimée depuis Gmail, ce qui l'a retirée de tous les messages qui la portaient. Les messages eux-mêmes sont intacts. Lancez un scan : l'étiquette sera recréée et les messages ré-analysés.",
    healthBodyNoThread: "L'étiquette existe mais aucun message ne la porte actuellement. Les messages signalés ont probablement été supprimés ou archivés depuis. Le compteur, lui, est cumulatif depuis l'installation.",
    healthBtn: "Lancer un scan de reprise",
    msgError: "Une erreur est survenue : {n}",
    logLoaded: "Données chargées depuis le serveur.",
    logNav: "Navigation vers l'onglet : {n}",
    logLang: "Langue de l'interface : {n}",
    logTriggersOn: "Déclencheurs temporels configurés.",
    logTriggersOff: "Déclencheurs temporels supprimés.",
    logScanDone: "Scan manuel terminé. Usurpations trouvées : {n}",
    logTestsDone: "Tests terminés. Réussis : {a} | Échoués : {b}",
    logWlAdded: "Ajouté en liste blanche : {n}",
    logWlRemoved: "Retiré de la liste blanche : {n}",
    logBrandAdded: "Marque ajoutée à la surveillance : {n}",
    logBrandRemoved: "Marque retirée de la surveillance : {n}",
    logFailure: "Échec : {n}",
    logFilterLabel: "Filtrer le journal",
    logFilterAll: "Tout",
    logFilterActions: "Actions et erreurs",
    logFilterErrors: "Erreurs seules",
    logEmptyFiltered: "Aucune entrée ne correspond à ce filtre."
  },

  en: {
    /* Header and navigation */
    appSubtitle: "Gmail Impersonation Shield",
    navStatus: "Status & KPIs",
    navWhitelist: "Allow list",
    navBrands: "Custom brands",
    navTests: "Test suite",
    navGuide: "Guide",
    langLabel: "Interface language",

    /* First-run callout */
    firstRunTitle: "No scan has been run yet.",
    firstRunBody: "Turn on automatic monitoring below, or start a first manual scan. Unspoofer will review the messages received in your inbox over the past 7 days.",
    firstRunBtn: "Read the getting-started guide",

    /* Indicators */
    kpiAnalyzed: "Messages analysed",
    kpiAnalyzedDesc: "Cumulative total for this mailbox",
    kpiBlocked: "Impersonations flagged",
    kpiBlockedDesc: "Actual threats identified",
    kpiRate: "Phishing rate",
    kpiRateDesc: "Share of hostile e-mails",
    kpiExecutions: "Total runs",
    kpiExecutionsDesc: "Automatic monitoring cycles",

    /* Control panel */
    ctlTitle: "Detector control",
    ctlAuto: "Automatic monitoring",
    ctlAutoDesc: "Background scan every 10 minutes",
    ctlLastScan: "Last scan",
    ctlLastScanNone: "none",
    ctlLastScanPrefix: "Last run: ",
    ctlScanNow: "Run a scan now",
    logTitle: "Activity history",
    logConnected: "Unspoofer security dashboard connected.",

    /* Allow list */
    wlTitle: "Allow list management",
    wlIntro: "Add full e-mail addresses (e.g. <code>finance@paypal.com</code>) or trusted domains (e.g. <code>royalmail.com</code>) to skip analysis and avoid false alerts on these trusted senders.",
    wlPlaceholder: "e.g. hmrc.gov.uk or contact@barclays.co.uk",
    wlAdd: "Approve sender",
    wlColEntry: "Approved domain or address",
    wlColActions: "Actions",
    wlEmpty: "No sender on the allow list. Alerts are active for everyone.",
    wlRemoveTitle: "Remove from the allow list",

    /* Custom brands */
    brTitle: "Custom brand monitoring",
    brIntro: "Unspoofer monitors <strong>191 brand domains</strong> out of the box: banking, government services, telecom, energy, insurance, e-commerce, shipping, crypto. Add here the domains that concern you specifically — your company, your partners, your customers — to be warned if someone tries to pass themselves off as them.",
    brIntro2: "<strong>The name is what gets recognised, the domain is what gets verified.</strong> If a message shows your brand name without coming from the declared domain, it will be flagged. So declare the <em>legitimate</em> domain — the one your real e-mails are sent from.",
    brNamePlaceholder: "Brand name (e.g. MyCompany)",
    brDomainPlaceholder: "Legitimate domain (e.g. mycompany.com)",
    brAdd: "Add brand",
    brColName: "Brand",
    brColDomain: "Legitimate domain",
    brColActions: "Actions",
    brEmpty: "No custom brand configured.",
    brRemoveTitle: "Remove brand",

    /* Test suite */
    tsTitle: "Test bench and unit tests",
    tsIntro: "Twenty fictitious messages are fed to the engine: <strong>13 fraudulent</strong>, which must be flagged, and <strong>7 legitimate</strong>, which must not be. A test passes when the engine's verdict matches what is expected — catching a fraud, but equally letting an honest message through.<br><br><strong>None of your e-mails are read</strong>: these twenty cases live in the code.<br><br>What it is for: after changing your allow list or your custom brands, run the suite again. A test turning to failure means your change broke a detection, or created one too many.",
    tsExpectedThreat: "Threat expected",
    tsExpectedLegit: "Legitimate expected",
    tsPass: "As expected",
    tsFail: "Mismatch",
    tsVerdict: "Engine verdict",
    tsNoThreat: "No threat detected",
    tsRun: "Run the 20 tests",
    tsPassed: "{n}/20 tests passed",
    tsFailedCount: "Tests failed: {n}",
    tsEmpty: "Click “Run the 20 tests” to see the results of the simulated heuristic analysis.",

    /* Guide */
    gdWhatTitle: "What Unspoofer is for",
    gdWhatBody: "Gmail already does a very good job on spam, known malicious attachments and addresses that fail authentication. But a scammer can buy a domain, configure it correctly, and write <strong>“Barclays”</strong> in the display name: nothing is technically wrong, and the message lands in your inbox.<br><br><strong>Unspoofer looks at what those filters do not: the staging.</strong> It only analyses the inbox, never the spam folder — so everything it flags is a message that had already cleared Google's protections.",
    gdStartTitle: "Getting started in three steps",
    gdStep1: "Turn on automatic monitoring",
    gdStep1Body: "In the <em>Status &amp; KPIs</em> tab, use the “Automatic monitoring” switch. A scan will run every 10 minutes, and a summary report will reach you every Monday morning.",
    gdStep2: "Run a first manual scan",
    gdStep2Body: "Without waiting for the next cycle, the “Run a scan now” button reviews the past 7 days. It is the fastest way to see the tool at work.",
    gdStep3: "Check your alerts in Gmail",
    gdStep3Body: "Suspicious messages get the <code>ALERTE-USURPATION</code> label and are starred. A summary e-mail is sent to you. Open that label in Gmail to find them all.",
    gdDetectTitle: "What happens on a detection",
    gdDetectIntro: "Unspoofer <strong>never deletes anything</strong> and moves no message. It performs three reversible actions only:",
    gdDetect1: "the <code>ALERTE-USURPATION</code> label is applied to the conversation;",
    gdDetect2: "the message is starred so you can spot it at a glance;",
    gdDetect3: "an alert e-mail is sent to you, and only you, with the reason retained.",
    gdDetectOutro: "An unwarranted alert therefore costs no more than a label to remove.",
    gdSevTitle: "The three severity levels",
    gdSevCritical: "<strong>Critical</strong> — impersonation of a financial brand using deceptive characters, authentication failure, or a link whose text lies about its destination. Handle first.",
    gdSevHigh: "<strong>High</strong> — impersonation of a known brand, typosquatting, risky attachment extension, delivery through a hijacked hosting platform.",
    gdSevMedium: "<strong>Medium</strong> — weaker signals: diverging reply address, or a domain announced in the display name that does not match the actual sender.",
    gdFpTitle: "A legitimate message was flagged",
    gdFpIntro: "This is the most common case, and it takes seconds to settle. Two options depending on the situation:",
    gdFp1: "<strong>One specific sender</strong> — add their address or domain in the <em>Allow list</em> tab. They will never be analysed again.",
    gdFp2: "<strong>Your own company or a partner</strong> — declare it in the <em>Custom brands</em> tab: it will be monitored, and its genuine domains will stop raising alerts.",
    gdFpOutro: "Removing the label in Gmail is not enough: without an allow-list entry, the message could be flagged again during a deeper scan.",
    gdKpiTitle: "Understanding the indicators",
    gdKpi1: "<strong>Messages analysed</strong> — cumulative total since installation. A message already seen is not counted twice.",
    gdKpi2: "<strong>Impersonations flagged</strong> — number of messages that received the alert label.",
    gdKpi3: "<strong>Phishing rate</strong> — share of analysed messages that were flagged. On a healthy mailbox, a few percent at most.",
    gdKpi4: "<strong>Total runs</strong> — number of monitoring cycles triggered since activation.",
    gdPrivacyTitle: "Privacy",
    gdPrivacyBody: "Unspoofer runs <strong>entirely inside your own Google account</strong>. The script makes no call to any external server: the content of your messages never leaves your environment, and alert e-mails are addressed to you alone. The code is published under the MIT licence and can be reviewed in full.",

    /* Transient messages */
    loading: "Loading security data...",
    msgTriggersOn: "Triggers enabled (10-minute scan and weekly report).",
    msgTriggersOff: "Triggers stopped.",
    msgScanDone: "Manual scan complete.",
    msgTestsDone: "Test bench executed ({n} passed).",
    msgWlAdded: "Sender added to the allow list.",
    msgWlRemoved: "Sender removed from the allow list.",
    msgBrandAdded: "Custom brand added.",
    msgBrandRemoved: "Custom brand removed.",
    msgFillBoth: "Please fill in both fields.",
    msgLangChanged: "Interface language changed.",
    healthTitle: "Your alerts cannot be found in Gmail.",
    healthBodyNoLabel: "The <code>ALERTE-USURPATION</code> label was deleted from Gmail, which removed it from every message that carried it. The messages themselves are untouched. Run a scan: the label will be recreated and the messages re-analysed.",
    healthBodyNoThread: "The label exists but no message currently carries it. The flagged messages have most likely been deleted or archived since. The counter, however, is cumulative since installation.",
    healthBtn: "Run a recovery scan",
    msgError: "An error occurred: {n}",
    logLoaded: "Data loaded from the server.",
    logNav: "Navigated to tab: {n}",
    logLang: "Interface language: {n}",
    logTriggersOn: "Time-based triggers configured.",
    logTriggersOff: "Time-based triggers removed.",
    logScanDone: "Manual scan complete. Impersonations found: {n}",
    logTestsDone: "Tests complete. Passed: {a} | Failed: {b}",
    logWlAdded: "Added to the allow list: {n}",
    logWlRemoved: "Removed from the allow list: {n}",
    logBrandAdded: "Brand added to monitoring: {n}",
    logBrandRemoved: "Brand removed from monitoring: {n}",
    logFailure: "Failed: {n}",
    logFilterLabel: "Filter the log",
    logFilterAll: "Everything",
    logFilterActions: "Actions and errors",
    logFilterErrors: "Errors only",
    logEmptyFiltered: "No entry matches this filter."
  }
};
