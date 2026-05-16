/**
 * Unspoofer — Détecteur d'usurpation de nom d'affichage Gmail.
 * Points d'entrée : configurer(), analyserBoiteReception(), desinstaller(), testerDetection()
 */

const NOM_ETIQUETTE = 'ALERTE-USURPATION';
const REQUETE_ANALYSE = '{in:inbox in:spam} newer_than:3d';
const LIMITE_TEMPS_EXECUTION_MS = 5 * 60 * 1000;
const TAILLE_PAGE = 100;

/**
 * Crée l'étiquette ALERTE-USURPATION (idempotent) et configure un déclencheur toutes les 10 minutes.
 */
function configurer() {
    let etiquette = GmailApp.getUserLabelByName(NOM_ETIQUETTE);
    if (!etiquette) {
        etiquette = GmailApp.createLabel(NOM_ETIQUETTE);
        Logger.log('Étiquette créée : ' + NOM_ETIQUETTE);
    } else {
        Logger.log('L\'étiquette existe déjà : ' + NOM_ETIQUETTE);
    }

    const declencheurs = ScriptApp.getProjectTriggers();
    for (const declencheur of declencheurs) {
        if (declencheur.getHandlerFunction() === 'analyserBoiteReception') {
            ScriptApp.deleteTrigger(declencheur);
            Logger.log('Déclencheur analyserBoiteReception existant supprimé');
        }
    }

    ScriptApp.newTrigger('analyserBoiteReception')
        .timeBased()
        .everyMinutes(10)
        .create();
    Logger.log('Déclencheur de 10 minutes créé pour analyserBoiteReception');
    Logger.log('Configuration terminée. Unspoofer est actif.');
}

/**
 * Fonction d'analyse principale — appelée par déclencheur toutes les 10 minutes.
 * Avec pagination pour traiter plus de 100 threads (Fix #12).
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
    const detailsUsurpations = [];
    let limiteAtteinte = false;

    try {
        let depart = 0;
        let fils;

        do {
            fils = GmailApp.search(REQUETE_ANALYSE, depart, TAILLE_PAGE);

            for (const fil of fils) {
                if (Date.now() - tempsDebut > LIMITE_TEMPS_EXECUTION_MS) {
                    Logger.log('Limite de temps approchée — arrêt prématuré.');
                    limiteAtteinte = true;
                    break;
                }

                const messages = fil.getMessages();
                for (const message of messages) {
                    const idMsg = message.getId();

                    if (estTraite(idMsg)) {
                        nombreIgnores++;
                        continue;
                    }

                    nombreAnalyses++;
                    const resultat = verifierUsurpation(message);

                    if (resultat.estUsurpation) {
                        fil.addLabel(etiquette);
                        message.star();

                        const expediteur = analyserExpediteur(message.getFrom());
                        detailsUsurpations.push({
                            objet: message.getSubject(),
                            email: expediteur.email,
                            nomAffichage: expediteur.nomAffichage,
                            raison: resultat.raison,
                            severite: resultat.severite,
                        });

                        nombreUsurpations++;
                        Logger.log('USURPATION [' + resultat.severite.toUpperCase() + '] : ' + resultat.raison);
                    }

                    marquerCommeTraite(idMsg);
                }
                if (limiteAtteinte) break;
            }

            depart += TAILLE_PAGE;
        } while (fils.length === TAILLE_PAGE && !limiteAtteinte);

    } finally {
        persisterCache();
    }

    // Statistiques persistantes (#11)
    incrementerStatistiques_(nombreAnalyses, nombreUsurpations);

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
 * Couleur de fond associée à un niveau de sévérité.
 * @param {string} severite
 * @returns {string}
 */
function couleurSeverite_(severite) {
    if (severite === 'critique') return '#d32f2f';
    if (severite === 'elevee') return '#f57c00';
    return '#fbc02d';
}

/**
 * Libellé français d'un niveau de sévérité.
 * @param {string} severite
 * @returns {string}
 */
function libelleSeverite_(severite) {
    if (severite === 'critique') return '🔴 Critique';
    if (severite === 'elevee') return '🟠 Élevée';
    return '🟡 Moyenne';
}

/**
 * Envoie une alerte par email avec tableau HTML et niveaux de sévérité (#7).
 * @param {Array<{objet: string, email: string, nomAffichage: string, raison: string, severite: string}>} usurpations
 */
function envoyerAlerteUsurpation_(usurpations) {
    const destinataire = getEmailProprietaire_();
    if (!destinataire) {
        Logger.log('Impossible de déterminer l\'email du propriétaire — alerte ignorée');
        return;
    }

    const echap = function (str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    const lignes = usurpations.map(function (u) {
        return '<tr>' +
            '<td style="padding:8px;border:1px solid #ddd">' +
            '<span style="background:' + couleurSeverite_(u.severite) + ';color:white;padding:2px 8px;border-radius:4px;font-size:12px">' +
            libelleSeverite_(u.severite) + '</span></td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.objet) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.email) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.nomAffichage) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.raison) + '</td>' +
            '</tr>';
    }).join('');

    const nbCritiques = usurpations.filter(u => u.severite === 'critique').length;
    const nbElevees = usurpations.filter(u => u.severite === 'elevee').length;

    const html = '<h2>Alerte Usurpation : ' + usurpations.length + ' message' +
        (usurpations.length > 1 ? 's suspects détectés' : ' suspect détecté') + '</h2>' +
        (nbCritiques > 0 ? '<p style="color:#d32f2f;font-weight:bold">⚠️ ' + nbCritiques + ' menace(s) critique(s) !</p>' : '') +
        '<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">' +
        '<tr style="background:#424242;color:white">' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Sévérité</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Objet</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Email</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Nom Affiché</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Raison</th>' +
        '</tr>' + lignes + '</table>' +
        '<p style="color:#666;font-size:12px">Envoyé par Unspoofer. Ces messages ont été étiquetés ALERTE-USURPATION.</p>';

    const sujetEmail = (nbCritiques > 0 ? '🔴 ' : '⚠️ ') +
        'Alerte Usurpation : ' + usurpations.length + ' message' +
        (usurpations.length > 1 ? 's' : '');

    GmailApp.sendEmail(destinataire, sujetEmail, '', { htmlBody: html });
    Logger.log('Email d\'alerte envoyé à ' + destinataire);
}

/**
 * Supprime tous les déclencheurs et vide le cache des messages traités.
 */
function desinstaller() {
    const declencheurs = ScriptApp.getProjectTriggers();
    for (const declencheur of declencheurs) {
        ScriptApp.deleteTrigger(declencheur);
    }
    Logger.log('Tous les déclencheurs ont été supprimés');

    effacerCacheTraite();
    Logger.log('Cache des messages traités vidé');
    Logger.log('Désinstallation terminée. L\'étiquette ALERTE-USURPATION est conservée pour examen.');
}

/**
 * Ajoute un domaine ou une adresse email d'expéditeur à la liste blanche.
 * @param {string} domaineOuEmail
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
 * Affiche la liste blanche actuelle dans le journal.
 */
function afficherListeBlanche() {
    const listeBlanche = getListeBlanche_();
    if (listeBlanche.length === 0) {
        Logger.log('La liste blanche est vide.');
        return;
    }
    Logger.log('Liste blanche (' + listeBlanche.length + ' entrées) :');
    for (const entree of listeBlanche) {
        Logger.log('  - ' + entree);
    }
}

/**
 * Fonction de test avec des exemples d'usurpation codés en dur.
 */
function testerDetection() {
    const casTests = [
        { nom: 'Usurpation Wix en cyrillique', de: '"W\u0456x.c\u043Em" <info@bistro-pub.de>', usurpationAttendue: true },
        { nom: 'Usurpation PayPal en cyrillique', de: '"P\u0430yP\u0430l Security" <alerts@some-random.com>', usurpationAttendue: true },
        { nom: 'Email Wix légitime', de: '"Wix.com" <noreply@wix.com>', usurpationAttendue: false },
        { nom: 'Email Google légitime', de: '"Google" <no-reply@accounts.google.com>', usurpationAttendue: false },
        { nom: 'Usurpation Apple pleine largeur', de: '"\uFF21\uFF50\uFF50\uFF4C\uFF45 Support" <help@totally-legit.xyz>', usurpationAttendue: true },
        { nom: 'Netflix omicron grec (netflio != netflix)', de: '"Netfli\u03BF.com" <billing@fake-stream.net>', usurpationAttendue: false },
        { nom: 'Email sans marque', de: '"Jean Dupont" <jean@exemple.com>', usurpationAttendue: false },
        { nom: 'Usurpation Microsoft cyrillique', de: '"Micr\u043Es\u043Eft.com" <security@phish-domain.ru>', usurpationAttendue: true },
        { nom: 'Sous-domaine Amazon légitime', de: '"Amazon.com" <ship-confirm@ship.amazon.com>', usurpationAttendue: false },
        { nom: 'Google via YouTube', de: '"Google" <noreply@youtube.com>', usurpationAttendue: false },
        { nom: 'Microsoft via Outlook', de: '"Compte Microsoft" <noreply@outlook.com>', usurpationAttendue: false },
        { nom: 'Meta via Instagram', de: '"Meta" <security@instagram.com>', usurpationAttendue: false },
        { nom: 'Google Search Console', de: '"Google Search Console" <sc-noreply@google.com>', usurpationAttendue: false },
        { nom: 'Phishing Firebase', de: '"Account Alert" <noreply@kriyiasahbi.firebaseapp.com>', usurpationAttendue: true },
        {
            nom: 'Firebase DKIM personnalisé', de: '"Mise à jour" <noreply@qgui777com.com>', usurpationAttendue: true,
            enTetesBruts: 'DKIM-Signature: v=1; a=rsa-sha256; d=qgui777com.com; s=firebase1; b=abc\n\n',
        },
        {
            nom: 'Alibaba Cloud légitime', de: '"Avis important" <noreply@fa-netscher.de>', usurpationAttendue: false,
            enTetesBruts: 'DKIM-Signature: v=1; a=rsa-sha256; d=fa-netscher.de; s=aliyun-ap-southeast-1; b=abc\n\n',
        },
        { nom: 'Marque dans partie locale — Wix', de: '"Wix Domain Registration" <domains.notifications.wix.renew@investireinlettonia.it>', usurpationAttendue: true },
        { nom: 'Marque locale légitime', de: '"Jean" <wix-user@wix.com>', usurpationAttendue: false },
        { nom: 'Domaine générique non lié', de: '"Support - coolstartup.com" <noreply@totally-unrelated.de>', usurpationAttendue: true },
        { nom: 'Domaine générique correspond', de: '"coolstartup.com" <noreply@coolstartup.com>', usurpationAttendue: false },
        { nom: 'Domaine générique sous-domaine', de: '"coolstartup.com" <noreply@mail.coolstartup.com>', usurpationAttendue: false },
        { nom: 'Pas de domaine dans le nom', de: '"Expéditeur aléatoire" <hello@whatever.com>', usurpationAttendue: false },
        { nom: 'Usurpation ChatGPT', de: '"ChatGPT" <noreply@info.casadelsilencio.de>', usurpationAttendue: true },
        { nom: 'OpenAI légitime', de: '"OpenAI" <noreply@openai.com>', usurpationAttendue: false },
        { nom: 'Gett multi-TLD légitime', de: '"Gett.Business" <noreply@business-news.gett.com>', usurpationAttendue: false },
        { nom: 'Formulaire : propre domaine', de: '"theroadtlv.com" <formresponses@netlify.com>', usurpationAttendue: false, domaineProprietaire: 'theroadtlv.com' },
        { nom: 'Formulaire : autre domaine', de: '"quelqunautre.com" <formresponses@netlify.com>', usurpationAttendue: true, domaineProprietaire: 'theroadtlv.com' },
    ];

    let reussis = 0;
    let echoues = 0;
    const domaineProprietaireSauvegarde = _cacheDomaineProprietaire;

    for (const ct of casTests) {
        _cacheDomaineProprietaire = Object.prototype.hasOwnProperty.call(ct, 'domaineProprietaire')
            ? ct.domaineProprietaire : '';
        const messageSimule = {
            getFrom: () => ct.de,
            getRawContent: () => ct.enTetesBruts || '',
        };
        const resultat = verifierUsurpation(messageSimule);
        const statut = resultat.estUsurpation === ct.usurpationAttendue ? 'RÉUSSI' : 'ÉCHEC';
        if (statut === 'RÉUSSI') { reussis++; } else { echoues++; }

        Logger.log(statut + ' : ' + ct.nom);
        if (resultat.estUsurpation) Logger.log('  Sévérité : ' + resultat.severite + ' | Raison : ' + resultat.raison);
        if (statut === 'ÉCHEC') Logger.log('  ⚠️ Détecté=' + resultat.estUsurpation + ' Attendu=' + ct.usurpationAttendue);
        Logger.log('');
    }

    _cacheDomaineProprietaire = domaineProprietaireSauvegarde;
    Logger.log('Résultats : ' + reussis + ' réussis, ' + echoues + ' échoués sur ' + casTests.length + ' tests');
}

/**
 * Diagnostic DKIM — utilise la fonction utilitaire factorisée (#9).
 */
function deboguerDkim() {
    const fils = GmailApp.search('in:inbox newer_than:3d', 0, 20);
    const journalEmail = [];
    let totalMessages = 0, nombreUsurpations = 0, nombreCorrespondancesDkim = 0, nombreErreurs = 0;

    for (const fil of fils) {
        for (const message of fil.getMessages()) {
            totalMessages++;
            const de = message.getFrom();
            const journalMsg = [];

            try {
                const enTetes = extraireEnTetes_(message.getRawContent());
                if (!enTetes) {
                    journalMsg.push('  AUCUN DÉLIMITEUR D\'EN-TÊTE TROUVÉ');
                } else {
                    const correspondanceFirebase = /(?:header\.s|\bs)=firebase1\b/.test(enTetes);
                    if (correspondanceFirebase) {
                        nombreCorrespondancesDkim++;
                        journalMsg.push('  Correspondance DKIM Firebase détectée');
                    }
                }
                const resultat = verifierUsurpation(message);
                if (resultat.estUsurpation) {
                    nombreUsurpations++;
                    journalMsg.push('  USURPATION [' + resultat.severite + '] : ' + resultat.raison);
                }
            } catch (e) {
                nombreErreurs++;
                journalMsg.push('  ERREUR : ' + e.message);
            }

            if (journalMsg.length > 0) {
                journalEmail.push('--- ' + de);
                journalEmail.push.apply(journalEmail, journalMsg);
                journalEmail.push('');
            }
        }
    }

    const resume = ['=== RÉSUMÉ ===', 'Messages : ' + totalMessages, 'DKIM : ' + nombreCorrespondancesDkim,
        'Usurpations : ' + nombreUsurpations, 'Erreurs : ' + nombreErreurs];
    resume.forEach(function (l) { Logger.log(l); });

    const destinataire = getEmailProprietaire_();
    if (destinataire) {
        const corps = (journalEmail.length > 0 ? journalEmail.join('\n') + '\n' : '') + resume.join('\n');
        GmailApp.sendEmail(destinataire, 'Débogage Unspoofer : ' + nombreUsurpations + ' usurpations', corps);
    }
}

/**
 * Test ciblé — Fix #2 (var → const).
 */
function deboguerMessage() {
    const recherches = [
        'from:babyamerica newer_than:7d', 'from:avacomornami newer_than:7d',
        'from:fsgebaeudeservice newer_than:7d', 'from:fa-netscher newer_than:7d',
        'in:spam newer_than:7d',
    ];
    let fils = [];
    for (let i = 0; i < recherches.length; i++) {
        fils = GmailApp.search(recherches[i], 0, 5);
        if (fils.length > 0) {
            Logger.log('Trouvé avec la requête : ' + recherches[i]);
            break;
        }
    }
    if (fils.length === 0) {
        const destinataire = getEmailProprietaire_();
        if (destinataire) {
            GmailApp.sendEmail(destinataire, 'deboguerMessage : rien trouvé',
                'Recherches tentées :\n' + recherches.join('\n'));
        }
        Logger.log('Aucun message trouvé');
        return;
    }
    const message = fils[0].getMessages()[0];
    const de = message.getFrom();
    const lignes = ['De : ' + de, ''];

    try {
        const brut = message.getRawContent();
        const enTetes = extraireEnTetes_(brut);
        lignes.push('Longueur brut : ' + brut.length);
        lignes.push('Longueur en-têtes : ' + enTetes.length);

        const selecteurs = enTetes.match(/\bs=[a-z0-9_-]+/gi);
        lignes.push('Valeurs s= : ' + JSON.stringify(selecteurs));
        lignes.push('Firebase : ' + /(?:header\.s|\bs)=firebase1\b/.test(enTetes));

        lignes.push('');
        const resultat = verifierUsurpation(message);
        lignes.push('estUsurpation=' + resultat.estUsurpation);
        lignes.push('severite=' + resultat.severite);
        lignes.push('raison=' + resultat.raison);
    } catch (e) {
        lignes.push('ERREUR : ' + e.message);
    }

    const corps = lignes.join('\n');
    Logger.log(corps);

    const destinataire = getEmailProprietaire_();
    if (destinataire) {
        GmailApp.sendEmail(destinataire, 'Débogage : ' + de, corps);
    }
}

/**
 * Ré-analyse la boîte de réception — Fix #4 (plus de double analyse).
 */
function reanalyserBoiteReception() {
    Logger.log('Vidage du cache des messages traités...');
    effacerCacheTraite();
    Logger.log('Cache vidé. Démarrage d\'une nouvelle analyse...');
    analyserBoiteReception();
    Logger.log('Ré-analyse terminée.');
}
