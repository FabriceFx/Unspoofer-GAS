# 📦 Unspoofer — Gmail Phishing & Spoofing Detector

[🇫🇷 Version Française](#-version-française) | [🇬🇧 English Version](#-english-version)

---

## 🇫🇷 Version Française

> Unspoofer est un outil Google Apps Script robuste qui protège votre boîte de réception Gmail contre l'usurpation de nom d'affichage, les attaques par homoglyphes, le typosquatting, les écarts de liens cachés et les contenus d'emails malveillants, gérable depuis un tableau de bord moderne.

<a href="https://developers.google.com/apps-script"><img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-indigo?style=for-the-badge" alt="License: MIT"></a>
<a href="README.md"><img src="https://img.shields.io/badge/Status-Production-brightgreen?style=for-the-badge" alt="Status: Production"></a>
<a href="CHANGELOG.md"><img src="https://img.shields.io/badge/Version-2.4.0-0b57d0?style=for-the-badge" alt="Version 2.4.0"></a>

---

### ✨ Fonctionnalités clés

- 🛡️ **Détection d'usurpation de marque** : **191 domaines** surveillés en continu (banques, services publics, télécoms, énergie, assurance, e-commerce, transport, crypto), complétés par 30 groupes de domaines liés et 14 noms usuels d'organismes — « Assurance Maladie » est ainsi rapproché d'`ameli.fr`.
- 🇫🇷 **Marques françaises en plusieurs mots** : « Crédit Agricole », « Société Générale », « La Banque Postale » sont reconnues malgré les espaces et les accents, via une comparaison sous forme compacte.
- 🔗 **Analyse des écarts de liens HTML** : Détecte les liens frauduleux où le texte affiché simule un domaine de confiance (ex: `paypal.com`) alors que la cible réelle (`href`) pointe vers un site externe.
- 🔀 **Typosquatting étendu par mots-clés** : Identifie l'association frauduleuse de termes de phishing (ex: `security`, `update`, `verification`) avec des marques de confiance (ex: `paypal-security-update.com`).
- 🔄 **Validation du Reply-To** : Repère automatiquement lorsque l'adresse de réponse diverge suspectement du domaine expéditeur réel.
- 📦 **Protection des pièces jointes** : Détecte et signale les extensions de fichiers potentiellement dangereuses (`.html`, `.exe`, `.js`, `.iso`, etc.).
- 🔑 **Vérification SPF / DKIM / DMARC** : Analyse des en-têtes d'authentification bruts pour identifier les échecs d'alignement.
- 🔠 **Normalisation des homoglyphes** : **126 caractères** cyrilliques, grecs ou pleine largeur ramenés à leur équivalent latin pour démasquer les imitations visuelles.
- 🎚️ **Listes de référence modifiables à chaud** : Les 35 plateformes d'envoi tierces (Brevo, SendGrid, Mailjet, Eventbrite…) et les libellés de marque ambigus se règlent depuis le tableau de bord, sans redéploiement. Une valeur par défaut peut être neutralisée durablement.
- 🎯 **Faux positifs maîtrisés** : Les libellés qui sont aussi des mots courants (`orange`, `square`, `free`, `wise`) exigent une corroboration avant de déclencher — « Square Habitat » ou « L'Orange Bleue » ne sont pas signalés.
- 🚀 **Cache hybride RAM & sérialisation compacte** : Double couche de mise en cache ultra-rapide (RAM `CacheService` + chaîne compressée délimitée par des virgules dans `ScriptProperties`) étendant la capacité jusqu'à 500 messages sans perte de performance.
- 🎨 **Tableau de bord interactif** : Interface d'administration en Material Design 3 responsive (statistiques KPIs, recherche en liste blanche, ajout de marques personnalisées et banc d'essais interactif).
- 🧪 **Banc de test exécutable** : Un corpus de 64 messages étiquetés mesure le taux de détection et de faux positifs hors Apps Script — voir [`tests/`](tests/).

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
| `getListesModifiables()` | Retourne les listes de référence et l'origine de chaque entrée (livrée, ajoutée, neutralisée). |
| `ajouterEntreeListe(liste, valeur)` | Ajoute une plateforme d'envoi ou un libellé ambigu, ou réactive une valeur par défaut retirée. |
| `retirerEntreeListe(liste, valeur)` | Retire une entrée. Sur une valeur par défaut, le retrait est mémorisé et survit aux mises à jour. |
| `reinitialiserListe(liste)` | Annule toutes les modifications et revient aux valeurs livrées. |

---

### 🛠️ Architecture du code

- **[Principal.gs](Principal.gs)** : Orchestrateur central d'analyse, d'alertes email et de rapports.
- **[DetecteurUsurpation.gs](DetecteurUsurpation.gs)** : Moteur d'analyse (SPF/DKIM, analyse de liens HTML trompeurs et pièces jointes).
- **[Marque.gs](Marque.gs)** : Base des marques surveillées (domaines, groupes liés, alias, libellés ambigus) et détection de typosquatting.
- **[Listes.gs](Listes.gs)** : Listes de référence modifiables sans redéploiement — défauts, ajouts et retraits de l'utilisateur.
- **[Homoglyphes.gs](Homoglyphes.gs)** : Normalisation des caractères trompeurs : homoglyphes Unicode, accents, forme compacte.
- **[Serveur.gs](Serveur.gs)** : API de contrôle backend RPC gérant la liste blanche, les listes de référence, les déclencheurs et les rapports de test.
- **[Cache.gs](Cache.gs)** : Gestion de la double couche de cache et compactage de persistance.
- **[Config.gs](Config.gs)** : Constantes globales, palette et dictionnaire bilingue des alertes.
- **[Utils.gs](Utils.gs)** : Utilitaires partagés (identité du propriétaire, langue, échappement HTML).
- **[Dashboard.html](Dashboard.html)** : Vue client du tableau de bord d'administration de sécurité.
- **[tests/](tests/)** : Banc de test exécutant le moteur hors Apps Script sur un corpus étiqueté.

---

### 👤 Auteur

- **[Fabrice Faucheux](https://faucheux.bzh)** - [GitHub](https://github.com/FabriceFx)

---

### 📄 Licence

Ce projet est disponible sous licence **MIT**. Pour plus d'informations, veuillez consulter le fichier [LICENSE](LICENSE).

---

## 🇬🇧 English Version

> Unspoofer is a robust Google Apps Script tool that protects your Gmail inbox from display-name spoofing, homoglyph attacks, typosquatting, misleading HTML link mismatches, and malicious email content, all manageable from an intuitive control dashboard.

<a href="https://developers.google.com/apps-script"><img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-indigo?style=for-the-badge" alt="License: MIT"></a>
<a href="README.md"><img src="https://img.shields.io/badge/Status-Production-brightgreen?style=for-the-badge" alt="Status: Production"></a>
<a href="CHANGELOG.md"><img src="https://img.shields.io/badge/Version-2.4.0-0b57d0?style=for-the-badge" alt="Version 2.4.0"></a>

---

### ✨ Key Features

- 🛡️ **Brand Impersonation Detection**: Continuously monitors **191 domains** (banking, government services, telecom, energy, insurance, e-commerce, shipping, crypto), backed by 30 related-domain groups and 14 common organisation names — so "Assurance Maladie" resolves to `ameli.fr`.
- 🇫🇷 **Multi-word brand names**: "Crédit Agricole", "Société Générale" and "La Banque Postale" are matched despite spaces and accents, through a compacted comparison form.
- 🔗 **HTML Link Mismatch Detection**: Catch visual spoof attempts where the link anchor text claims a trusted domain but `href` targets elsewhere.
- 🔀 **Keyword Typosquatting Scanning**: Intercepts domains associating phishing keywords (e.g. `security`, `update`, `login`) with regulated brands.
- 🔄 **Reply-To Validation**: Identifies when reply addresses suspiciously mismatch the sender's actual domain.
- 📦 **Attachment Shield**: Highlights and flags potentially dangerous file extensions (`.html`, `.exe`, `.js`, `.iso`, etc.).
- 🔑 **SPF / DKIM / DMARC Validation**: Evaluates raw header authentication logs to catch spoofed configurations.
- 🔠 **Homoglyph Normalization**: **126 characters** from Cyrillic, Greek and full-width ranges folded back to their Latin equivalent to expose visual lookalikes.
- 🎚️ **Hot-editable reference lists**: The 35 third-party sending platforms (Brevo, SendGrid, Mailjet, Eventbrite…) and the ambiguous brand labels are managed from the dashboard, with no redeployment. A shipped default can be disabled for good.
- 🎯 **False positives under control**: Labels that are also common words (`orange`, `square`, `free`, `wise`) require corroboration before triggering — real businesses such as "Square Habitat" are not flagged.
- 🚀 **RAM Hybrid Cache & Compression**: Fast access utilizing RAM `CacheService` backed by comma-separated hex compacting inside `ScriptProperties` to track 500+ messages.
- 🎨 **Material Design 3 Dashboard**: Web App administration panel supporting KPI statistics, real-time logging, custom brands, interactive unit tests, and whitelist controls.
- 🧪 **Executable test bench**: A 64-message labelled corpus measures detection and false-positive rates outside Apps Script — see [`tests/`](tests/).

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
| `getListesModifiables()` | Returns the reference lists with the origin of each entry (shipped, added, disabled). |
| `ajouterEntreeListe(list, value)` | Adds a sending platform or an ambiguous label, or re-enables a removed default. |
| `retirerEntreeListe(list, value)` | Removes an entry. On a shipped default, the removal is stored and survives updates. |
| `reinitialiserListe(list)` | Discards every change and restores the shipped values. |

---

### 🛠️ Project Structure

- **[Principal.gs](Principal.gs)**: Main logic handler (triggers orchestration, notifications, weekly reports, and testing unit).
- **[DetecteurUsurpation.gs](DetecteurUsurpation.gs)**: Core scanner engine (SPF/DMARC headers, typosquatting crawler, and attachment checking).
- **[Marque.gs](Marque.gs)**: Monitored brand database (domains, related groups, aliases, ambiguous labels) and typosquatting detection.
- **[Listes.gs](Listes.gs)**: Reference lists editable without redeployment — shipped defaults, user additions and removals.
- **[Homoglyphes.gs](Homoglyphes.gs)**: Deceptive character normalization: Unicode homoglyphs, accents, compacted form.
- **[Serveur.gs](Serveur.gs)**: Backend controller exposing RPC channels for Whitelist, Custom Brands, reference lists, and Unit Tests.
- **[Cache.gs](Cache.gs)**: Persistent storage management (analyzed emails history cache and weekly metrics tracking).
- **[Config.gs](Config.gs)**: Global constants, palette, and the bilingual alert dictionary.
- **[Utils.gs](Utils.gs)**: Shared helpers (owner identity, language, HTML escaping).
- **[Dashboard.html](Dashboard.html)**: Front-end client Material Design 3 administrative view template.
- **[tests/](tests/)**: Test bench running the engine outside Apps Script against a labelled corpus.

---

### 👤 Author

- **[Fabrice Faucheux](https://faucheux.bzh)** - [GitHub](https://github.com/FabriceFx)

---

### 📄 License

This project is licensed under the terms of the **MIT License**.

---
<p align="center"><a href="https://faucheux.bzh" target="_blank" style="color: inherit; text-decoration: none;">&lt;&gt; par Fabrice Faucheux</a></p>
