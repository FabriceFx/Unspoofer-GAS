# 🛡️ Unspoofer — Gmail Phishing & Spoofing Detector

**Unspoofer** is a Google Apps Script tool designed to protect your Gmail inbox from **display-name spoofing** and **homoglyph attacks**, common techniques used in advanced phishing.

*Unspoofer est un outil Google Apps Script conçu pour protéger votre boîte Gmail contre l'usurpation de nom d'affichage et les attaques par homoglyphes.*

---

## 🚀 Key Features / Fonctionnalités

- **Intelligent Detection** / *Détection Intelligente* : Identifies emails impersonating major brands (Google, PayPal, Microsoft, etc.) while originating from unrelated addresses.
- **Homoglyph Normalization** / *Normalisation des Homoglyphes* : Detects lookalike characters (e.g., Cyrillic 'о' vs Latin 'o') used to deceive the human eye.
- **Suspicious Platform Analysis** / *Analyse des Plateformes Suspectes* : Monitors emails from frequently abused services like Firebase or AppSpot.
- **DKIM Verification** / *Vérification DKIM* : Scans raw headers for suspicious signatures even on custom domains.
- **Automation** / *Automatisation* : 
    - Automatically applies the `ALERTE-USURPATION` label.
    - Stars suspicious messages.
    - Sends an email summary if threats are detected.
- **Whitelist** / *Liste Blanche* : Easily exclude trusted domains or emails to avoid false positives.

---

## 🛠 Setup / Installation

1. **Copy Files** : Copy all `.gs` files into your Google Apps Script project.
2. **Configure** : Select the `configurer` function and click **Run**.
3. **Permissions** : Authorize the required permissions (Gmail access, background execution).
4. **Active Protection** : The script will create the necessary label and set up a 10-minute trigger automatically.

---

## 📖 Usage / Utilisation

### Core Functions / Fonctions Principales
- **`configurer()`** : Initializes the environment (label and trigger).
- **`analyserBoiteReception()`** : Manually scan messages from the last 3 days.
- **`reanalyserBoiteReception()`** : Clear the cache and run a fresh scan of recent emails.
- **`testerDetection()`** : Run built-in tests to verify the detection logic.

### Whitelist Management / Gestion de la Liste Blanche
- **`ajouterALaListeBlanche('domain.com')`** : Add a trusted domain or email.
- **`retirerDeLaListeBlanche('domain.com')`** : Remove an entry.
- **`afficherListeBlanche()`** : View your current whitelist in the execution logs.

---

## 📂 Project Structure / Structure du Projet

- **`Principal.gs`** : Main orchestration, triggers, and email alerts.
- **`DetecteurUsurpation.gs`** : Core detection logic and header analysis.
- **`Marque.gs`** : Database of monitored brands and related domains.
- **`Homoglyphes.gs`** : Mapping table for Unicode homoglyph normalization.
- **`Cache.gs`** : Caching system to prevent redundant scans.

---

## ⚖️ License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer / Avertissement

While powerful, no detection system is perfect. Use this tool as an additional layer of security and always remain vigilant when handling sensitive emails.

*Bien que puissant, aucun système de détection n'est infaillible. Utilisez cet outil comme une couche de sécurité supplémentaire.*
