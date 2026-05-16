/**
 * Unspoofer — Détecteur d'usurpation de nom d'affichage Gmail.
 * Points d'entrée : configurer(), analyserBoiteReception(), desinstaller(), testerDetection()
 */

const NOM_ETIQUETTE = 'ALERTE-USURPATION';
const LIMITE_TEMPS_EXECUTION_MS = 5 * 60 * 1000;
const TAILLE_PAGE = 100;

/**
 * Retourne la fenêtre d'analyse en jours (configurable via ScriptProperties).
 * Point 2.
 * @returns {number}
 */
function getFenetreAnalyse_() {
    try {
        const val = PropertiesService.getScriptProperties().getProperty('fenetreAnalyseJours');
        return parseInt(val, 10) || 7;
    } catch (e) {
        return 7;
    }
}

/**
 * Crée l'étiquette ALERTE-USURPATION (idempotent) et configure les déclencheurs.
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
        const handler = declencheur.getHandlerFunction();
        if (handler === 'analyserBoiteReception' || handler === 'envoyerRapportHebdomadaire_') {
            ScriptApp.deleteTrigger(declencheur);
        }
    }

    // Déclencheur d'analyse (toutes les 10 minutes)
    ScriptApp.newTrigger('analyserBoiteReception')
        .timeBased()
        .everyMinutes(10)
        .create();

    // Déclencheur de rapport hebdomadaire (Point 9)
    ScriptApp.newTrigger('envoyerRapportHebdomadaire_')
        .timeBased()
        .everyWeeks(1)
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(9)
        .create();

    Logger.log('Configuration terminée. Unspoofer est actif (fenêtre : ' + getFenetreAnalyse_() + ' jours).');
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

    // Réinitialiser les quotas pour cette exécution (Point 3)
    _appelsRawContent = 0;
    _appelsPlainBody = 0;

    const requete = 'in:inbox newer_than:' + getFenetreAnalyse_() + 'd';

    try {
        let depart = 0;
        let fils;

        do {
            fils = GmailApp.search(requete, depart, TAILLE_PAGE);

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

                    // Entourer l'analyse unitaire pour éviter de marquer traité en cas d'erreur
                    try {
                        const resultat = verifierUsurpation(message);

                        if (resultat.estUsurpation) {
                            // Déduplication des alertes : vérifier si le thread est déjà étiqueté (Point 1)
                            const dejaSignale = fil.getLabels().some(l => l.getName() === NOM_ETIQUETTE);

                            fil.addLabel(etiquette);
                            message.star();

                            if (!dejaSignale) {
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
                            } else {
                                Logger.log('Déjà étiqueté — pas de nouvelle alerte email.');
                            }
                        }

                        // On ne marque traité que si l'analyse a abouti sans erreur
                        marquerCommeTraite(idMsg);
                        nombreAnalyses++; // Déplacé ici (Point 7)
                    } catch (e) {
                        Logger.log('Erreur message ' + idMsg + ' : ' + e.message);
                    }
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
    if (severite === 'critique') return 'CRITIQUE';
    if (severite === 'elevee') return 'ELEVEE';
    return 'MOYENNE';
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
    const tronquer = (s, max) => s && s.length > max ? s.slice(0, max) + '…' : (s || '');

    const lignes = usurpations.map(function (u) {
        return '<tr>' +
            '<td style="padding:8px;border:1px solid #ddd">' +
            '<span style="background:' + couleurSeverite_(u.severite) + ';color:white;padding:2px 8px;border-radius:4px;font-size:12px">' +
            libelleSeverite_(u.severite) + '</span></td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(tronquer(u.objet, 120)) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(u.email) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(tronquer(u.nomAffichage, 100)) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd">' + echap(tronquer(u.raison, 200)) + '</td>' +
            '</tr>';
    }).join('');

    const nbCritiques = usurpations.filter(u => u.severite === 'critique').length;

    const html = '<meta charset="UTF-8">' +
        '<h2>Alerte Usurpation : ' + usurpations.length + ' message' +
        (usurpations.length > 1 ? 's suspects détectés' : ' suspect détecté') + '</h2>' +
        (nbCritiques > 0 ? '<p style="color:#d32f2f;font-weight:bold">!!! ' + nbCritiques + ' menace(s) critique(s) !!!</p>' : '') +
        '<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">' +
        '<tr style="background:#424242;color:white">' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Sévérité</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Objet</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Email</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Nom Affiché</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left">Raison</th>' +
        '</tr>' + lignes + '</table>' +
        '<p style="color:#666;font-size:12px">Envoyé par Unspoofer. Ces messages ont été étiquetés ALERTE-USURPATION.</p>';

    const sujetEmail = (nbCritiques > 0 ? '[CRITIQUE] ' : '[ALERTE] ') +
        'Alerte Usurpation : ' + usurpations.length + ' message' +
        (usurpations.length > 1 ? 's' : '');

    GmailApp.sendEmail(destinataire, sujetEmail, '', { htmlBody: html });
    Logger.log('Email d\'alerte envoyé à ' + destinataire);
}

/**
 * Envoie un rapport hebdomadaire de synthèse des statistiques (Point 9).
 * Utilise les deltas par rapport au dernier snapshot (Point 8).
 */
function envoyerRapportHebdomadaire_() {
    const stats = getStatistiques();
    const destinataire = getEmailProprietaire_();
    if (!destinataire || stats.totalAnalyses === 0) return;

    // Calcul des deltas hebdomadaires (Option B - Point 8)
    const deltaAnalyses = stats.totalAnalyses - (stats.snapshotHebdo?.analyses || 0);
    const deltaUsurpations = stats.totalUsurpations - (stats.snapshotHebdo?.usurpations || 0);

    const tauxHebdo = deltaAnalyses > 0
        ? ((deltaUsurpations / deltaAnalyses) * 100).toFixed(1) + '%'
        : '0%';

    const html = '<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;padding:20px;border-radius:8px">' +
        '<h2 style="color:#1a73e8;border-bottom:2px solid #1a73e8;padding-bottom:10px">Rapport Hebdomadaire Unspoofer</h2>' +
        '<p>Voici le résumé de votre protection email pour cette semaine :</p>' +
        '<table style="width:100%;font-size:16px;border-collapse:collapse">' +
        '<tr><td style="padding:10px;border-bottom:1px solid #eee">Messages analysés</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold;text-align:right">' + deltaAnalyses + '</td></tr>' +
        '<tr><td style="padding:10px;border-bottom:1px solid #eee">Usurpations bloquées</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold;text-align:right;color:#d32f2f">' + deltaUsurpations + '</td></tr>' +
        '<tr><td style="padding:10px;border-bottom:1px solid #eee">Taux de détection</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:bold;text-align:right">' + tauxHebdo + '</td></tr>' +
        '</table>' +
        '<p style="margin-top:20px;font-size:14px;color:#333"><b>Total cumulé depuis l\'installation :</b><br>' +
        'Analyses : ' + stats.totalAnalyses + ' | Usurpations : ' + stats.totalUsurpations + ' | Exécutions : ' + stats.totalExecutions + '</p>' +
        '<p style="margin-top:20px;color:#666;font-size:13px">Votre protection est active. Fenêtre d\'analyse : ' + getFenetreAnalyse_() + ' jours.</p>' +
        '</div>';

    GmailApp.sendEmail(destinataire, '📊 Rapport Hebdomadaire Unspoofer', '', { htmlBody: html });
    Logger.log('Rapport hebdomadaire envoyé à ' + destinataire);

    // Sauvegarder le snapshot pour la semaine prochaine
    sauvegarderSnapshotHebdo_();
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
        { nom: 'Phishing Firebase', de: '"Account Alert" <noreply@kriyiasahbi.firebaseapp.com>', usurpationAttendue: true },
        {
            nom: 'Firebase DKIM personnalisé', de: '"Mise à jour" <noreply@qgui777com.com>', usurpationAttendue: true,
            enTetesBruts: 'DKIM-Signature: v=1; a=rsa-sha256; d=qgui777com.com; s=firebase1; b=abc\n\n',
        },
        { nom: 'Marque dans partie locale — Wix', de: '"Wix Domain Registration" <domains.notifications.wix.renew@investireinlettonia.it>', usurpationAttendue: true },
        { nom: 'Usurpation ChatGPT', de: '"ChatGPT" <noreply@info.casadelsilencio.de>', usurpationAttendue: true },
        { nom: 'Reply-To divergent', de: '"Amazon Support" <noreply@amazon.com>', replyTo: 'hacker@evil.com', usurpationAttendue: true },
        { nom: 'Lien suspect dans le corps', de: '"Info" <info@legit.com>', corps: 'Cliquez ici : http://paypa1.com/secure', usurpationAttendue: true },
        { nom: 'Pièce jointe HTML', de: '"Facture" <info@legit.com>', pj: [{ name: 'facture.html' }], usurpationAttendue: true },
    ];

    let reussis = 0;
    let echoues = 0;
    const domaineProprietaireSauvegarde = _cacheDomaineProprietaire;

    try {
        for (const ct of casTests) {
            _cacheDomaineProprietaire = Object.prototype.hasOwnProperty.call(ct, 'domaineProprietaire')
                ? ct.domaineProprietaire : '';

            const messageSimule = {
                getFrom: () => ct.de,
                getReplyTo: () => ct.replyTo || '',
                getPlainBody: () => ct.corps || '',
                getAttachments: () => (ct.pj || []).map(p => ({ getName: () => p.name })),
                getRawContent: () => ct.enTetesBruts || '',
            };

            const resultat = verifierUsurpation(messageSimule);
            const statut = (resultat.estUsurpation === ct.usurpationAttendue) ? 'RÉUSSI' : 'ÉCHEC';
            if (statut === 'RÉUSSI') { reussis++; } else { echoues++; }

            Logger.log(statut + ' : ' + ct.nom);
            if (resultat.estUsurpation) Logger.log('  Sévérité : ' + resultat.severite + ' | Raison : ' + resultat.raison);
            if (statut === 'ÉCHEC') Logger.log('  ⚠️ Détecté=' + resultat.estUsurpation + ' Attendu=' + ct.usurpationAttendue);
            Logger.log('');
        }
    } finally {
        _cacheDomaineProprietaire = domaineProprietaireSauvegarde;
    }

    Logger.log('Résultats : ' + reussis + ' réussis, ' + echoues + ' échoués sur ' + casTests.length + ' tests');
}

/**
 * Test ciblé — Point 10 (for...of).
 */
function deboguerMessage() {
    const recherches = [
        'from:babyamerica newer_than:7d', 'from:avacomornami newer_than:7d',
        'from:fsgebaeudeservice newer_than:7d', 'from:fa-netscher newer_than:7d',
        'in:spam newer_than:7d',
    ];
    let fils = [];
    for (const requete of recherches) {
        fils = GmailApp.search(requete, 0, 5);
        if (fils.length > 0) {
            Logger.log('Trouvé avec la requête : ' + requete);
            break;
        }
    }
    if (fils.length === 0) {
        Logger.log('Aucun message trouvé');
        return;
    }
    const message = fils[0].getMessages()[0];
    const de = message.getFrom();
    const lignes = ['De : ' + de, ''];

    try {
        const resultat = verifierUsurpation(message);
        lignes.push('estUsurpation=' + resultat.estUsurpation);
        lignes.push('severite=' + resultat.severite);
        lignes.push('raison=' + resultat.raison);
    } catch (e) {
        lignes.push('ERREUR : ' + e.message);
    }

    const corps = lignes.join('\n');
    Logger.log(corps);
}

/**
 * Ré-analyse la boîte de réception.
 */
function reanalyserBoiteReception() {
    Logger.log('Vidage du cache des messages traités...');
    effacerCacheTraite();
    Logger.log('Cache vidé. Démarrage d\'une nouvelle analyse...');
    analyserBoiteReception();
    Logger.log('Ré-analyse terminée.');
}

/**
 * Analyse les messages déjà étiquetés ALERTE-USURPATION pour identifier des domaines fréquents.
 * Utile pour découvrir de nouvelles marques à surveiller ou des faux positifs à whitelister.
 */
function analyserMarquesNonDetectees() {
    Logger.log('Analyse des 50 dernières alertes (30 derniers jours)...');
    const fils = GmailApp.search('label:' + NOM_ETIQUETTE + ' newer_than:30d', 0, 50);
    const frequences = {};
    const domainesParEmail = {};

    for (const fil of fils) {
        const messages = fil.getMessages();
        const dernierMsg = messages[messages.length - 1]; // On prend le dernier du fil
        const exp = analyserExpediteur(dernierMsg.getFrom());
        const domaineAffiche = extraireDomaineDuNomAffichage(exp.nomAffichage);

        if (domaineAffiche) {
            frequences[domaineAffiche] = (frequences[domaineAffiche] || 0) + 1;
            if (!domainesParEmail[domaineAffiche]) domainesParEmail[domaineAffiche] = new Set();
            domainesParEmail[domaineAffiche].add(exp.email);
        }
    }

    const resultats = Object.entries(frequences)
        .filter(([, n]) => n >= 2)
        .sort(([, a], [, b]) => b - a);

    if (resultats.length === 0) {
        Logger.log('Aucun domaine récurrent trouvé dans les alertes récentes.');
        return;
    }

    Logger.log('=== Domaines récurrents dans les alertes ===');
    resultats.forEach(([domaine, n]) => {
        Logger.log('Domaine : ' + domaine + ' (' + n + ' apparitions)');
        const emails = Array.from(domainesParEmail[domaine]);
        Logger.log('  Exemples d\'emails : ' + emails.slice(0, 3).join(', '));
        Logger.log('  Pour whitelister : ajouterALaListeBlanche("' + domaine + '")');
        Logger.log('-------------------------------------------');
    });
}

/**
 * Analyse un message spécifique par son ID (trouvable dans l'URL Gmail ou via log).
 * @param {string} idMessage
 */
function deboguerMessageById(idMessage) {
    if (!idMessage) {
        Logger.log('Veuillez fournir un ID de message.');
        return;
    }
    try {
        const message = GmailApp.getMessageById(idMessage);
        const resultat = verifierUsurpation(message);
        Logger.log('--- Diagnostic Message ---');
        Logger.log('De : ' + message.getFrom());
        Logger.log('Sujet : ' + message.getSubject());
        Logger.log('Détection : ' + (resultat.estUsurpation ? 'OUI' : 'NON'));
        if (resultat.estUsurpation) {
            Logger.log('Sévérité : ' + resultat.severite);
            Logger.log('Raison : ' + resultat.raison);
            Logger.log('Détails : ' + resultat.details);
        }
    } catch (e) {
        Logger.log('Erreur : ' + e.message);
    }
}
