# 📦 Unspoofer — Gmail Phishing & Spoofing Detector

[🇫🇷 Version Française](#-version-française) | [🇬🇧 English Version](#-english-version)

---

## 🇫🇷 Version Française

> Unspoofer est un outil Google Apps Script robuste qui protège votre boîte de réception Gmail contre l'usurpation de nom d'affichage, les attaques par homoglyphes, le typosquatting et les contenus d'emails malveillants.

<a href="https://developers.google.com/apps-script"><img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-indigo?style=for-the-badge" alt="License: MIT"></a>
<a href="README.md"><img src="https://img.shields.io/badge/Status-Production-emerald?style=for-the-badge" alt="Status: Production"></a>

---

### ✨ Fonctionnalités Clés

- 🛡️ **Détection d'Usurpation de Marque** : Plus de 80 marques surveillées en continu (services publics, banques, plateformes tech, télécoms, etc.).
- 🔗 **Analyse Avancée des Liens (Body)** : Recherche de liens de typosquatting dissimulés dans le texte (ex: `paypa1.com`).
- 🔄 **Validation du Reply-To** : Repère automatiquement lorsque l'adresse de réponse diverge suspectement du domaine expéditeur réel.
- 📦 **Protection des Pièces Jointes** : Détecte et signale les extensions de fichiers potentiellement dangereuses (`.html`, `.exe`, `.js`, `.iso`, etc.).
- 🔑 **Vérification SPF / DKIM / DMARC** : Analyse des en-têtes d'authentification bruts pour identifier les échecs d'alignement.
- 🔠 **Normalisation des Homoglyphes** : Identifie les fraudes basées sur des caractères cyrilliques, grecs ou d'autres alphabets visuellement similaires.
- 🚦 **Niveaux de Sévérité** : Classification fine (🔴 Critique, 🟠 Élevé, 🟡 Moyen) pour se concentrer sur les menaces réelles.
- 📊 **Rapports Automatiques** : Alertes régulières en temps réel (toutes les 10 min) et **Rapport de Synthèse Hebdomadaire** envoyé chaque lundi matin.

---

### 🚀 Installation & Configuration

1. Copiez tous les fichiers du script dans votre projet Google Apps Script.
2. Exécutez la fonction `configurer()` dans l'éditeur pour créer l'étiquette et initialiser les déclencheurs temporels.
3. Autorisez les permissions de sécurité Gmail et script requises.

---

### 📖 Description des Fonctions Principales

| Fonction | Description |
| :--- | :--- |
| `configurer()` | Crée l'étiquette d'alerte Gmail et configure les tâches planifiées de scan (10 min) et de rapport hebdomadaire. |
| `analyserBoiteReception()` | Lance un scan manuel, paginé et respectueux des quotas de temps de votre boîte. |
| `reanalyserBoiteReception()` | Vide le cache de sécurité et relance une analyse approfondie. |
| `testerDetection()` | Déclenche plus de 30 cas de test d'usurpations simulées pour valider l'exactitude des règles. |
| `deboguerMessageById(id)` | Fournit un diagnostic complet et détaillé pour un identifiant de message précis. |
| `ajouterALaListeBlanche(domain)` | Ajoute un expéditeur ou domaine d'expéditeur fiable à la liste blanche pour cesser les alertes. |

---

### 🛠️ Architecture du Code

- **[Principal.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/Principal.gs)** : Fichier d'accès et d'orchestration central (déclencheurs, alertes, synthèse hebdomadaire et tests).
- **[DetecteurUsurpation.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/DetecteurUsurpation.gs)** : Moteur d'analyse (contrôles SPF/DMARC, recherche de liens dans le corps du mail, et menaces sur les pièces jointes).
- **[Marque.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/Marque.gs)** : Base de données des marques de confiance surveillées et règles d'usurpation.
- **[Homoglyphes.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/Homoglyphes.gs)** : Dictionnaire de traduction et normalisation des caractères unicode trompeurs.
- **[Cache.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/Cache.gs)** : Gestion du cache persistant (snapshots d'analyse et statistiques hebdomadaires).

---

### 👤 Auteur

- **[Fabrice Faucheux](https://faucheux.bzh)** (FF Labs) - [GitHub](https://github.com/FabriceFx)

---

### 📄 Licence

Ce projet est disponible sous licence **MIT**. Pour plus d'informations, veuillez consulter le fichier [LICENSE](LICENSE).

---

## 🇬🇧 English Version

> Unspoofer is a robust Google Apps Script tool that protects your Gmail inbox from display-name spoofing, homoglyph attacks, typosquatting, and malicious email content.

<a href="https://developers.google.com/apps-script"><img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-indigo?style=for-the-badge" alt="License: MIT"></a>

---

### ✨ Key Features

- 🛡️ **Brand Impersonation Detection**: Continuously monitors over 80 well-known brands (government, banking, tech, telecom, etc.).
- 🔗 **Advanced Body Scan**: Detects hidden typosquatting links inside the email body (e.g. `paypa1.com`).
- 🔄 **Reply-To Validation**: Identifies when reply addresses suspiciously mismatch the sender's actual domain.
- 📦 **Attachment Shield**: Highlights and flags potentially dangerous file extensions (`.html`, `.exe`, `.js`, `.iso`, etc.).
- 🔑 **SPF / DKIM / DMARC Validation**: Evaluates raw header authentication logs to catch spoofed configurations.
- 🔠 **Homoglyph Normalization**: Uncovers visual fraud utilizing Greek, Cyrillic, or other lookalike character families.
- 🚦 **Priority Severity Levels**: Categorization (🔴 Critical, 🟠 High, 🟡 Medium) to highlight severe threats.
- 📊 **Automated Reporting**: Runs quick background checks every 10 minutes and delivers a **Weekly Summary Report** every Monday morning.

---

### 🚀 Installation & Setup

1. Copy all script files into your Google Apps Script editor.
2. Select and run `configurer()` once to generate the Gmail alert label and register time-driven triggers.
3. Grant the required security scopes for Gmail and script interactions.

---

### 📖 Main Functions Reference

| Function | Description |
| :--- | :--- |
| `configurer()` | Sets up the Gmail warning label and standard background checks (10 mins) and weekly report. |
| `analyserBoiteReception()` | Triggers a paginated manual check optimized to stay within API rate quotas. |
| `reanalyserBoiteReception()` | Resets analyzed snapshots cache to launch a thorough and deep verification. |
| `testerDetection()` | Executes 30+ internal simulated threat cases to prove detector accuracy. |
| `deboguerMessageById(id)` | Outputs granular developer diagnosis logs for a specific message ID. |
| `ajouterALaListeBlanche(domain)` | Registers trusted sender domains to the whitelist to suppress fake positives. |

---

### 🛠️ Project Structure

- **[Principal.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/Principal.gs)**: Main logic handler (triggers orchestration, notifications, weekly reports, and testing unit).
- **[DetecteurUsurpation.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/DetecteurUsurpation.gs)**: core scanner engine (SPF/DMARC headers, typosquatting crawler, and attachment checking).
- **[Marque.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/Marque.gs)**: Regulated brands database and impersonation regex definitions.
- **[Homoglyphes.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/Homoglyphes.gs)**: Unicode lookalike table parser.
- **[Cache.gs](file:///Users/fabrice/Documents/Mes%20développements/Détecteur%20Phishing/Cache.gs)**: Persistent storage management (analyzed emails history cache and weekly metrics tracking).

---

### 👤 Author

- **[Fabrice Faucheux](https://faucheux.bzh)** (FF Labs) - [GitHub](https://github.com/FabriceFx)

---

### 📄 License

This project is licensed under the terms of the **MIT License**.

---
<p align="center"><a href="https://faucheux.bzh" target="_blank" style="color: inherit; text-decoration: none;">&lt;&gt; par Fabrice Faucheux</a></p>
