# Banc de test du moteur de détection

Ce dossier permet d'exécuter le moteur de détection d'Unspoofer **hors de Google
Apps Script**, sur un corpus de messages de référence, et d'en mesurer les
performances.

## Lancer

```bash
node tests/run.js
```

Et pour les listes de référence modifiables à chaud (plateformes d'envoi
tierces, libellés de marque ambigus) :

```bash
node tests/listes.js
```

Les contrôles statiques du tableau de bord :

```bash
node tests/dashboard.js
```

Et la suite de vingt cas intégrée au produit, celle qu'expose l'onglet
« Suite de tests » :

```bash
node tests/suite-integree.js
```

Cette suite construit un faux `GmailMessage` à la main. Dès que le moteur
appelle une méthode absente de ce faux message, elle lève une exception au
premier cas et l'onglet reste vide, sans message d'erreur — ce qui s'est
produit lorsqu'un correctif a introduit un appel à `getSubject()`. Le corpus de
`run.js` ne couvrait pas ce risque : il fabrique ses propres messages et
n'emprunte jamais ce chemin.

Le tableau de bord n'est exécuté nulle part avant d'être déployé : une fonction
appelée sous un nom qui n'existe pas ne se manifeste qu'au clic de
l'utilisateur, sans erreur visible. `dashboard.js` vérifie que le script
compile, que toute fonction appelée — y compris depuis un `onclick` — est bien
définie, que les dictionnaires fr/en ont les mêmes clés, qu'aucune clé n'est
manquante ni orpheline, que chaque onglet a son contenu, et que le balisage est
équilibré.

Aucune dépendance : uniquement Node.js (module `vm` de la bibliothèque standard).

| Option | Effet |
|---|---|
| `--json` | Sortie machine, redirigeable vers un fichier |
| `--baseline <fichier>` | Compare la mesure courante à une référence figée |
| `--strict` | Code de sortie 1 s'il reste un écart (utilisable en intégration continue) |

Figer une nouvelle référence :

```bash
node tests/run.js --json > tests/baseline.json
```

## Comment ça marche

`harness.js` charge les fichiers `.gs` **du dépôt, tels quels** dans un contexte
`vm`, en bouchonnant les services Google utilisés (`Session`,
`PropertiesService`, `Logger`) et en fournissant un faux `GmailMessage`. Aucun
code de production n'est dupliqué : le banc teste le moteur réellement déployé.

Un contexte neuf est créé pour **chaque** cas, ce qui reproduit l'isolation
d'une exécution Apps Script — les compteurs de quota (`_appelsRawContent`,
`_appelsPlainBody`) et les caches de module repartent à zéro, comme en
production.

Le motif de détection est retrouvé en recompilant les gabarits de
`EMAIL_TRANSLATIONS` (Config.gs) en expressions régulières. Cela permet de
vérifier **quel contrôle** a déclenché, sans ajouter de champ au code de
production.

## Le corpus

`corpus.json` contient des cas étiquetés `legitime` (ne doit pas être signalé)
ou `phishing` (doit être signalé). Pour le phishing, `motifAttendu` indique
quel contrôle devrait déclencher : un message détecté par le mauvais contrôle
est compté comme « mal qualifié » — la menace est vue, mais mal classée, donc
mal priorisée pour l'utilisateur.

Les cas marqués `discutable` relèvent d'un choix de politique defendable dans
les deux sens (par exemple : faut-il signaler toute archive `.zip` ?). Ils sont
comptés à part pour ne pas fausser les indicateurs.

Toutes les données sont fictives. Les domaines non institutionnels utilisent
`exemple.fr` ou des suffixes `-random.tk`. Aucun message ni adresse réelle.

## Portée de la mesure — à lire avant de citer un chiffre

Ce corpus a été écrit **à partir de l'audit du moteur**. Il est donc orienté
vers les défauts connus et les comportements que l'on souhaite préserver.

Ce qu'il démontre :

- une **non-régression** : un correctif ne casse pas un comportement acquis ;
- un **écart avant / après** sur un jeu de cas constant ;
- une **spécification exécutable** : chaque cas documente une décision de
  conception, avec sa justification dans le champ `note`.

Ce qu'il ne démontre **pas** :

- un taux de détection en conditions réelles. Un score de 100 % sur un corpus
  écrit par l'auteur du correctif ne se transpose pas à une boîte de réception ;
- une couverture des attaques absentes du corpus (punycode, redirections en
  chaîne, pièces jointes chiffrées, usurpation par compte légitime compromis) ;
- la distribution réelle du trafic : un corpus équilibré 50/50 ne reflète pas
  une boîte où le phishing est rare, où le même taux de faux positifs devient
  bien plus pénalisant.

Pour une mesure transposable, il faudrait un corpus externe et indépendant
(par exemple des collections publiques de courriels d'hameçonnage), étiqueté
sans connaissance des correctifs.

## Ajouter un cas

Ajouter une entrée dans `corpus.json` :

```json
{
  "id": "P33-mon-cas",
  "categorie": "phishing_marque",
  "attendu": "phishing",
  "motifAttendu": "reasonImpersonation",
  "de": "\"Marque\" <contact@domaine-suspect-random.tk>",
  "objet": "Objet du message",
  "note": "Pourquoi ce cas doit être détecté."
}
```

Champs disponibles : `de`, `replyTo`, `objet`, `corpsTexte`, `corpsHtml`,
`piecesJointes` (tableau de noms), `enTetes` (en-têtes bruts),
`severiteAttendue`, `discutable`.

## Tester les listes modifiables

`listes.js` vérifie qu'un ajout ou un retrait effectué depuis le tableau de bord
change réellement le comportement du moteur. Le harnais expose pour cela deux
fonctions :

```js
const { analyser, executer } = require('./harness.js');

const stockage = {};   // ScriptProperties partagées entre les appels

executer("ajouterEntreeListe('plateformesTierces', 'sendgrid.net')", { stockage });
const { resultat } = analyser(monCas, { stockage });
```

Chaque appel crée un contexte neuf — l'état de module repart à zéro, comme
entre deux exécutions Apps Script — mais `stockage` persiste, exactement comme
les propriétés du script en production.
