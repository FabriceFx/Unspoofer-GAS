# 🛡️ Unspoofer — Gmail Phishing & Spoofing Detector

[**English Version**](#english) | [**Version Française**](#français)

---

<a name="english"></a>
## 🇺🇸 English Version

**Unspoofer** is a Google Apps Script tool designed to protect your Gmail inbox from **display-name spoofing** and **homoglyph attacks**, common techniques used in advanced phishing.

### 🚀 Key Features
- **Intelligent Detection**: Identifies emails impersonating major brands (Google, PayPal, Microsoft, etc.) while originating from unrelated addresses.
- **Homoglyph Normalization**: Detects lookalike characters (e.g., Cyrillic 'о' vs Latin 'o') used to deceive the human eye.
- **Suspicious Platform Analysis**: Monitors emails from frequently abused services like Firebase or AppSpot.
- **DKIM Verification**: Scans raw headers for suspicious signatures even on custom domains.
- **Automation**: 
    - Automatically applies the `SPOOF-ALERT` label.
    - Stars suspicious messages.
    - Sends an email summary if threats are detected.
- **Whitelist**: Easily exclude trusted domains or emails to avoid false positives.

### 🛠 Setup
1. **Copy Files**: Copy all `.gs` files into your Google Apps Script project.
2. **Configure**: Select the `configurer` function and click **Run**.
3. **Permissions**: Authorize the required permissions (Gmail access, background execution).
4. **Active Protection**: The script will create the necessary label and set up a 10-minute trigger automatically.

### 📖 Usage
- **`configurer()`**: Initializes the environment (label and trigger).
- **`analyserBoiteReception()`**: Manually scan messages from the last 3 days.
- **`reanalyserBoiteReception()`**: Clear the cache and run a fresh scan of recent emails.
- **`testerDetection()`**: Run built-in tests to verify the detection logic.

---

<a name="français"></a>
## 🇫🇷 Version Française

**Unspoofer** est un outil Google Apps Script conçu pour protéger votre boîte Gmail contre l'**usurpation de nom d'affichage** et les **attaques par homoglyphes**, techniques courantes utilisées dans le phishing avancé.

### 🚀 Fonctionnalités Clés
- **Détection Intelligente** : Identifie les emails usurpant l'identité de grandes marques (Google, PayPal, Microsoft, etc.) alors qu'ils proviennent d'adresses non liées.
- **Normalisation des Homoglyphes** : Détecte les caractères visuellement similaires (ex : 'о' cyrillique vs 'o' latin) utilisés pour tromper l'œil humain.
- **Analyse des Plateformes Suspectes** : Surveille les emails provenant de services souvent détournés comme Firebase ou AppSpot.
- **Vérification DKIM** : Analyse les en-têtes bruts pour repérer les signatures suspectes, même sur des domaines personnalisés.
- **Automatisation** : 
    - Applique automatiquement l'étiquette `ALERTE-USURPATION`.
    - Ajoute une étoile aux messages suspects.
    - Envoie un récapitulatif par email si des menaces sont détectées.
- **Liste Blanche** : Possibilité d'exclure facilement des domaines ou emails de confiance.

### 🛠 Installation
1. **Copier les fichiers** : Copiez tous les fichiers `.gs` dans votre projet Google Apps Script.
2. **Configurer** : Sélectionnez la fonction `configurer` et cliquez sur **Exécuter**.
3. **Permissions** : Autorisez les permissions requises (accès Gmail, exécution en arrière-plan).
4. **Protection Active** : Le script créera l'étiquette nécessaire et configurera un déclencheur automatique toutes les 10 minutes.

### 📖 Utilisation
- **`configurer()`** : Initialise l'environnement (étiquette et déclencheur).
- **`analyserBoiteReception()`** : Analyse manuellement les messages des 3 derniers jours.
- **`reanalyserBoiteReception()`** : Vide le cache et lance une nouvelle analyse des emails récents.
- **`testerDetection()`** : Exécute les tests intégrés pour vérifier la logique de détection.

---

## 📂 Project Structure / Structure du Projet

- **`Principal.gs`** : Main orchestration, triggers, and email alerts. / *Orchestration principale, déclencheurs et alertes email.*
- **`DetecteurUsurpation.gs`** : Core detection logic and header analysis. / *Logique de détection et analyse des en-têtes.*
- **`Marque.gs`** : Database of monitored brands and related domains. / *Base de données des marques et domaines liés.*
- **`Homoglyphes.gs`** : Mapping table for Unicode homoglyph normalization. / *Table de correspondance pour les homoglyphes.*
- **`Cache.gs`** : Caching system to prevent redundant scans. / *Système de cache pour éviter les analyses redondantes.*

---

## ⚖️ License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer / Avertissement

While powerful, no detection system is perfect. Use this tool as an additional layer of security and always remain vigilant.

*Bien que puissant, aucun système de détection n'est infaillible. Utilisez cet outil comme une couche de sécurité supplémentaire.*
