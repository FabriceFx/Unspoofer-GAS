# Journal des modifications

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [2.5.0] — 2026-08-16

Une version d'usage réel. Elle part d'un constat d'utilisateur — « l'interface
n'explique rien » — et se termine par la correction de trois pannes silencieuses
que personne n'aurait vues : une protection à l'arrêt qui s'annonçait active,
une sous-détection par épuisement de quota, et une suite de tests qui ne
s'exécutait plus depuis des mois.

L'interface devient bilingue et adopte les codes de Google Workspace, les
listes de référence construites en 2.4.0 deviennent enfin utilisables, et six
suites de tests couvrent désormais ce que la précédente version ne mesurait
pas.

### Ajouté

- **Onglet « Guide »** dans le tableau de bord : à quoi sert l'outil, démarrage
  en trois étapes, ce qui se produit en cas de détection (étiquette, étoile,
  e-mail — aucune suppression ni déplacement), signification des trois niveaux
  de sévérité, marche à suivre quand un message légitime est signalé, lecture
  des quatre indicateurs, et note de confidentialité.
- **Encart de première utilisation** sur l'onglet « Statut », affiché tant
  qu'aucune analyse n'a eu lieu. Des indicateurs à zéro sans explication
  laissaient l'utilisateur sans point de départ.
- Aide contextuelle sur les onglets « Marques perso » (distinction entre le nom,
  qui sert à reconnaître, et le domaine, qui sert à vérifier) et « Suite de
  tests » (préciser qu'aucun e-mail réel n'est lu).

### Corrigé

- L'onglet « Marques perso » annonçait « plus de 80 marques » — dernier endroit
  du projet où subsistait ce chiffre périmé. Corrigé en 191 domaines.
- `switchTab()` retrouvait l'onglet actif en comparant le libellé visible du
  bouton. Le repérage passe par un attribut `data-tab` : l'ancienne heuristique
  aurait mal réagi à l'ajout d'un cinquième onglet.

- **Interface web bilingue.** Le tableau de bord existe désormais en français et
  en anglais, avec un sélecteur dans l'en-tête. Dictionnaire `UI_TRANSLATIONS`
  (95 clés, parité vérifiée) dans `Config.gs`, aux côtés d'`EMAIL_TRANSLATIONS` ;
  application au DOM via les attributs `data-i18n`, `data-i18n-html`,
  `data-i18n-placeholder` et `data-i18n-title`. Le texte français reste écrit
  dans le HTML et sert de repli si une clé venait à manquer.
- `setLangue()` : point d'accès de changement de langue, la préférence étant
  conservée dans les propriétés du script.

- `diagnostiquerAlertes()` : compare le compteur « usurpations bloquées » au
  nombre de fils portant réellement l'étiquette dans Gmail, et explique l'écart
  (étiquette supprimée, messages effacés depuis, compteur cumulatif). Affiche
  les dix derniers messages signalés et la recherche Gmail à utiliser.

- **Aucun plafond sur la liste blanche ni sur les marques personnalisées.** Une
  valeur de propriété Apps Script est limitée à 9 Ko. Au-delà, l'écriture lève
  une exception qui était avalée : l'ajout échouait, l'interface annonçait un
  succès, et l'entrée disparaissait au rechargement. `ecrireProprieteLimitee_()`
  mesure désormais la taille UTF-8 avant d'écrire et refuse proprement ; le
  tableau de bord affiche un message explicite et **conserve la saisie** pour
  qu'elle ne soit pas perdue avec l'ajout. En pratique : environ 249 entrées de
  liste blanche et 115 marques personnalisées.
- **La suite de tests intégrée ne s'exécutait plus du tout.** Le faux
  `GmailMessage` qu'elle construit ne fournissait pas `getSubject()`, appelé par
  le moteur depuis le garde-fou anti-boucle d'auto-alerte introduit en mai. La
  suite levait une exception dès le premier cas : le bouton ne produisait aucun
  résultat et aucun message d'erreur. `tests/suite-integree.js` couvre désormais
  ce chemin, que le corpus de `run.js` n'empruntait pas.
- **Régression : l'analyse s'arrêtait dès qu'une marque était jugée légitime.**
  Le déplacement du contrôle Reply-To après l'analyse de marque avait créé un
  angle mort : un message parti du vrai domaine d'une marque sortait par un
  `return` immédiat, sans que l'adresse de réponse, les liens du corps ni les
  pièces jointes soient examinés. Un `"Amazon Support" <noreply@amazon.com>`
  avec un Reply-To détourné n'était plus détecté. L'analyse se poursuit
  désormais jusqu'au bout.
- **Attente de test erronée.** Le cas « Netflix omicron grec » exigeait qu'un
  message d'hameçonnage — nom d'affichage annonçant un domaine sans rapport avec
  l'expéditeur — ne soit **pas** signalé. Il documentait une limite du
  rapprochement de marque, mais le message reste frauduleux et le contrôle
  « domaine générique » le rattrape légitimement. Attente corrigée, cas renommé.
  La suite compte donc 14 cas frauduleux et 6 légitimes.
- **Onglet « Suite de tests » enfin explicite.** Son aide annonçait « vingt faux
  messages d'usurpation » — c'était inexact, et cela masquait l'essentiel : la
  suite compte **13 cas frauduleux et 7 cas légitimes**, et vérifie autant la
  capacité à repérer une fraude que celle à laisser passer un message honnête.
  Le texte explique désormais la composition, rappelle qu'aucun e-mail réel
  n'est lu, et indique à quoi la suite sert : contrôler qu'une modification de
  la liste blanche ou des marques personnalisées n'a rien cassé.
- Cartes de résultat refondues : elles confrontent l'attendu au verdict obtenu
  (« Menace attendue » / « Légitime attendu », puis « Conforme » ou « Écart »).
  L'ancien affichage ne montrait que le type détecté, sans permettre de
  comprendre pourquoi un cas légitime non signalé était un succès.
- **Assainissement de la surface publique.** Vingt et un auxiliaires internes
  (`extraireDomaineRacine`, `distanceLevenshtein`, `normaliserEnAscii`,
  `verifierUsurpation`, `estTraite`…) ne portaient pas le trait de soulignement
  final de la convention du projet. Ils encombraient le menu « Exécuter » de
  l'éditeur Apps Script et, surtout, **toute fonction publique est appelable
  depuis le client** via `google.script.run`. La surface publique passe de 53 à
  32 fonctions, toutes des points d'entrée assumés — 13 exposées au tableau de
  bord, les autres réservées à l'éditeur ou aux déclencheurs.
- **Onglet « Listes de référence ».** Le mécanisme construit en 2.4.0 était
  complet côté serveur, testé, documenté — et inutilisable pour qui ne lit pas
  le code. Les plateformes d'envoi tierces et les libellés de marque ambigus se
  gèrent enfin depuis l'interface : ajout, retrait, réactivation d'une valeur
  livrée neutralisée, et retour aux valeurs d'origine. L'origine de chaque
  entrée est affichée (livrée, ajoutée, désactivée).
- **Message d'attente invisible en thème clair.** Le texte du voile de
  chargement était fixé à `color: white`, hérité de l'époque où l'interface
  n'existait qu'en sombre. Il disparaissait donc sur fond clair pendant tout
  le scan. Trois autres blancs en dur souffraient du défaut symétrique en thème
  sombre : la pastille de l'interrupteur et les badges de résultat de tests,
  illisibles sur leurs fonds éclaircis. Tous passent sur des jetons qui
  s'inversent avec le thème. Le rail du rouet reprenait par ailleurs l'ancien
  bleu Google en dur, et une déclaration `opacity` en écrasait une autre dans
  le voile.
- **Choix du thème.** L'interface suivait le réglage du système sans possibilité
  de le contredire : un poste en mode sombre imposait un fond noir. Un sélecteur
  propose désormais « Thème du système », « Thème clair » et « Thème sombre »,
  la préférence étant conservée côté script comme celle de langue.
  Techniquement, le mode sombre passe d'une media query à l'attribut
  `data-theme`, résolu en JavaScript : les jetons de couleur ne sont ainsi
  définis **qu'une seule fois**, là où une media query aurait imposé de
  dupliquer tout le bloc pour gérer un choix explicite. Un script d'amorçage en
  `<head>` pose le thème avant le premier rendu, ce qui évite un flash clair.
- **Version affichée et pied de page.** `getDashboardData()` transmettait déjà
  `CONFIG.VERSION`, mais l'interface ne l'affichait nulle part : le numéro ne
  pouvait pas « bouger » à l'écran. Il apparaît désormais en pastille près du
  nom de l'application et dans un pied de page, aux côtés du site de l'auteur,
  du lien vers le code source et de la licence.
- **Bouton « Repartir de zéro ».** Efface les compteurs, la mémoire des messages
  examinés **et l'étiquetage**, puis relance une analyse. Le retrait de
  l'étiquette n'est pas cosmétique : la déduplication considère qu'un fil déjà
  étiqueté a déjà été signalé et ne le recompte pas. Vider le cache seul
  laisserait donc les compteurs à zéro après une ré-analyse complète — vérifié
  par `tests/remise-a-zero.js`, qui compare les deux séquences. Aucun message
  n'est supprimé ni déplacé : l'étiquette est reposée sur ceux toujours jugés
  frauduleux.
- **Modale de confirmation interne.** `confirm()` natif affiche, dans une webapp
  Apps Script, « Une page intégrée à l'adresse …googleusercontent.com indique » —
  l'URL interne du déploiement s'étale à l'écran et l'habillage de l'application
  disparaît. La confirmation passe par une modale au style du tableau de bord.
- **Onglet « Maintenance ».** Trois actions jusqu'ici réservées à l'éditeur
  Apps Script : le diagnostic des alertes, qui compare le compteur à ce que
  contient réellement Gmail ; la ré-analyse complète, action de reprise après
  incident ; et la remise à zéro des compteurs, sous confirmation. Aucune ne
  supprime de message.
- **Filtre du journal d'activité.** Chaque changement d'onglet produisait une
  ligne, noyant les évènements utiles. Les entrées sont désormais typées —
  `SYSTEM`, `ACTION`, `NAV`, `ERROR` — et un sélecteur propose trois vues :
  « Actions et erreurs » (par défaut, la navigation est masquée), « Tout » et
  « Erreurs seules ». Le paramètre `type` de `log()` existait déjà mais n'était
  jamais exploité pour filtrer.
- Le journal conserve au plus 200 lignes : une session longue accumulait sans
  limite des nœuds dans le DOM.
- **Icônes Material Symbols à la place des emoji.** Les titres de panneau
  portaient des emoji (🛡️, 📜, 🧪…) : Google n'en emploie jamais dans son
  interface, et c'était le signal le plus visible d'un habillage qui n'est pas
  celui de Workspace. Ils sont remplacés par des symboles Material Rounded,
  chargés depuis Google Fonts.
- **Journal d'activité traduit.** Les messages de la console restaient en
  français quelle que soit la langue : dix-huit chaînes passent par le
  dictionnaire (`logLoaded`, `logNav`, `logScanDone`…). L'interface était
  bilingue, son journal ne l'était pas.
- **Habillage Google Workspace / Material Design 3.** Le tableau de bord
  reprend la charte des applications Workspace : clair par défaut, bleu `#0b57d0`,
  Google Sans avec repli Roboto, boutons pilule, onglets en pastille tonale,
  surfaces plates délimitées par un contour plutôt que par une ombre. Le thème
  sombre devient une simple redéfinition des mêmes jetons. La palette rejoint
  celle de `CONFIG.COLORS`, jusque-là déclarée mais ignorée par l'interface.
- **Contrôle de cohérence au tableau de bord.** Si le compteur annonce des
  usurpations alors qu'aucun message ne porte l'étiquette dans Gmail, un
  bandeau l'explique et propose un scan de reprise. Le diagnostic distingue
  l'étiquette supprimée des messages effacés depuis.

### Corrigé

- **Sous-détection silencieuse par épuisement du quota d'appels Gmail.** Le
  moteur plafonne ses appels à Gmail pour éviter l'erreur « Service invoked too
  many times ». Une fois le plafond atteint, les contrôles portant sur le corps
  du message et sur les en-têtes d'authentification étaient sautés **sans
  aucune trace**, et le message était malgré tout mémorisé comme définitivement
  traité : il n'était donc jamais réexaminé. Mesuré sur 60 messages frauduleux
  identiques, 15 seulement étaient détectés, les 45 autres perdus pour de bon.
  Trois correctifs :
  - un seul appel Gmail par message pour lire le corps, partagé par la
    recherche de liens typosquattés et le contrôle des liens trompeurs. Ces
    deux contrôles téléchargeaient chacun le même message (`getPlainBody` puis
    `getBody`), divisant par deux la couverture. Elle passe de 15 à 30 messages
    par exécution ;
  - `verifierUsurpation()` signale désormais une `analysePartielle` ;
  - un message analysé partiellement n'est plus mémorisé : il est repris à
    l'exécution suivante, quota réinitialisé, et le journal indique combien de
    messages sont concernés.
- **Panne silencieuse quand l'étiquette est supprimée.** Supprimer
  `ALERTE-USURPATION` depuis Gmail la retire de tous les messages qui la
  portaient. `analyserBoiteReception()` abandonnait alors à chaque exécution :
  le déclencheur tournait toutes les 10 minutes sans rien faire, pendant que le
  tableau de bord affichait « surveillance active » et un total rassurant. Une
  protection en panne se présentait comme opérationnelle. L'étiquette est
  désormais recréée automatiquement, et le cache des messages traités est vidé
  dans la foulée pour que les messages concernés retrouvent leur étiquetage.
- **Compteur d'usurpations surévalué sur les fils à plusieurs messages.** La
  déduplication reposait sur `fil.getLabels()`, dont l'instantané ne reflète pas
  l'étiquette posée quelques lignes plus haut dans la même exécution. Un fil
  contenant plusieurs messages suspects était donc compté une fois par message
  au lieu d'une fois par fil. La déduplication passe par un `Set` d'identifiants
  de fils tenu pendant l'exécution. L'étiquetage, lui, était correct : seul le
  chiffre affiché était faux.
- Traitement des indicateurs assagi : chiffres dans la couleur du texte plutôt
  qu'en vert ou rose, étiquettes en casse normale au lieu de capitales espacées,
  et accent coloré déplacé sur le liseré latéral. Workspace réserve la couleur
  au signal, pas à la donnée. Le journal quitte le fond noir « terminal » pour
  une surface du thème.
- **Titres de panneau écartelés** par un `justify-content: space-between` hérité :
  l'icône partait à gauche, le libellé à droite.
- **Date de dernière analyse illisible.** Le tableau de bord affichait la date
  ISO brute transmise par le serveur : « Dernier passage :
  2026-08-16T15:32:23.754Z ». Le serveur renvoie désormais la valeur brute sans
  y mêler de texte, et le client la met en forme dans la langue et le fuseau du
  lecteur — « 16 août 2026, 17:32 » ou « 16 Aug 2026, 17:32 ». Au passage, le
  repli « Aucune analyse effectuée » était codé en français côté serveur et
  restait donc français en anglais.
- **Le sélecteur de langue restait sans effet.** `changerLangue()` appelait
  `showLoader()` alors que la fonction s'appelle `setLoader()`. L'exception
  survenait à la première ligne, avant tout appel au serveur : le menu changeait
  de valeur, l'interface ne bougeait pas, et rien n'apparaissait à l'écran. Ce
  défaut avait échappé aux vérifications précédentes parce qu'elles appliquaient
  le dictionnaire directement, court-circuitant la fonction fautive. D'où le
  nouveau contrôle statique.
- **La détection automatique de langue ne s'est jamais déclenchée.**
  `getLangueUtilisateur_()` testait `if (CONFIG.LANGUAGE)` avant de consulter la
  langue du compte Google — or `CONFIG.LANGUAGE` valait `"fr"`, toujours vrai.
  Les branches suivantes étaient donc du code mort, et la moitié anglaise
  d'`EMAIL_TRANSLATIONS` n'a jamais servi : **les alertes et rapports partaient
  en français à tout le monde**, y compris aux comptes anglophones. La valeur
  par défaut passe à `"auto"` et l'ordre de priorité devient explicite :
  préférence utilisateur, puis `CONFIG.LANGUAGE` si elle impose une langue,
  puis le compte Google, puis le français.

- `tests/dashboard.js` : contrôles statiques du tableau de bord — compilation du
  script client, existence de toute fonction appelée (y compris depuis les
  `onclick`) **et de toute constante référencée**, parité et complétude des
  dictionnaires, appariement des onglets, équilibre du balisage.

### Connu / non traité

- L'étiquette Gmail reste nommée `ALERTE-USURPATION` quelle que soit la langue.
  La renommer casserait les filtres et recherches déjà en place chez les
  utilisateurs existants.

---

## [2.4.0] — 2026-08-16

> **Fatigué de voir vos newsletters légitimes et vos alertes de compte finir
> en « tentative d'usurpation » ?**
>
> Un filtre qui crie au loup trop souvent, on cesse de l'écouter — et le jour
> où il a raison, on clique quand même. C'est le pire échec possible pour un
> détecteur de phishing.
>
> Nous avons donc mis le moteur sur le banc d'essai, littéralement. Le verdict
> était sans appel : **une alerte sur trois était fausse**, et près d'un
> message frauduleux sur trois passait au travers. Pire, *aucune* banque
> française au nom en plusieurs mots — Crédit Agricole, Société Générale,
> La Banque Postale — n'était reconnue depuis le nom d'affichage. Le vecteur
> d'arnaque le plus courant en France était un angle mort.
>
> Cette version corrige tout cela. Le détecteur reconnaît désormais les
> plateformes d'envoi professionnelles (Brevo, SendGrid, Mailjet, Substack…)
> et ne s'affole plus quand votre association vous répond depuis une autre
> adresse. Il fait la différence entre « L'Orange Bleue », votre salle de
> sport, et une véritable usurpation de l'opérateur. Il sait que « Square
> Habitat » n'est pas `square.com`, et que « Dr.Martin » n'est pas un nom de
> domaine.
>
> Sur notre corpus de référence — 64 cas, dont 63 comptés dans les indicateurs —
> les fausses alertes passent de **11 à 0**, et les messages frauduleux manqués
> de **10 à 0**. Le détecteur redevient un outil qu'on écoute.
>
> Et parce qu'aucune liste ne reste juste éternellement : **les listes de
> référence se modifient maintenant depuis le tableau de bord**. Une nouvelle
> plateforme d'emailing, un homonyme qui vous concerne ? Deux clics, effet
> immédiat, aucun redéploiement.

*Mise en garde honnête : ce corpus a été écrit à partir de l'audit du moteur.
Il mesure une non-régression et un écart avant/après, pas une performance en
conditions réelles. Voir [`tests/README.md`](tests/README.md).*

### Ajouté

- **Listes de référence modifiables sans redéploiement** (`Listes.gs`). Les
  plateformes d'envoi tierces et les libellés de marque ambigus se gèrent
  depuis le tableau de bord, avec effet immédiat. Chaque liste superpose trois
  couches : les valeurs livrées, les ajouts de l'utilisateur, puis ses retraits,
  qui l'emportent. Les retraits sont stockés explicitement, faute de quoi une
  valeur par défaut neutralisée reviendrait silencieusement à la prochaine mise
  à jour du code. Points d'accès : `getListesModifiables()`,
  `ajouterEntreeListe()`, `retirerEntreeListe()`, `reinitialiserListe()`.
  Les listes sont exposées au tableau de bord via `getDashboardData()`, chaque
  entrée indiquant son origine (`defaut`, `ajout`, `defaut_desactive`) pour que
  l'interface puisse les distinguer visuellement.
- Enrichissement des plateformes d'envoi tierces : **SendGrid** (absent, alors
  qu'il est l'un des plus répandus), Mailgun, Postmark, Amazon SES, SparkPost,
  Mandrill, Klaviyo, ActiveCampaign, GetResponse, Constant Contact, MailerLite,
  Substack, beehiiv, Calendly, DocuSign, Yousign.
- Banc de test `tests/` : exécute les fichiers `.gs` du dépôt hors Apps Script,
  sur un corpus étiqueté, avec matrice de confusion et comparaison avant/après.
- `tests/listes.js` : 20 vérifications du mécanisme de listes — ajout, retrait,
  neutralisation d'un défaut, réinitialisation, validation des saisies et
  résistance à un stockage corrompu.
- Correspondance des marques par **forme compacte** : « Crédit Agricole »,
  « Société Générale » ou « La Banque Postale » sont désormais rapprochés de
  leur domaine. Auparavant, aucune marque française en plusieurs mots n'était
  détectable depuis le nom d'affichage.
- Table `ALIAS_MARQUES` pour les organismes dont le nom usuel diffère du nom de
  domaine (« Assurance Maladie » → `ameli.fr`, « France Travail » →
  `pole-emploi.fr`).
- Détection du **typosquatting par changement d'extension** (`paypal.co`,
  `ameli.co`) : la distance de Levenshtein ne comparait que le libellé et
  laissait donc passer ce vecteur.
- `MARQUES_AMBIGUES` et `corroboreMarqueAmbigue()` : les libellés qui sont aussi
  des mots courants (`orange`, `square`, `free`, `wise`, `discount`…) exigent
  désormais une corroboration avant de conclure à une usurpation.
- `TLD_CONNUS` : validation de l'extension avant de considérer une chaîne comme
  un nom de domaine.
- `estMemeAutoriteEtatique()` : deux domaines d'une même autorité publique ne
  peuvent pas s'usurper, leur enregistrement étant contrôlé.
- Extension de la base : crédit à la consommation, formation et retraite
  (dont `moncompteformation.gouv.fr`), distribution d'énergie, nouvelles
  plateformes de commerce, cryptomonnaies complémentaires.
- Groupes de domaines liés pour les administrations françaises
  (`impots.gouv.fr` / `finances.gouv.fr`, `ameli.fr` / `cpam.fr`,
  `pole-emploi.fr` / `francetravail.fr`).

### Corrigé

- **Faux positifs sur les homonymes.** « Square Habitat », « April Formation »,
  « L'Orange Bleue » ou « Cash Express » — entreprises réelles sans rapport avec
  `square.com`, `april.fr`, `orange.fr` ou `cash.app` — étaient signalées comme
  usurpations, parfois en sévérité critique.
- **Noms propres pris pour des domaines.** Le motif de reconnaissance acceptait
  n'importe quelles lettres en terminaison : « Jean M.Dupont », « Dr.Martin » et
  « Service.Client » déclenchaient une alerte d'usurpation générique.
- **Ordre des contrôles.** Le contrôle Reply-To s'exécutait avant l'analyse de
  marque et retournait immédiatement : une usurpation de marque accompagnée d'un
  Reply-To divergent sortait en « Reply-To divergent, sévérité moyenne » au lieu
  d'« usurpation de marque, sévérité critique ». Le signal le plus faible
  masquait le plus fort. Le contrôle est déplacé après l'analyse de marque et de
  typosquatting.
- **Perte silencieuse de groupes de marques.** `estUnDomaineMarqueLie()`
  écrasait l'entrée d'un domaine figurant dans plusieurs groupes au lieu de les
  fusionner : seul le dernier groupe déclaré était pris en compte. Défaut
  latent, révélé par l'ajout du groupe EDF/Enedis.
- **Faux positif institutionnel.** La DGFiP affiche la marque `impots.gouv.fr`
  mais émet depuis `finances.gouv.fr` ; le message était signalé comme
  usurpation.
- Restauration du `README.md`, dont les séparateurs de tableaux avaient été
  corrompus par un script d'harmonisation externe.
- **Chiffres périmés du `README.md`.** Il annonçait « plus de 80 marques »
  alors que la base en compte 191, et son plan de code omettait `Config.gs`,
  `Utils.gs` et `Listes.gs`. Les deux versions linguistiques sont réalignées
  sur le contenu réel du dépôt.

### Modifié

- Le repli des accents (`replierAccents`, `normaliserEnFormeCompacte`) est
  volontairement séparé de `CARTE_HOMOGLYPHES`. Fusionner les deux ferait passer
  tout texte français accentué pour une tentative d'usurpation et gonflerait la
  sévérité des messages légitimes.
- `verifierEcartsLiensHtml_()` réutilise `estMemeAutoriteEtatique()` au lieu de
  redéclarer sa propre liste de suffixes étatiques.
- `PLATEFORMES_ENVOI_TIERS` et `MARQUES_AMBIGUES` deviennent
  `PLATEFORMES_ENVOI_TIERS_DEFAUT` et `MARQUES_AMBIGUES_DEFAUT` : ce sont
  désormais les valeurs par défaut d'une liste modifiable, lues au travers de
  `getPlateformesTierces_()` et `getMarquesAmbigues_()`. Le nom dit ce qu'elles
  sont, et le moteur ne consulte plus jamais la constante directement.

### Connu / non traité

- Le signalement des archives (`.zip`, `.7z`) reste inconditionnel. C'est un
  choix de politique : defendable, mais bruyant sur un flux interne. Le cas est
  isolé dans le corpus (`L32`) plutôt que tranché unilatéralement.
- Une marque au libellé ambigu usurpée **sans** mot-clé d'hameçonnage, sans
  homoglyphe et sans échec d'authentification n'est pas détectée. C'est le prix
  assumé de la suppression des faux positifs sur les homonymes.
- *(Résolu dans cette version)* Les numéros de version des bandeaux de fichiers
  et de `CONFIG.VERSION`, jusqu'ici désynchronisés (2.1.0, 2.2.0, 2.4.0 selon
  les fichiers), sont alignés sur `2.4.0`.
- Le mécanisme de listes modifiables ne couvre pour l'instant que les
  ensembles de valeurs. La table d'alias `ALIAS_MARQUES` et les mots-clés
  `MOTS_CLES_PHISHING` restent figés dans le code : la première est un
  dictionnaire (clé → domaine) et demande une forme de saisie différente. Le
  registre `LISTES_MODIFIABLES` est prévu pour les accueillir.
- `Dashboard.html` n'a pas encore d'écran de gestion de ces listes. Les données
  et les points d'accès sont en place côté serveur ; il reste à câbler
  l'interface.
