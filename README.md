# 📦 Unspoofer — Gmail Phishing & Spoofing Detector

[🇫🇷 Version Française](#-version-française) | [🇬🇧 English Version](#-english-version)

---

## 🇫🇷 Version Française

> Unspoofer est un outil Google Apps Script robuste qui protège votre boîte de réception Gmail contre l'usurpation de nom d'affichage, les attaques par homoglyphes, le typosquatting, les écarts de liens cachés et les contenus d'emails malveillants, gérable depuis un tableau de bord moderne.

<a href="https://developers.google.com/apps-script"><img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-indigo?style=for-the-badge" alt="License: MIT"></a>
<a href="README.md"><img src="https://img.shields.io/badge/Status-Production-brightgreen?style=for-the-badge" alt="Status: Production"></a>

---

### ✨ Fonctionnalités clés

- 🛡️ **Détection d'usurpation de marque** : Plus de 80 marques surveillées en continu (services publics, banques, plateformes tech, télécoms, etc.).
- 🔗 **Analyse des écarts de liens HTML** : Détecte les liens frauduleux où le texte affiché simule un domaine de confiance (ex: `paypal.com`) alors que la cible réelle (`href`) pointe vers un site externe.
- 🔀 **Typosquatting étendu par mots-clés** : Identifie l'association frauduleuse de termes de phishing (ex: `security`, `update`, `verification`) avec des marques de confiance (ex: `paypal-security-update.com`).
- 🔄 **Validation du Reply-To** : Repère automatiquement lorsque l'adresse de réponse diverge suspectement du domaine expéditeur réel.
- 📦 **Protection des pièces jointes** : Détecte et signale les extensions de fichiers potentiellement dangereuses (`.html`, `.exe`, `.js`, `.iso`, etc.).
- 🔑 **Vérification SPF / DKIM / DMARC** : Analyse des en-têtes d'authentification bruts pour identifier les échecs d'alignement.
- 🔠 **Normalisation des homoglyphes** : Identifie les fraudes basées sur des caractères cyrilliques, grecs ou d'autres alphabets visuellement similaires.
- 🚀 **Cache hybride RAM & sérialisation compacte** : Double couche de mise en cache ultra-rapide (RAM `CacheService` + chaîne compressée délimitée par des virgules dans `ScriptProperties`) étendant la capacité jusqu'à 500 messages sans perte de performance.
- 🎨 **Tableau de bord interactif** : Interface d'administration en Material Design 3 responsive (statistiques KPIs, recherche en liste blanche, ajout de marques personnalisées et banc d'essais interactif).

---

### 🚀 Installation & configuration

1. Copiez tous les fichiers du script dans votre projet Google Apps Script (ou utilisez **clasp**).
2. Déployez le projet en tant qu'**Application Web** (`Déployer > Nouveau déploiement > Application Web`) pour exécuter l'interface d'administration.
3. Ouvrez l'application web ou lancez la fonction `configurer()` dans l'éditeur pour activer le déclencheur temporel de scan en tâche de fond (toutes les 10 minutes) et le rapport hebdomadaire.
4. Autorisez les permissions de sécurité Gmail et de script requises.

---

### 📖 Description des fonctions principales

| Fonction | Description |
| :--- | :--- |
| `configurer()` | Crée l'étiquette d'alerte Gmail et configure les tâches planifiées de scan (10 min) et de rapport hebdomadaire. |
| `analyserBoiteReception()` | Lance un scan manuel, paginé et respectueux des quotas de temps de votre boîte. |
| `reanalyserBoiteReception()` | Vide le cache de sécurité et relance une analyse approfondie. |
| `testerDetection(true)` | Déclenche 20 cas de test d'usurpations simulées en retournant le diagnostic complet. |
| `ajouterALaListeBlanche(domain)` | Ajoute un expéditeur ou domaine d'expéditeur fiable à la liste blanche pour cesser les alertes. |
| `addCustomBrand(name, domain)` | Enregistre une marque ou domaine propre à l'utilisateur sous surveillance active. |

---

### 🛠️ Architecture du code

- **[Principal.gs](Principal.gs)** : Orchestrateur central d'analyse, d'alertes email et de rapports.
- **[DetecteurUsurpation.gs](DetecteurUsurpation.gs)** : Moteur d'analyse (SPF/DKIM, analyse de liens HTML trompeurs et pièces jointes).
- **[Marque.gs](Marque.gs)** : Base des marques de confiance, d'exclusion et règles de typosquatting par mots-clés.
- **[Serveur.gs](Serveur.gs)** : API de contrôle backend RPC gérant la liste blanche, les déclencheurs et les rapports de test.
- **[Dashboard.html](Dashboard.html)** : Vue client du tableau de bord d'administration de sécurité.
- **[Homoglyphes.gs](Homoglyphes.gs)** : Traduction et normalisation des caractères unicode trompeurs.
- **[Cache.gs](Cache.gs)** : Gestion de la double couche de cache et compactage de persistance.

---

### 👤 Auteur

- **[Fabrice Faucheux](https://faucheux.bzh)** (FF Labs) - [GitHub](https://github.com/FabriceFx)

---

### 📄 Licence

Ce projet est disponible sous licence **MIT**. Pour plus d'informations, veuillez consulter le fichier [LICENSE](LICENSE).

---

## 🇬🇧 English Version

> Unspoofer is a robust Google Apps Script tool that protects your Gmail inbox from display-name spoofing, homoglyph attacks, typosquatting, misleading HTML link mismatches, and malicious email content, all manageable from an intuitive control dashboard.

<a href="https://developers.google.com/apps-script"><img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-indigo?style=for-the-badge" alt="License: MIT"></a>

---

### ✨ Key Features

- 🛡️ **Brand Impersonation Detection**: Continuously monitors over 80 well-known brands (government, banking, tech, telecom, etc.).
- 🔗 **HTML Link Mismatch Detection**: Catch visual spoof attempts where the link anchor text claims a trusted domain but `href` targets elsewhere.
- 🔀 **Keyword Typosquatting Scanning**: Intercepts domains associating phishing keywords (e.g. `security`, `update`, `login`) with regulated brands.
- 🔄 **Reply-To Validation**: Identifies when reply addresses suspiciously mismatch the sender's actual domain.
- 📦 **Attachment Shield**: Highlights and flags potentially dangerous file extensions (`.html`, `.exe`, `.js`, `.iso`, etc.).
- 🔑 **SPF / DKIM / DMARC Validation**: Evaluates raw header authentication logs to catch spoofed configurations.
- 🔠 **Homoglyph Normalization**: Uncovers visual fraud utilizing Greek, Cyrillic, or other lookalike character families.
- 🚀 **RAM Hybrid Cache & Compression**: Fast access utilizing RAM `CacheService` backed by comma-separated hex compacting inside `ScriptProperties` to track 500+ messages.
- 🎨 **Material Design 3 Dashboard**: Web App administration panel supporting KPI statistics, real-time logging, custom brands, interactive unit tests, and whitelist controls.

---

### 🚀 Installation & Setup

1. Copy all script files into your Google Apps Script editor (or use **clasp**).
2. Deploy the project as a **Web App** (`Deploy > New deployment > Web App`) to load the management control panel.
3. Access your Web App URL or execute `configurer()` once inside the editor to instantiate the background Gmail scanner (10 min interval) and weekly report.
4. Grant the required security scopes for Gmail and script interactions.

---

### 📖 Main Functions Reference

| Function | Description |
| :--- | :--- |
| `configurer()` | Sets up the Gmail warning label and standard background checks (10 mins) and weekly report. |
| `analyserBoiteReception()` | Triggers a paginated manual check optimized to stay within API rate quotas. |
| `reanalyserBoiteReception()` | Resets analyzed snapshots cache to launch a thorough and deep verification. |
| `testerDetection(true)` | Executes 20 internal simulated threat cases and returns full JSON metrics. |
| `ajouterALaListeBlanche(domain)` | Registers trusted sender domains to the whitelist to suppress fake positives. |
| `addCustomBrand(name, domain)` | Configures custom targeted brand domain surveillance entries dynamically. |

---

### 🛠️ Project Structure

- **[Principal.gs](Principal.gs)**: Main logic handler (triggers orchestration, notifications, weekly reports, and testing unit).
- **[DetecteurUsurpation.gs](DetecteurUsurpation.gs)**: Core scanner engine (SPF/DMARC headers, typosquatting crawler, and attachment checking).
- **[Marque.gs](Marque.gs)**: Regulated brands database and impersonation regex definitions.
- **[Serveur.gs](Serveur.gs)**: Backend controller exposing RPC channels for Whitelist, Custom Brands, and Unit Tests.
- **[Dashboard.html](Dashboard.html)**: Front-end client Material Design 3 administrative view template.
- **[Homoglyphes.gs](Homoglyphes.gs)**: Unicode lookalike table parser.
- **[Cache.gs](Cache.gs)**: Persistent storage management (analyzed emails history cache and weekly metrics tracking).

---

### 👤 Author

- **[Fabrice Faucheux](https://faucheux.bzh)** (FF Labs) - [GitHub](https://github.com/FabriceFx)

---

### 📄 License

This project is licensed under the terms of the **MIT License**.

---
<p align="center"><a href="https://faucheux.bzh" target="_blank" style="color: inherit; text-decoration: none;">&lt;&gt; par Fabrice Faucheux</a></p>
