/**
 * Unspoofer — Détecteur d'usurpation de nom d'affichage Gmail.
 * Points d'entrée : configurer(), analyserBoiteReception(), desinstaller(), testerDetection()
 */

const NOM_ETIQUETTE = 'ALERTE-USURPATION';
const REQUETE_ANALYSE = '{in:inbox in:spam} newer_than:3d';
const LIMITE_TEMPS_EXECUTION_MS = 5 * 60 * 1000; // 5 minutes (marge de sécurité sous la limite de 6 min)

/**
 * Crée l'étiquette ALERTE-USURPATION (idempotent) et configure un déclencheur toutes les 15 minutes.
 */
function configurer() {
    // Créer l'étiquette si elle n'existe pas
    let etiquette = GmailApp.getUserLabelByName(NOM_ETIQUETTE);
    if (!etiquette) {
        etiquette = GmailApp.createLabel(NOM_ETIQUETTE);
        Logger.log('Étiquette créée : ' + NOM_ETIQUETTE);
    } else {
        Logger.log('L\'étiquette existe déjà : ' + NOM_ETIQUETTE);
    }

    // Supprimer les déclencheurs existants pour analyserBoiteReception afin d'éviter les doublons
    const declencheurs = ScriptApp.getProjectTriggers();
    for (const declencheur of declencheurs) {
        if (declencheur.getHandlerFunction() === 'analyserBoiteReception') {
            ScriptApp.deleteTrigger(declencheur);
            Logger.log('Déclencheur analyserBoiteReception existant supprimé');
        }
    }

    // Créer un nouveau déclencheur toutes les 10 minutes
    ScriptApp.newTrigger('analyserBoiteReception')
        .timeBased()
        .everyMinutes(10)
        .create();
    Logger.log('Déclencheur de 10 minutes créé pour analyserBoiteReception');

    Logger.log('Configuration terminée. Unspoofer est actif.');
}

/**
 * Fonction d'analyse principale — appelée par déclencheur toutes les 10 minutes.
 * Recherche les messages récents de la boîte de réception, détecte les usurpations, applique l'étiquette + étoile.
 */
function analyserBoiteReception() {
    const tempsDebut = Date.now();
    const etiquette = GmailApp.getUserLabelByName(NOM_ETIQUETTE);
    if (!etiquette) {
        Logger.log('Étiquette ALERTE-USURPATION introuvable. Exécutez configurer() d\'abord.');
        return;
    }

    let nombreUsurpations = 0;
    let nombreAnalyses = 0;
    let nombreIgnores = 0;
    const detailsUsurpations = []; // Collecte pour le résumé par email

    try {
        const fils = GmailApp.search(REQUETE_ANALYSE, 0, 100);

        for (const fil of fils) {
            // Vérifier le temps d'exécution
            if (Date.now() - tempsDebut > LIMITE_TEMPS_EXECUTION_MS) {
                Logger.log('Limite de temps approchée — arrêt de l\'analyse prématuré.');
                break;
            }

            const messages = fil.getMessages();

            for (const message of messages) {
                const idMsg = message.getId();

                // Ignorer les messages déjà traités
                if (estTraite(idMsg)) {
                    nombreIgnores++;
                    continue;
                }

                nombreAnalyses++;
                const resultat = verifierUsurpation(message);

                if (resultat.estUsurpation) {
                    // Appliquer l'étiquette au fil
                    fil.addLabel(etiquette);
                    // Ajouter une étoile au message spécifique
                    message.star();

                    const expediteur = analyserExpediteur(message.getFrom());
                    detailsUsurpations.push({
                        objet: message.getSubject(),
                        email: expediteur.email,
                        nomAffichage: expediteur.nomAffichage,
                        raison: resultat.raison,
                    });

                    nombreUsurpations++;
                    Logger.log('USURPATION DÉTECTÉE : ' + resultat.raison);
                    Logger.log('  Détails : ' + resultat.details);
                }

                marquerCommeTraite(idMsg);
            }
        }
    } finally {
        // Toujours vider le cache, même en cas d'erreur
        viderCache();
    }

    // Envoyer le résumé par email si des usurpations ont été trouvées
    if (detailsUsurpations.length > 0) {
        envoyerAlerteUsurpation_(detailsUsurpations);
    }

    Logger.log('Analyse terminée. Analysés : ' + nombreAnalyses +
        ', Ignorés (cache) : ' + nombreIgnores +
        ', Usurpations trouvées : ' + nombreUsurpations);
}

/**
 * Récupère l'adresse email du propriétaire actuel de manière fiable.
 * @returns {string}
 */
function getEmailProprietaire_() {
    return Session.getEffectiveUser().getEmail() ||
        Session.getActiveUser().getEmail() ||
        '';
}

/**
 * Envoie une alerte par email avec un tableau HTML résumant les usurpations détectées.
 * @param {Array<{objet: string, email: string, nomAffichage: string, raison: string}>} usurpations
 */
function envoyerAlerteUsurpation_(usurpations) {
    const destinataire = getEmailProprietaire_();
    if (!destinataire) {
        Logger.log('Impossible de déterminer l\'email du propriétaire — alerte ignorée');
        return;
    }

    const lignes = usurpations.map(function (u) {
        const echap = function (str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
        return '<tr>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.objet) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.email) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.nomAffichage) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.raison) + '</td>' +
            '</tr>';
    }).join('');

    const html = '<h2>Alerte Usurpation : ' + usurpations.length + ' message' +
        (usurpations.length > 1 ? 's' : '') + ' suspect' + (usurpations.length > 1 ? 's' : '') + ' détecté' + (usurpations.length > 1 ? 's' : '') + '</h2>' +
        '<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">' +
        '<tr style="background:#f44336;color:white">' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Objet</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Email Expéditeur</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Nom d\'Affichage</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Raison</th>' +
        '</tr>' + lignes + '</table>' +
        '<p style="color:#666;font-size:12px">Envoyé par Unspoofer. Ces messages ont été étiquetés ALERTE-USURPATION et marqués d\'une étoile dans votre boîte de réception.</p>';

    GmailApp.sendEmail(destinataire,
        'Alerte Usurpation : ' + usurpations.length + ' message' + (usurpations.length > 1 ? 's' : '') + ' suspect' + (usurpations.length > 1 ? 's' : '') + ' trouvé' + (usurpations.length > 1 ? 's' : '') + '',
        '', { htmlBody: html });
    Logger.log('Email d\'alerte envoyé à ' + destinataire);
}

/**
 * Supprime tous les déclencheurs et vide le cache des messages traités.
 */
function desinstaller() {
    // Supprimer tous les déclencheurs de ce projet
    const declencheurs = ScriptApp.getProjectTriggers();
    for (const declencheur of declencheurs) {
        ScriptApp.deleteTrigger(declencheur);
    }
    Logger.log('Tous les déclencheurs ont été supprimés');

    // Vider le cache
    effacerCacheTraite();
    Logger.log('Cache des messages traités vidé');

    Logger.log('Désinstallation terminée. L\'étiquette ALERTE-USURPATION est conservée pour examen.');
}

/**
 * Ajoute un domaine ou une adresse email d'expéditeur à la liste blanche.
 * Exécuter depuis l'éditeur de script : ajouterALaListeBlanche('exemple.com')
 * @param {string} domaineOuEmail - ex : "workspace.studio" ou "noreply@alerts.exemple.com"
 */
function ajouterALaListeBlanche(domaineOuEmail) {
    if (!domaineOuEmail) {
        Logger.log('Usage : ajouterALaListeBlanche("domaine.com") ou ajouterALaListeBlanche("utilisateur@domaine.com")');
        return;
    }
    const entree = domaineOuEmail.trim().toLowerCase();
    const listeBlanche = getListeBlanche_();
    if (listeBlanche.includes(entree)) {
        Logger.log('Déjà en liste blanche : ' + entree);
        return;
    }
    listeBlanche.push(entree);
    PropertiesService.getScriptProperties().setProperty(
        CLE_PROPRIETE_LISTE_BLANCHE, JSON.stringify(listeBlanche)
    );
    Logger.log('Ajouté à la liste blanche : ' + entree);
}

/**
 * Retire un domaine ou une adresse email d'expéditeur de la liste blanche.
 * @param {string} domaineOuEmail
 */
function retirerDeLaListeBlanche(domaineOuEmail) {
    if (!domaineOuEmail) return;
    const entree = domaineOuEmail.trim().toLowerCase();
    const listeBlanche = getListeBlanche_();
    const index = listeBlanche.indexOf(entree);
    if (index === -1) {
        Logger.log('Pas dans la liste blanche : ' + entree);
        return;
    }
    listeBlanche.splice(index, 1);
    PropertiesService.getScriptProperties().setProperty(
        CLE_PROPRIETE_LISTE_BLANCHE, JSON.stringify(listeBlanche)
    );
    Logger.log('Retiré de la liste blanche : ' + entree);
}

/**
 * Affiche la liste blanche actuelle des expéditeurs dans le journal.
 */
function afficherListeBlanche() {
    const listeBlanche = getListeBlanche_();
    if (listeBlanche.length === 0) {
        Logger.log('La liste blanche est vide. Utilisez ajouterALaListeBlanche("domaine.com") pour ajouter des entrées.');
        return;
    }
    Logger.log('Liste blanche des expéditeurs (' + listeBlanche.length + ' entrées) :');
    for (const entree of listeBlanche) {
        Logger.log('  - ' + entree);
    }
}

/**
 * Fonction de test avec des exemples d'usurpation codés en dur.
 * Exécuter depuis l'éditeur de script pour vérifier la logique de détection.
 */
function testerDetection() {
    const casTests = [
        {
            nom: 'Usurpation Wix en cyrillique',
            de: '"W\u0456x.c\u043Em" <info@bistro-pub.de>',
            usurpationAttendue: true,
        },
        {
            nom: 'Usurpation PayPal en cyrillique',
            de: '"P\u0430yP\u0430l Security" <alerts@some-random.com>',
            usurpationAttendue: true,
        },
        {
            nom: 'Email Wix légitime',
            de: '"Wix.com" <noreply@wix.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Email Google légitime',
            de: '"Google" <no-reply@accounts.google.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Usurpation Apple pleine largeur',
            de: '"\uFF21\uFF50\uFF50\uFF4C\uFF45 Support" <help@totally-legit.xyz>',
            usurpationAttendue: true,
        },
        {
            nom: 'Usurpation Netflix avec omicron grec',
            de: '"Netfli\u03BF.com" <billing@fake-stream.net>',
            usurpationAttendue: false, // "netflio" ne correspond pas à "netflix"
        },
        {
            nom: 'Email régulier sans marque',
            de: '"Jean Dupont" <jean@exemple.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Usurpation Microsoft en cyrillique',
            de: '"Micr\u043Es\u043Eft.com" <security@phish-domain.ru>',
            usurpationAttendue: true,
        },
        {
            nom: 'Sous-domaine de marque — légitime',
            de: '"Amazon.com" <ship-confirm@ship.amazon.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Nom d\'affichage Google via YouTube — domaine lié',
            de: '"Google" <noreply@youtube.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Nom d\'affichage Microsoft via Outlook — domaine lié',
            de: '"Compte Microsoft" <noreply@outlook.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Nom d\'affichage Meta via Instagram — domaine lié',
            de: '"Meta" <security@instagram.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Google Search Console — légitime',
            de: '"Google Search Console" <sc-noreply@google.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Phishing Firebase — plateforme suspecte',
            de: '"Account Alert" <noreply@kriyiasahbi.firebaseapp.com>',
            usurpationAttendue: true,
        },
        {
            nom: 'Phishing Firebase — domaine personnalisé avec sélecteur DKIM firebase1',
            de: '"Mise à jour du compte" <noreply@qgui777com.com>',
            usurpationAttendue: true,
            enTetesBruts: 'DKIM-Signature: v=1; a=rsa-sha256; d=qgui777com.com; s=firebase1; b=abc\n' +
                'Authentication-Results: mx.google.com; dkim=pass header.i=@qgui777com.com header.s=firebase1\n' +
                '\n',
        },
        {
            nom: 'Mail Alibaba Cloud — service légitime, non signalé',
            de: '"Avis important" <noreply@fa-netscher.de>',
            usurpationAttendue: false,
            enTetesBruts: 'DKIM-Signature: v=1; a=rsa-sha256; d=fa-netscher.de; s=aliyun-ap-southeast-1; b=abc\n' +
                'Authentication-Results: mx.google.com; dkim=pass header.i=@fa-netscher.de header.s=aliyun-ap-southeast-1\n' +
                '\n',
        },
        {
            nom: 'Marque dans la partie locale de l\'email — usurpation Wix',
            de: '"Wix Domain Registration" <domains.notifications.wix.renew@investireinlettonia.it>',
            usurpationAttendue: true,
        },
        {
            nom: 'Email légitime avec marque dans la partie locale ne doit pas être signalé',
            de: '"Jean" <wix-user@wix.com>',
            usurpationAttendue: false,
        },
        // Vérifications génériques de domaine dans le nom d'affichage (aucune liste de marques nécessaire)
        {
            nom: 'Générique : le nom d\'affichage contient un domaine inconnu, l\'expéditeur ne correspond pas',
            de: '"Support - coolstartup.com" <noreply@totally-unrelated.de>',
            usurpationAttendue: true,
        },
        {
            nom: 'Générique : le domaine du nom d\'affichage correspond à l\'expéditeur — légitime',
            de: '"Mises à jour coolstartup.com" <noreply@coolstartup.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Générique : le domaine du nom d\'affichage correspond au sous-domaine de l\'expéditeur — légitime',
            de: '"coolstartup.com" <noreply@mail.coolstartup.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Générique : pas de domaine dans le nom d\'affichage — non signalé',
            de: '"Expéditeur aléatoire" <hello@whatever.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Usurpation ChatGPT depuis un domaine non lié (liste de marques)',
            de: '"ChatGPT" <noreply@info.casadelsilencio.de>',
            usurpationAttendue: true,
        },
        {
            nom: 'Email OpenAI légitime',
            de: '"OpenAI" <noreply@openai.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Affichage multi-TLD Gett légitime (.business est un gTLD)',
            de: '"Gett.Business" <noreply@business-news.gett.com>',
            usurpationAttendue: false,
        },
        {
            nom: 'Notification de service de formulaire : nom d\'affichage = propre domaine du destinataire',
            de: '"theroadtlv.com" <formresponses@netlify.com>',
            usurpationAttendue: false,
            domaineProprietaire: 'theroadtlv.com',
        },
        {
            nom: 'La notification de service de formulaire est toujours signalée lorsqu\'il ne s\'agit pas de votre propre domaine',
            de: '"quelqunautre.com" <formresponses@netlify.com>',
            usurpationAttendue: true,
            domaineProprietaire: 'theroadtlv.com',
        },
    ];

    let reussis = 0;
    let echoues = 0;

    const domaineProprietaireSauvegarde = _cacheDomaineProprietaire;

    for (const ct of casTests) {
        // Remplacer le domaine du propriétaire pour les tests qui utilisent la vérification du domaine du destinataire
        _cacheDomaineProprietaire = Object.prototype.hasOwnProperty.call(ct, 'domaineProprietaire')
            ? ct.domaineProprietaire
            : '';
        // Créer un objet GmailMessage simulé qui utilise le vrai code verifierUsurpation()
        const messageSimule = {
            getFrom: () => ct.de,
            getRawContent: () => ct.enTetesBruts || '',
        };
        const resultat = verifierUsurpation(messageSimule);

        const expediteur = analyserExpediteur(ct.de);
        const nomNormalise = normaliserEnAscii(expediteur.nomAffichage);

        const statut = resultat.estUsurpation === ct.usurpationAttendue ? 'RÉUSSI' : 'ÉCHEC';
        if (statut === 'RÉUSSI') {
            reussis++;
        } else {
            echoues++;
        }

        Logger.log(statut + ' : ' + ct.nom);
        Logger.log('  De : ' + ct.de);
        Logger.log('  Nom normalisé : "' + nomNormalise + '"');
        Logger.log('  Détecté comme usurpation : ' + resultat.estUsurpation + ' (attendu : ' + ct.usurpationAttendue + ')');
        if (resultat.estUsurpation) Logger.log('  Raison : ' + resultat.raison);
        Logger.log('');
    }

    _cacheDomaineProprietaire = domaineProprietaireSauvegarde;

    Logger.log('Résultats : ' + reussis + ' réussis, ' + echoues + ' échoués sur ' + casTests.length + ' tests');
}

/**
 * Diagnostic : trouver un email suspect récent et journaliser chaque étape de la détection DKIM.
 * Exécuter depuis l'éditeur de script pour déboguer pourquoi les vérifications DKIM pourraient échouer.
 */
function deboguerDkim() {
    const fils = GmailApp.search('in:inbox newer_than:3d', 0, 20);
    const journalEmail = []; // Uniquement les découvertes intéressantes pour l'email

    let totalMessages = 0;
    let nombreUsurpations = 0;
    let nombreCorrespondancesDkim = 0;
    let nombreSansDelimiteur = 0;
    let nombreErreurs = 0;

    for (const fil of fils) {
        const messages = fil.getMessages();
        for (const message of messages) {
            totalMessages++;
            const de = message.getFrom();
            const journalMsg = []; // Tampon de journalisation par message

            try {
                const brut = message.getRawContent();
                const finCrlf = brut.indexOf('\r\n\r\n');
                const finLf = brut.indexOf('\n\n');
                let finEnTete = finCrlf;
                if (finEnTete <= 0) finEnTete = finLf;

                if (finEnTete <= 0) {
                    nombreSansDelimiteur++;
                    journalMsg.push('  AUCUN DÉLIMITEUR D\'EN-TÊTE TROUVÉ (CRLF=' + finCrlf + ', LF=' + finLf + ')');
                } else {
                    const enTetes = brut.substring(0, finEnTete);
                    const correspondancesSelecteur = enTetes.match(/\bs=[a-z0-9_-]+/gi);
                    const correspondanceFirebase = /(?:header\.s|\bs)=firebase1\b/.test(enTetes);
                    if (correspondanceFirebase) {
                        nombreCorrespondancesDkim++;
                        journalMsg.push('  Correspondance sélecteur DKIM ! Firebase=' + correspondanceFirebase);
                        journalMsg.push('  Toutes les valeurs s= : ' + JSON.stringify(correspondancesSelecteur));
                    }
                }

                const resultatUsurpation = verifierUsurpation(message);
                if (resultatUsurpation.estUsurpation) {
                    nombreUsurpations++;
                    journalMsg.push('  USURPATION DÉTECTÉE : ' + resultatUsurpation.raison);
                }
            } catch (e) {
                nombreErreurs++;
                journalMsg.push('  ERREUR : ' + e.message);
            }

            // Inclure uniquement les messages avec des découvertes
            if (journalMsg.length > 0) {
                journalEmail.push('--- ' + de);
                journalEmail.push.apply(journalEmail, journalMsg);
                journalEmail.push('');
            }

            // Toujours tout journaliser dans l'éditeur de script
            Logger.log('--- ' + de + (journalMsg.length > 0 ? '\n' + journalMsg.join('\n') : ' (propre)'));
        }
    }

    const resume = [
        '=== RÉSUMÉ ===',
        'Messages vérifiés : ' + totalMessages,
        'Correspondances sélecteur DKIM : ' + nombreCorrespondancesDkim,
        'Usurpations détectées : ' + nombreUsurpations,
        'Sans délimiteur d\'en-tête : ' + nombreSansDelimiteur,
        'Erreurs : ' + nombreErreurs,
    ];
    resume.forEach(function (ligne) { Logger.log(ligne); });

    // Email uniquement des découvertes + résumé
    const destinataire = getEmailProprietaire_();
    if (destinataire) {
        const corps = journalEmail.length > 0
            ? journalEmail.join('\n') + '\n' + resume.join('\n')
            : resume.join('\n') + '\n\nAucun problème trouvé dans les messages.';
        GmailApp.sendEmail(destinataire,
            'Débogage Unspoofer : ' + nombreUsurpations + ' usurpations, ' + nombreCorrespondancesDkim + ' correspondances DKIM, ' + nombreErreurs + ' erreurs',
            corps);
        Logger.log('Résultats de débogage envoyés à ' + destinataire);
    } else {
        Logger.log('Impossible de déterminer l\'email du propriétaire — vérifiez le journal dans l\'éditeur de script');
    }
}

/**
 * Test ciblé : trouver un expéditeur spécifique et diagnostiquer pourquoi la détection échoue.
 * Exécuter depuis l'éditeur de script après avoir modifié la requête de recherche si nécessaire.
 */
function deboguerMessage() {
    // Rechercher largement : n'importe où (boîte de réception, spam, corbeille), plusieurs termes
    const recherches = [
        'from:babyamerica newer_than:7d',
        'from:avacomornami newer_than:7d',
        'from:fsgebaeudeservice newer_than:7d',
        'from:fa-netscher newer_than:7d',
        'in:spam newer_than:7d',
    ];
    var fils = [];
    for (var i = 0; i < recherches.length; i++) {
        fils = GmailApp.search(recherches[i], 0, 5);
        if (fils.length > 0) {
            Logger.log('Trouvé avec la requête : ' + recherches[i]);
            break;
        }
    }
    if (fils.length === 0) {
        var destinataire = getEmailProprietaire_();
        if (destinataire) {
            GmailApp.sendEmail(destinataire, 'deboguerMessage : rien trouvé',
                'Tentative avec ces recherches :\n' + recherches.join('\n') + '\n\nAucun message ne correspond.');
        }
        Logger.log('Aucun message trouvé avec aucune recherche');
        return;
    }
    const message = fils[0].getMessages()[0];
    const de = message.getFrom();
    const lignes = ['De : ' + de, ''];

    try {
        const brut = message.getRawContent();
        lignes.push('Longueur du contenu brut : ' + brut.length);
        lignes.push('500 premiers caractères :');
        lignes.push(brut.substring(0, 500));
        lignes.push('');

        const finCrlf = brut.indexOf('\r\n\r\n');
        const finLf = brut.indexOf('\n\n');
        lignes.push('Délimiteur CRLF à : ' + finCrlf);
        lignes.push('Délimiteur LF à : ' + finLf);

        let finEnTete = finCrlf;
        if (finEnTete <= 0) finEnTete = finLf;

        if (finEnTete > 0) {
            const enTetes = brut.substring(0, finEnTete);
            lignes.push('Longueur de l\'en-tête : ' + enTetes.length);
            const selecteurs = enTetes.match(/\bs=[a-z0-9_-]+/gi);
            lignes.push('Toutes les valeurs s= : ' + JSON.stringify(selecteurs));

            const fb = /(?:header\.s|\bs)=firebase1\b/.test(enTetes);
            lignes.push('Correspondance Firebase : ' + fb);
        } else {
            lignes.push('AUCUN DÉLIMITEUR D\'EN-TÊTE TROUVÉ');
        }

        lignes.push('');
        const resultat = verifierUsurpation(message);
        lignes.push('verifierUsurpation : estUsurpation=' + resultat.estUsurpation);
        lignes.push('raison : ' + resultat.raison);
        lignes.push('détails : ' + resultat.details);
    } catch (e) {
        lignes.push('ERREUR : ' + e.message);
        lignes.push('Pile : ' + e.stack);
    }

    const corps = lignes.join('\n');
    Logger.log(corps);

    destinataire = getEmailProprietaire_();
    if (destinataire) {
        GmailApp.sendEmail(destinataire, 'Débogage Unspoofer deboguerMessage : ' + de, corps);
        Logger.log('Envoyé par email à ' + destinataire);
    }
}

/**
 * Vide le cache des messages traités et ré-analyse immédiatement.
 * À utiliser après le déploiement de modifications de détection pour re-vérifier les messages précédemment manqués.
 */
function reanalyserBoiteReception() {
    Logger.log('Vidage du cache des messages traités...');
    effacerCacheTraite();
    Logger.log('Cache vidé. Démarrage d\'une nouvelle analyse...');
    analyserBoiteReception();

    // Envoyer également un rapport complet de ce qui a été analysé
    const fils = GmailApp.search(REQUETE_ANALYSE, 0, 100);
    const lignes = ['Rapport reanalyserBoiteReception — requête : ' + REQUETE_ANALYSE, ''];
    let compteur = 0;
    for (const fil of fils) {
        const messages = fil.getMessages();
        for (const message of messages) {
            compteur++;
            const de = message.getFrom();
            const objet = message.getSubject();
            const resultat = verifierUsurpation(message);
            lignes.push(compteur + '. ' + (resultat.estUsurpation ? 'USURPATION' : 'propre') +
                ' | ' + de + ' | ' + objet +
                (resultat.estUsurpation ? ' | ' + resultat.raison : ''));
        }
    }
    lignes.push('');
    lignes.push('Total : ' + compteur + ' messages');

    const destinataire = getEmailProprietaire_();
    if (destinataire) {
        GmailApp.sendEmail(destinataire, 'Rapport de ré-analyse Unspoofer : ' + compteur + ' messages', lignes.join('\n'));
    }
}
