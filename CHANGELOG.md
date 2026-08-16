# Journal des modifications

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

Introduction d'un banc de test exécutable et correction des défauts qu'il a
révélés. Sur le corpus de référence (63 cas), le taux de détection passe de
**68,8 % à 100 %** et la précision de **66,7 % à 100 %** — voir
[`tests/README.md`](tests/README.md) pour la portée exacte de cette mesure.

### Ajouté

- Banc de test `tests/` : exécute les fichiers `.gs` du dépôt hors Apps Script,
  sur un corpus étiqueté, avec matrice de confusion et comparaison avant/après.
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

### Connu / non traité

- Le signalement des archives (`.zip`, `.7z`) reste inconditionnel. C'est un
  choix de politique : defendable, mais bruyant sur un flux interne. Le cas est
  isolé dans le corpus (`L32`) plutôt que tranché unilatéralement.
- Une marque au libellé ambigu usurpée **sans** mot-clé d'hameçonnage, sans
  homoglyphe et sans échec d'authentification n'est pas détectée. C'est le prix
  assumé de la suppression des faux positifs sur les homonymes.
- Les numéros de version des en-têtes de fichiers (`2.1.0`) et de
  `CONFIG.VERSION` sont désynchronisés de l'historique Git (jalon `v2.3`).
