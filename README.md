# 🛡️ Unspoofer — Gmail Phishing & Spoofing Detector

[**English**](#english) | [**Français**](#français)

---

<a name="english"></a>
## 🇺🇸 English

**Unspoofer** is a Google Apps Script tool that protects your Gmail inbox from **display-name spoofing**, **homoglyph attacks**, and **typosquatting**, common techniques in advanced phishing.

### 🚀 Features
- **Brand Impersonation Detection**: 80+ monitored brands (tech, banks, French public services, telecoms…)
- **Homoglyph Normalization**: Detects Cyrillic, Greek, and fullwidth lookalike characters
- **Typosquatting Detection**: Catches domains suspiciously close to known brands (e.g. `paypa1.com`)
- **SPF / DKIM / DMARC Verification**: Analyzes raw authentication headers for failures
- **Suspicious Platform Analysis**: Flags emails from Firebase, AppSpot, etc.
- **Severity Levels**: 🔴 Critical, 🟠 High, 🟡 Medium — prioritize what matters
- **Automation**: Label, star, and email summary every 10 minutes
- **Whitelist**: Exclude trusted senders to avoid false positives
- **Persistent Statistics**: Track total scans, detections, and executions over time

### 🛠 Setup
1. Copy all `.gs` files into a Google Apps Script project
2. Run `configurer()` to create the label and set up the trigger
3. Authorize required permissions

### 📖 Functions
| Function | Description |
|---|---|
| `configurer()` | Initialize label + 10-min trigger |
| `analyserBoiteReception()` | Manual scan (paginated, time-limited) |
| `reanalyserBoiteReception()` | Clear cache and rescan |
| `testerDetection()` | Run 27 built-in test cases |
| `ajouterALaListeBlanche('domain')` | Whitelist a sender |
| `afficherStatistiques()` | View cumulative stats |
| `desinstaller()` | Remove triggers and clear cache |

---

<a name="français"></a>
## 🇫🇷 Français

**Unspoofer** est un outil Google Apps Script qui protège votre boîte Gmail contre l'**usurpation de nom d'affichage**, les **attaques par homoglyphes** et le **typosquatting**.

### 🚀 Fonctionnalités
- **Détection d'usurpation de marque** : 80+ marques surveillées (tech, banques françaises, services publics, télécoms…)
- **Normalisation des homoglyphes** : Détecte les caractères cyrilliques, grecs et pleine largeur
- **Détection du typosquatting** : Repère les domaines suspects (ex : `paypa1.com` ≈ `paypal.com`)
- **Vérification SPF / DKIM / DMARC** : Analyse les en-têtes d'authentification
- **Analyse des plateformes suspectes** : Signale Firebase, AppSpot, etc.
- **Niveaux de sévérité** : 🔴 Critique, 🟠 Élevée, 🟡 Moyenne
- **Automatisation** : Étiquette, étoile et résumé par email toutes les 10 minutes
- **Liste blanche** : Exclure les expéditeurs de confiance
- **Statistiques persistantes** : Suivi cumulé des analyses et détections

### 🛠 Installation
1. Copiez tous les fichiers `.gs` dans un projet Google Apps Script
2. Exécutez `configurer()` pour créer l'étiquette et le déclencheur
3. Autorisez les permissions requises

### 📖 Fonctions
| Fonction | Description |
|---|---|
| `configurer()` | Initialise l'étiquette + déclencheur 10 min |
| `analyserBoiteReception()` | Analyse manuelle (paginée, limitée en temps) |
| `reanalyserBoiteReception()` | Vide le cache et réanalyse |
| `testerDetection()` | Exécute 27 cas de test intégrés |
| `ajouterALaListeBlanche('domaine')` | Ajouter à la liste blanche |
| `afficherStatistiques()` | Voir les stats cumulées |
| `desinstaller()` | Supprime les déclencheurs et vide le cache |

---

## 📂 Structure

| File | Role |
|---|---|
| `Principal.gs` | Orchestration, triggers, alerts, tests |
| `DetecteurUsurpation.gs` | Detection engine, SPF/DMARC, severity |
| `Marque.gs` | Brand database, related domains, typosquatting |
| `Homoglyphes.gs` | Unicode homoglyph mapping |
| `Cache.gs` | Processed message cache, statistics |

## ⚖️ License

[MIT](LICENSE)

## ⚠️ Disclaimer

No detection system is perfect. Use as an additional security layer.

*Aucun système de détection n'est infaillible. Utilisez cet outil comme couche de sécurité supplémentaire.*
