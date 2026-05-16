# 🛡️ Unspoofer — Gmail Phishing & Spoofing Detector

[**English**](#english) | [**Français**](#français)

---

<a name="english"></a>
## 🇺🇸 English

**Unspoofer** is a Google Apps Script tool that protects your Gmail inbox from **display-name spoofing**, **homoglyph attacks**, **typosquatting**, and **malicious content**.

### 🚀 Features
- **Brand Impersonation Detection**: 80+ monitored brands (tech, banks, French public services, telecoms…).
- **Advanced Body Analysis**: Scans URLs in the email body for typosquatting (e.g. `paypa1.com`).
- **Reply-To Validation**: Detects when the reply address diverges from the sender's domain.
- **Attachment Shield**: Flags dangerous file extensions (`.html`, `.exe`, `.js`, `.iso`, etc.).
- **SPF / DKIM / DMARC Verification**: Analyzes raw authentication headers for failures.
- **Homoglyph Normalization**: Detects Cyrillic, Greek, and lookalike characters.
- **Severity Levels**: 🔴 Critical, 🟠 High, 🟡 Medium — prioritize what matters.
- **Reporting**: Automated alerts every 10 mins and a **Weekly Summary Report** every Monday.
- **Quota Optimized**: Smart API management (Lazy-loading & Batching) to avoid Google rate limits.
- **Configurable**: Adjustable scan window (default: 7 days) and easy whitelist management.

### 🛠 Setup
1. Copy all `.gs` files into a Google Apps Script project.
2. Run `configurer()` to create the label and set up the triggers.
3. Authorize required permissions.

### 📖 Functions
| Function | Description |
|---|---|
| `configurer()` | Initialize label + 10-min analysis + Weekly report |
| `analyserBoiteReception()` | Manual scan (paginated, time-limited) |
| `reanalyserBoiteReception()` | Clear cache and rescan (deduplicated alerts) |
| `testerDetection()` | Run 30+ built-in test cases |
| `analyserMarquesNonDetectees()` | Find frequent domains in alerts for maintenance |
| `deboguerMessageById('id')` | Detailed diagnostic for a specific message |
| `ajouterALaListeBlanche('domain')` | Whitelist a sender or domain |
| `afficherStatistiques()` | View cumulative and weekly stats |

---

<a name="français"></a>
## 🇫🇷 Français

**Unspoofer** est un outil Google Apps Script qui protège votre boîte Gmail contre l'**usurpation de nom d'affichage**, les **attaques par homoglyphes**, le **typosquatting** et les **contenus malveillants**.

### 🚀 Fonctionnalités
- **Détection d'usurpation de marque** : 80+ marques surveillées (tech, banques, services publics, télécoms…).
- **Analyse avancée du corps** : Scanne les URLs pour détecter le typosquatting (ex : un lien `paypa1.com` dans le texte).
- **Validation du Reply-To** : Repère les adresses de réponse divergentes du domaine de l'expéditeur.
- **Protection des pièces jointes** : Signale les extensions dangereuses (`.html`, `.exe`, `.js`, `.iso`, etc.).
- **Vérification SPF / DKIM / DMARC** : Analyse les en-têtes d'authentification.
- **Normalisation des homoglyphes** : Détecte les caractères cyrilliques, grecs et pleine largeur.
- **Niveaux de sévérité** : 🔴 Critique, 🟠 Élevée, 🟡 Moyenne.
- **Rapports** : Alertes toutes les 10 minutes et **Rapport de Synthèse Hebdomadaire** chaque lundi.
- **Optimisation Quota** : Gestion intelligente des appels API (Lazy-loading) pour éviter les limites Google.
- **Configurable** : Fenêtre d'analyse ajustable (défaut : 7 jours) et gestion simple de la liste blanche.

### 🛠 Installation
1. Copiez tous les fichiers `.gs` dans un projet Google Apps Script.
2. Exécutez `configurer()` pour créer l'étiquette et les déclencheurs.
3. Autorisez les permissions requises.

### 📖 Fonctions
| Fonction | Description |
|---|---|
| `configurer()` | Initialise l'étiquette + analyses + Rapport hebdo |
| `analyserBoiteReception()` | Analyse manuelle (paginée, limitée en temps) |
| `reanalyserBoiteReception()` | Vide le cache et réanalyse (alertes dédupliquées) |
| `testerDetection()` | Exécute 30+ cas de test intégrés |
| `analyserMarquesNonDetectees()` | Trouve les domaines fréquents dans les alertes |
| `deboguerMessageById('id')` | Diagnostic détaillé pour un message précis |
| `ajouterALaListeBlanche('domaine')` | Ajouter à la liste blanche |
| `afficherStatistiques()` | Voir les stats cumulées et hebdomadaires |

---

## 📂 Structure

| File | Role |
|---|---|
| `Principal.gs` | Orchestration, triggers, alerts, weekly report, tests |
| `DetecteurUsurpation.gs` | Detection engine, SPF/DMARC, body analysis, attachments |
| `Marque.gs` | Brand database, groups, typosquatting logic |
| `Homoglyphes.gs` | Unicode homoglyph mapping |
| `Cache.gs` | Processed message cache, statistics & snapshots |

## ⚖️ License

[MIT](LICENSE)

## ⚠️ Disclaimer

No detection system is perfect. Use as an additional security layer.

*Aucun système de détection n'est infaillible. Utilisez cet outil comme couche de sécurité supplémentaire.*
