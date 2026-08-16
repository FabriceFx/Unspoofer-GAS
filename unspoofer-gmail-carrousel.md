# Publication LinkedIn — carrousel « Gmail vérifie l'authenticité, pas l'intention »

Accompagne le document [`unspoofer-gmail-carrousel.pdf`](unspoofer-gmail-carrousel.pdf)
(5 planches, 1080 × 1080).

Publier via **Créer un post → Ajouter un document**.

---

## Titre du document

LinkedIn le demande à l'import et l'affiche en gros sur la première planche
dans le fil. Ne pas laisser le nom de fichier.

```
Gmail vérifie l'authenticité, pas l'intention
```

---

## Légende

```
SPF : pass. DKIM : pass. DMARC : pass.

Et le message est quand même une arnaque.

Ce n'est pas un exploit technique. L'attaquant achète un domaine, le configure proprement, et écrit « Crédit Agricole » dans le nom d'affichage. Du point de vue de Gmail, rien n'est anormal : le domaine appartient réellement à l'expéditeur, l'authentification est valide, le message part en boîte de réception.

Gmail vérifie l'authenticité. Pas l'intention.

Les cinq planches ci-dessous montrent où passe exactement la frontière : ce que les filtres de Google arrêtent très bien, ce qu'ils laissent passer par conception, et les huit contrôles qu'une surcouche peut ajouter par-dessus.

Un point mérite d'être souligné tout de suite : l'outil n'analyse que la boîte de réception, jamais les spams. Tout ce qu'il signale est donc, par construction, un message que Gmail avait déjà jugé assez légitime pour vous le montrer.

Google Apps Script, licence MIT, aucun appel réseau externe — le script s'exécute dans votre propre compte et les alertes ne partent qu'à vous.

👉 github.com/FabriceFx/Unspoofer-GAS

#Cybersécurité #Phishing #GoogleWorkspace #GoogleAppsScript #OpenSource
```

---

## Premier commentaire (si le lien est retiré du corps)

```
Le code est ici, sous licence MIT : github.com/FabriceFx/Unspoofer-GAS — installation en quelques minutes dans Apps Script, et les listes de marques et de plateformes se règlent depuis le tableau de bord.
```

---

## Notes de rédaction

**Pourquoi cette légende est courte.** Le document porte le raisonnement. Une
légende qui redit le contenu des planches supprime toute raison de faire
défiler. L'énumération des techniques qui passent au travers (nom d'affichage,
homoglyphes, typosquatting, liens trompeurs) a donc été retirée : c'est
exactement la planche 2.

**Sauf une redite, volontaire.** La phrase sur le périmètre d'analyse — l'outil
ne lit que la boîte de réception — figure aussi sur la planche 3. C'est
l'argument le plus solide du post et il doit atteindre le lecteur qui ne fait
jamais défiler.

**Ne pas glisser vers « Gmail ne protège pas ».** Ce serait faux et le premier
commentateur compétent le démontrerait. Les filtres de Google sont très bons
sur ce qu'ils couvrent ; tout l'argument tient dans la distinction
authenticité / intention.

**L'exemple `credit-agricole-verif.tk` est fictif.** Ne pas le présenter comme
une campagne observée : c'est une illustration du mécanisme.

**Réponse prête à la question « et les faux positifs ? »** — elle viendra.

> C'est le vrai risque de ce type d'outil. J'ai donc un corpus de test avec
> 32 messages légitimes piégés — entreprises homonymes de marques surveillées,
> noms propres qui ressemblent à des domaines, plateformes au Reply-To
> divergent. On est passé de 11 fausses alertes à 0. Et l'outil étiquette
> seulement : il ne supprime ni ne déplace rien, et les listes d'exceptions se
> règlent depuis le tableau de bord.

**Moment de publication.** Mardi ou jeudi, 8 h – 10 h, sur une audience
technique francophone.
