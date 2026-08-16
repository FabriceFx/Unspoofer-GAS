# Journal des modifications

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

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
> Sur notre corpus de référence de 63 messages, les fausses alertes passent de
> **11 à 0**, et les messages frauduleux manqués de **10 à 0**. Le détecteur
> redevient un outil qu'on écoute.
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
