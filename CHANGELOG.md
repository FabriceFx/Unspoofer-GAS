# Journal des modifications

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

Un utilisateur découvrant l'outil signalait que l'interface web n'expliquait
rien : des indicateurs à zéro, quatre onglets, et aucune indication de ce qu'il
fallait faire ni de ce qui se passe une fois une menace détectée.

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
- **La détection automatique de langue ne s'est jamais déclenchée.**
  `getLangueUtilisateur_()` testait `if (CONFIG.LANGUAGE)` avant de consulter la
  langue du compte Google — or `CONFIG.LANGUAGE` valait `"fr"`, toujours vrai.
  Les branches suivantes étaient donc du code mort, et la moitié anglaise
  d'`EMAIL_TRANSLATIONS` n'a jamais servi : **les alertes et rapports partaient
  en français à tout le monde**, y compris aux comptes anglophones. La valeur
  par défaut passe à `"auto"` et l'ordre de priorité devient explicite :
  préférence utilisateur, puis `CONFIG.LANGUAGE` si elle impose une langue,
  puis le compte Google, puis le français.

### Connu / non traité

- Les listes de référence introduites en 2.4.0 (plateformes d'envoi, libellés
  ambigus) n'ont toujours pas d'écran dédié. Les points d'accès serveur sont en
  place ; le guide oriente pour l'instant vers la liste blanche et les marques
  personnalisées.
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
