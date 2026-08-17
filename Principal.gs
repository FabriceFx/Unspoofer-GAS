/**
 * ============================================================================
 *  DÉTECTEUR PHISHING - Principal.gs
 * ============================================================================
 *  Auteur      : Fabrice Faucheux (https://faucheux.bzh)
 *  Projet      : Détecteur Phishing
 *  Rôle        : Contrôleur et orchestrateur d'exécution des tâches d'analyse en arrière-plan.
 *  Version     : 2.5.1
 * ============================================================================
 */

/**
 * Unspoofer — Détecteur d'usurpation de nom d'affichage Gmail.
 * Points d'entrée : configurer(), analyserBoiteReception(), desinstaller(), testerDetection()
 */

const NOM_ETIQUETTE = 'ALERTE-USURPATION';
const LIMITE_TEMPS_EXECUTION_MS = 5 * 60 * 1000;
const TAILLE_PAGE = 100;

// Les fonctions utilitaires de configuration, d'e-mail du propriétaire et de nettoyage HTML ont été déportées dans Utils.gs pour plus de clarté.

/**
 * Retourne l'étiquette d'alerte, en la recréant si elle a disparu.
 *
 * Une étiquette supprimée depuis Gmail est retirée de tous les messages qui la
 * portaient. Sans cette reprise, l'analyse programmée abandonnait à chaque
 * exécution tandis que le tableau de bord continuait d'afficher « surveillance
 * active » : une protection en panne qui se présentait comme opérationnelle.
 *
 * @returns {{etiquette: GmailLabel, recreee: boolean}}
 */
function obtenirOuCreerEtiquette_() {
    const existante = GmailApp.getUserLabelByName(NOM_ETIQUETTE);
    if (existante) return { etiquette: existante, recreee: false };

    Logger.log('Étiquette « ' + NOM_ETIQUETTE + ' » absente — recréation.');
    return { etiquette: GmailApp.createLabel(NOM_ETIQUETTE), recreee: true };
}

/**
 * Crée l'étiquette ALERTE-USURPATION (idempotent) et configure les déclencheurs.
 */
function configurer() {
    const { recreee } = obtenirOuCreerEtiquette_();
    Logger.log(recreee ? 'Étiquette créée : ' + NOM_ETIQUETTE
                       : 'L\'étiquette existe déjà : ' + NOM_ETIQUETTE);

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

    // L'étiquette est recréée si elle a été supprimée : abandonner l'analyse
    // laissait la surveillance inopérante sans que rien ne le signale.
    const { etiquette, recreee } = obtenirOuCreerEtiquette_();
    if (recreee) {
        // Les messages déjà analysés ont perdu leur étiquette en même temps que
        // celle-ci. Vider le cache les rend éligibles à un nouvel étiquetage.
        effacerCacheTraite();
        Logger.log('Étiquette recréée et cache vidé : les messages déjà analysés ' +
                   'seront réexaminés pour retrouver leur étiquetage.');
    }

    let nombreUsurpations = 0;
    let nombreAnalyses = 0;
    let nombreIgnores = 0;
    const detailsUsurpations = [];
    /** Fils déjà étiquetés au cours de cette exécution (déduplication du compteur). */
    const filsSignales = new Set();
    /** Messages dont l'analyse a été tronquée faute de quota d'appels Gmail. */
    let nombrePartiels = 0;
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

                    if (estTraite_(idMsg)) {
                        nombreIgnores++;
                        continue;
                    }

                    // Entourer l'analyse unitaire pour éviter de marquer traité en cas d'erreur
                    try {
                        const resultat = verifierUsurpation_(message);

                        if (resultat.estUsurpation) {
                            // Déduplication des alertes.
                            // On mémorise les fils étiquetés pendant cette exécution :
                            // fil.getLabels() renvoie un instantané qui ne reflète pas
                            // forcément l'étiquette posée quelques lignes plus haut. Sur
                            // un fil comportant plusieurs messages suspects, le compteur
                            // était alors incrémenté une fois par message au lieu d'une
                            // fois par fil, gonflant le total affiché au tableau de bord.
                            const idFil = fil.getId();
                            const dejaSignale = filsSignales.has(idFil) ||
                                fil.getLabels().some(l => l.getName() === NOM_ETIQUETTE);
                            filsSignales.add(idFil);

                            fil.addLabel(etiquette);
                            message.star();

                            if (!dejaSignale) {
                                const expediteur = analyserExpediteur_(message.getFrom());
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

                        // On ne mémorise le message comme traité que si l'analyse
                        // a été COMPLÈTE. Lorsque le quota d'appels Gmail est
                        // épuisé, certains contrôles (corps du message, en-têtes
                        // d'authentification) sont sautés en silence : mémoriser
                        // le message reviendrait à ne jamais l'examiner en entier.
                        // Il sera repris à la prochaine exécution, quota reinitialisé.
                        if (resultat.analysePartielle) {
                            nombrePartiels++;
                        } else {
                            marquerCommeTraite_(idMsg);
                        }
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
        persisterCache_();
    }

    // Statistiques persistantes (#11)
    incrementerStatistiques_(nombreAnalyses, nombreUsurpations);

    if (detailsUsurpations.length > 0) {
        envoyerAlerteUsurpation_(detailsUsurpations);
    }

    Logger.log('Analyse terminée. Analysés : ' + nombreAnalyses +
        ', Ignorés (cache) : ' + nombreIgnores +
        ', Usurpations trouvées : ' + nombreUsurpations);

    if (nombrePartiels > 0) {
        Logger.log('⚠ ' + nombrePartiels + ' message(s) analysés partiellement : le quota ' +
            'd\'appels Gmail de cette exécution a été atteint, certains contrôles ' +
            '(corps, en-têtes) ont été sautés. Ces messages ne sont PAS mémorisés et ' +
            'seront repris à la prochaine exécution.');
    }
}

/**
 * Retourne la couleur associée à un niveau de sévérité.
 * @param {string} severite
 * @returns {string} Code couleur hexadécimal
 */
function couleurSeverite_(severite) {
  if (severite === 'critique') return CONFIG.COLORS.CRITICAL;
  if (severite === 'elevee') return CONFIG.COLORS.HIGH;
  return CONFIG.COLORS.MEDIUM;
}

/**
 * Retourne le libellé traduit du niveau de sévérité.
 * @param {string} severite - Niveau ('critique', 'elevee', etc.)
 * @param {string} lang - Langue active ('fr', 'en')
 * @returns {string}
 */
function libelleSeverite_(severite, lang) {
  const dict = EMAIL_TRANSLATIONS[lang] || EMAIL_TRANSLATIONS['en'];
  if (severite === 'critique') return dict.severityCritique;
  if (severite === 'elevee') return dict.severityElevee;
  return dict.severityMoyenne;
}

/**
 * Envoie une alerte de sécurité par e-mail au style Workspace MD3.
 * S'adapte à la langue de l'utilisateur final et respecte la casse Sentence case.
 * @param {Array<{objet: string, email: string, nomAffichage: string, raison: string, severite: string}>} usurpations
 */
/**
 * Style des cellules du tableau d'alerte.
 *
 * Le conteneur du tableau défile horizontalement dans un client mail, mais à
 * l'impression et à l'export PDF il n'y a pas de défilement : ce qui dépasse
 * est coupé. La colonne « Raison » se retrouvait tronquée en plein mot
 * (« Lien suspect déte… »). Les cellules replient donc leur contenu au lieu
 * d'imposer leur largeur, y compris sur une adresse sans espace.
 */
const STYLE_CELLULE_REPLIABLE =
  'word-break: break-word; overflow-wrap: anywhere; white-space: normal;';

function envoyerAlerteUsurpation_(usurpations) {
  const destinataire = getEmailProprietaire_();
  if (!destinataire) {
    Logger.log('Impossible de déterminer l\'email du propriétaire — alerte ignorée');
    return;
  }

  const lang = getLangueUtilisateur_();
  const dict = EMAIL_TRANSLATIONS[lang] || EMAIL_TRANSLATIONS['en'];

  // Détection de menaces critiques
  const nbCritiques = usurpations.filter(u => u.severite === 'critique').length;
  
  // Sujet bilingue
  const baseSujet = nbCritiques > 0 ? dict.alertSubjectCritique : dict.alertSubjectStandard;
  const sujetEmail = baseSujet + usurpations.length + ' ' + 
                     (usurpations.length > 1 ? dict.alertSubjectSuffixPlural : dict.alertSubjectSuffixSingle);

  // Sous-titre bilingue
  const sousTitre = usurpations.length > 1 
    ? dict.alertSubtitlePlural.replace('{count}', usurpations.length) 
    : dict.alertSubtitleSingle;

  // Lignes du tableau
  const lignes = usurpations.map(function (u) {
    return '<tr style="border-bottom: 1px solid #f1f3f4;">' +
      '<td style="padding: 12px 10px; white-space: nowrap;">' +
        '<span style="background-color:' + couleurSeverite_(u.severite) + '; color: #ffffff; padding: 2px 10px; border-radius: 100px; font-size: 10px; font-weight: 600; display: inline-block;">' +
          libelleSeverite_(u.severite, lang) + 
        '</span>' +
      '</td>' +
      '<td style="padding: 12px 10px; color: #1f1f1f; ' + STYLE_CELLULE_REPLIABLE + '">' + echapHtml_(tronquerChaine_(u.objet, 100)) + '</td>' +
      '<td style="padding: 12px 10px; color: #444746; ' + STYLE_CELLULE_REPLIABLE + '">' + echapHtml_(u.email) + '</td>' +
      '<td style="padding: 12px 10px; color: #444746; ' + STYLE_CELLULE_REPLIABLE + '">' + echapHtml_(tronquerChaine_(u.nomAffichage, 80)) + '</td>' +
      '<td style="padding: 12px 10px; color: ' + CONFIG.COLORS.CRITICAL + '; font-weight: 500; ' + STYLE_CELLULE_REPLIABLE + '">' + echapHtml_(tronquerChaine_(u.raison, 150)) + '</td>' +
      '</tr>';
  }).join('');

  // Bannière critique optionnelle
  let banniereCritique = '';
  if (nbCritiques > 0) {
    banniereCritique = '<div style="background-color: #fce8e6; border-left: 4px solid ' + CONFIG.COLORS.CRITICAL + '; border-radius: 4px; padding: 12px; font-size: 12px; color: ' + CONFIG.COLORS.CRITICAL + '; font-weight: 600; margin-bottom: 20px;">' +
      '⚠️ ' + dict.alertCriticalWarning +
      '</div>';
  }

  // HTML complet au style officiel Google Workspace MD3 Flat
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin: 0; padding: 0; background-color: ' + CONFIG.COLORS.BACKGROUND + ';">' +
    '<div style="background-color: ' + CONFIG.COLORS.BACKGROUND + '; padding: 24px; font-family: \'Open Sans\', \'Inter\', system-ui, -apple-system, sans-serif; color: #1f1f1f; max-width: 650px; margin: 0 auto; border-radius: 16px;">' +
      
      // Branding Header - Utilisation d'entité HTML pour éviter tout bug d'encodage
      '<div style="text-align: center; margin-bottom: 20px;">' +
        '<span style="font-size: 18px; font-weight: 700; color: ' + CONFIG.COLORS.PRIMARY + '; letter-spacing: -0.3px;">&#128737; ' + CONFIG.PROJECT_NAME + '</span>' +
      '</div>' +
      
      // Card Blanche
      '<div style="background-color: #ffffff; border: 1px solid ' + CONFIG.COLORS.BORDER + '; border-radius: 16px; padding: 24px; box-shadow: none;">' +
        '<h2 style="font-size: 16px; font-weight: 600; color: #1f1f1f; margin-top: 0; margin-bottom: 6px;">' + dict.alertTitle + '</h2>' +
        '<p style="font-size: 13px; color: ' + CONFIG.COLORS.SECONDARY + '; margin-top: 0; margin-bottom: 20px;">' + sousTitre + '</p>' +
        
        banniereCritique +
        
        // Conteneur de tableau responsive
        '<div style="overflow-x: auto; border: 1px solid ' + CONFIG.COLORS.BORDER + '; border-radius: 8px; margin-bottom: 8px;">' +
          '<table style="border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 12px; text-align: left; background-color: #ffffff;">' +
            '<colgroup>' +
              '<col style="width: 14%;"><col style="width: 24%;"><col style="width: 22%;">' +
              '<col style="width: 16%;"><col style="width: 24%;">' +
            '</colgroup>' +
            '<thead>' +
              '<tr style="background-color: #f8f9fa; border-bottom: 1px solid ' + CONFIG.COLORS.BORDER + '; color: #1f1f1f; font-weight: 600;">' +
                '<th style="padding: 10px;">' + dict.colSeverity + '</th>' +
                '<th style="padding: 10px;">' + dict.colSubject + '</th>' +
                '<th style="padding: 10px;">' + dict.colEmail + '</th>' +
                '<th style="padding: 10px;">' + dict.colDisplayName + '</th>' +
                '<th style="padding: 10px;">' + dict.colReason + '</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + lignes + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
      
      // Footer - Mise en page en ligne robuste sans flexbox pour compatibilité tous clients mail
      '<div style="text-align: center; margin-top: 20px; font-size: 11px; color: ' + CONFIG.COLORS.SECONDARY + '; line-height: 1.4;">' +
        '<p style="margin: 0 0 10px 0;">' + dict.footerTextAlert + '</p>' +
        '<p style="margin: 14px 0 0; font-size: 10px; color: ' + CONFIG.COLORS.SECONDARY + ';">' +
          '<a href="https://faucheux.bzh" target="_blank" style="color: ' + CONFIG.COLORS.PRIMARY + '; text-decoration: none; font-weight: 600; display: inline-block; vertical-align: middle;">' + dict.authorSignature + '</a>' +
          '<span style="color: #e3e3e3; margin: 0 8px; display: inline-block; vertical-align: middle;">|</span>' +
          '<a href="https://github.com/FabriceFx/Unspoofer-GAS" target="_blank" style="color: ' + CONFIG.COLORS.PRIMARY + '; text-decoration: none; font-weight: 600; display: inline-block; vertical-align: middle;">' + dict.helpLinkText + '</a>' +
        '</p>' +
      '</div>' +
      
    '</div></body></html>';

  GmailApp.sendEmail(destinataire, sujetEmail, '', { htmlBody: html });
  Logger.log('Email d\'alerte envoyé à ' + destinataire + ' (' + lang.toUpperCase() + ')');
}

/**
 * Envoie le rapport hebdomadaire stylisé sous forme de carte Google Workspace MD3.
 * S'adapte de façon asynchrone à la langue de l'utilisateur final.
 */
function envoyerRapportHebdomadaire_() {
  const stats = getStatistiques_();
  const destinataire = getEmailProprietaire_();
  if (!destinataire || stats.totalAnalyses === 0) return;

  const lang = getLangueUtilisateur_();
  const dict = EMAIL_TRANSLATIONS[lang] || EMAIL_TRANSLATIONS['en'];

  // Calcul des deltas hebdomadaires
  const deltaAnalyses = stats.totalAnalyses - (stats.snapshotHebdo?.analyses || 0);
  const deltaUsurpations = stats.totalUsurpations - (stats.snapshotHebdo?.usurpations || 0);

  const tauxHebdo = deltaAnalyses > 0
    ? ((deltaUsurpations / deltaAnalyses) * 100).toFixed(1) + '%'
    : '0%';

  // Remplacement des variables dans la signature cumulée
  const texteCumule = dict.statExecutions
    .replace('{exec}', stats.totalExecutions)
    .replace('{analyzed}', stats.totalAnalyses)
    .replace('{blocked}', stats.totalUsurpations);

  // Construction du corps HTML au style officiel de Google Workspace MD3 Flat
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin: 0; padding: 0; background-color: ' + CONFIG.COLORS.BACKGROUND + ';">' +
    '<div style="background-color: ' + CONFIG.COLORS.BACKGROUND + '; padding: 24px; font-family: \'Open Sans\', \'Inter\', system-ui, -apple-system, sans-serif; color: #1f1f1f; max-width: 550px; margin: 0 auto; border-radius: 16px;">' +
      
      // Header branding - Utilisation d'entité HTML pour éviter tout bug d'encodage
      '<div style="text-align: center; margin-bottom: 20px;">' +
        '<span style="font-size: 18px; font-weight: 700; color: ' + CONFIG.COLORS.PRIMARY + '; letter-spacing: -0.3px;">&#128737; ' + CONFIG.PROJECT_NAME + '</span>' +
      '</div>' +
      
      // Card Blanche
      '<div style="background-color: #ffffff; border: 1px solid ' + CONFIG.COLORS.BORDER + '; border-radius: 16px; padding: 24px; box-shadow: none;">' +
        '<h2 style="font-size: 16px; font-weight: 600; color: #1f1f1f; margin-top: 0; margin-bottom: 6px;">' + dict.reportTitle + '</h2>' +
        '<p style="font-size: 13px; color: ' + CONFIG.COLORS.SECONDARY + '; margin-top: 0; margin-bottom: 20px;">' + dict.reportSubtitle + '</p>' +
        
        // Table des KPIs hebdomadaires
        '<table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 20px;">' +
          '<tr style="border-bottom: 1px solid #f1f3f4;">' +
            '<td style="padding: 12px 4px; color: ' + CONFIG.COLORS.SECONDARY + ';">' + dict.statAnalyzed + '</td>' +
            '<td style="padding: 12px 4px; font-weight: 600; text-align: right; color: #1f1f1f;">' + deltaAnalyses + '</td>' +
          '</tr>' +
          '<tr style="border-bottom: 1px solid #f1f3f4;">' +
            '<td style="padding: 12px 4px; color: ' + CONFIG.COLORS.SECONDARY + ';">' + dict.statBlocked + '</td>' +
            '<td style="padding: 12px 4px; font-weight: 600; text-align: right; color: ' + CONFIG.COLORS.CRITICAL + ';">' + deltaUsurpations + '</td>' +
          '</tr>' +
          '<tr style="border-bottom: 1px solid #f1f3f4;">' +
            '<td style="padding: 12px 4px; color: ' + CONFIG.COLORS.SECONDARY + ';">' + dict.statRate + '</td>' +
            '<td style="padding: 12px 4px; font-weight: 600; text-align: right; color: ' + CONFIG.COLORS.PRIMARY + ';">' + tauxHebdo + '</td>' +
          '</tr>' +
        '</table>' +
        
        // Boîte d'informations cumulées
        '<div style="background-color: #f8f9fa; border: 1px solid ' + CONFIG.COLORS.BORDER + '; border-radius: 8px; padding: 12px; font-size: 11px; color: ' + CONFIG.COLORS.SECONDARY + ';">' +
          '<div style="font-weight: 600; color: #1f1f1f; margin-bottom: 4px;">' + dict.statCumulative + '</div>' +
          '<div>' + texteCumule + '</div>' +
        '</div>' +
      '</div>' +
      
      // Footer - Mise en page en ligne robuste sans flexbox pour compatibilité tous clients mail
      '<div style="text-align: center; margin-top: 20px; font-size: 11px; color: ' + CONFIG.COLORS.SECONDARY + '; line-height: 1.4;">' +
        '<p style="margin: 0 0 10px 0;">' + dict.footerTextReport + '</p>' +
        '<p style="margin: 14px 0 0; font-size: 10px; color: ' + CONFIG.COLORS.SECONDARY + ';">' +
          '<a href="https://faucheux.bzh" target="_blank" style="color: ' + CONFIG.COLORS.PRIMARY + '; text-decoration: none; font-weight: 600; display: inline-block; vertical-align: middle;">' + dict.authorSignature + '</a>' +
          '<span style="color: #e3e3e3; margin: 0 8px; display: inline-block; vertical-align: middle;">|</span>' +
          '<a href="https://github.com/FabriceFx/Unspoofer-GAS" target="_blank" style="color: ' + CONFIG.COLORS.PRIMARY + '; text-decoration: none; font-weight: 600; display: inline-block; vertical-align: middle;">' + dict.helpLinkText + '</a>' +
        '</p>' +
      '</div>' +
      
    '</div></body></html>';

  GmailApp.sendEmail(destinataire, dict.reportSubject, '', { htmlBody: html });
  Logger.log('Rapport hebdomadaire envoyé à ' + destinataire + ' (' + lang.toUpperCase() + ')');

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
        return { ok: true, motif: 'doublon' };
    }

    // La liste candidate est construite à part : en cas de refus d'écriture,
    // la liste en mémoire ne doit pas diverger de celle réellement stockée.
    const candidate = listeBlanche.concat([entree]);
    const ecriture = ecrireProprieteLimitee_(
        CLE_PROPRIETE_LISTE_BLANCHE, JSON.stringify(candidate)
    );
    if (!ecriture.ok) {
        Logger.log('Liste blanche pleine — « ' + entree + ' » non ajouté.');
        return { ok: false, motif: 'plafond', taille: ecriture.taille, limite: ecriture.limite };
    }

    _cacheListeBlanche = candidate;
    Logger.log('Ajouté à la liste blanche : ' + entree);
    return { ok: true, motif: 'ajout' };
}

/**
 * Exécute la suite de tests intégrée sur des exemples d'usurpation codés en dur.
 * Appelée depuis le menu du script et depuis le tableau de bord (runUnitTests).
 * @param {boolean} [retournerResultats=false] - Si vrai, renvoie le détail des
 *   résultats ; sinon, se contente de les journaliser.
 * @returns {{total: number, reussis: number, echoues: number, details: Array<Object>}|undefined}
 *   Le rapport de test si retournerResultats vaut vrai, rien sinon.
 */
function testerDetection(retournerResultats = false) {
    const casTests = [
        { nom: 'Usurpation Wix en cyrillique', de: '"W\u0456x.c\u043Em" <info@bistro-pub.de>', usurpationAttendue: true },
        { nom: 'Usurpation PayPal en cyrillique', de: '"P\u0430yP\u0430l Security" <alerts@some-random.com>', usurpationAttendue: true },
        { nom: 'Email Wix légitime', de: '"Wix.com" <noreply@wix.com>', usurpationAttendue: false },
        { nom: 'Email Google légitime', de: '"Google" <no-reply@accounts.google.com>', usurpationAttendue: false },
        { nom: 'Usurpation Apple pleine largeur', de: '"\uFF21\uFF50\uFF50\uFF4C\uFF45 Support" <help@totally-legit.xyz>', usurpationAttendue: true },
        // Le rapprochement de marque \u00E9choue ici : normalis\u00E9, \u00AB Netfli\u03BF \u00BB donne
        // \u00AB netflio \u00BB, qui n'est pas \u00AB netflix \u00BB. Le message reste n\u00E9anmoins
        // frauduleux \u2014 un nom d'affichage annon\u00E7ant un domaine sans rapport
        // avec l'exp\u00E9diteur r\u00E9el \u2014 et c'est le contr\u00F4le \u00AB domaine g\u00E9n\u00E9rique \u00BB
        // qui le rattrape. L'attente \u00E9tait \u00E0 false, ce qui revenait \u00E0 exiger
        // qu'un message d'hame\u00E7onnage passe au travers.
        { nom: 'Domaine annonc\u00E9 sans rapport avec l\'exp\u00E9diteur', de: '"Netfli\u03BF.com" <billing@fake-stream.net>', usurpationAttendue: true },
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
        
        // Nouveaux cas de test v2.2.0
        { nom: 'Écart texte/lien HTML (Mismatch)', de: '"PayPal" <info@legit-company.com>', html: 'Cliquez ici : <a href="http://evil-paypal.com/login">https://paypal.com/mon-compte</a>', usurpationAttendue: true },
        { nom: 'Typosquatting concaténé (Mots-clés)', de: '"Ameli Assistance" <support@ameli-verification-securite.com>', usurpationAttendue: true },
        { nom: 'Domaine lié autorisé (Google via googlemail)', de: '"Google" <accounts@googlemail.com>', usurpationAttendue: false }
    ];

    let reussis = 0;
    let echoues = 0;
    const details = [];
    const domaineProprietaireSauvegarde = _cacheDomaineProprietaire;

    try {
        for (const ct of casTests) {
            _cacheDomaineProprietaire = Object.prototype.hasOwnProperty.call(ct, 'domaineProprietaire')
                ? ct.domaineProprietaire : '';

            // Le message simulé doit couvrir TOUTE la surface de GmailMessage
            // utilisée par verifierUsurpation_(). Il manquait getSubject(),
            // appelé depuis le garde-fou anti-boucle d'auto-alerte : la suite
            // levait une exception dès le premier cas et n'affichait donc
            // jamais le moindre résultat.
            const messageSimule = {
                getFrom: () => ct.de,
                getSubject: () => ct.objet || 'Message de test',
                getReplyTo: () => ct.replyTo || '',
                getPlainBody: () => ct.corps || '',
                getBody: () => ct.html || ct.corps || '',
                getAttachments: () => (ct.pj || []).map(p => ({ getName: () => p.name })),
                getRawContent: () => ct.enTetesBruts || '',
                getId: () => 'test-' + ct.nom,
            };

            const resultat = verifierUsurpation_(messageSimule);
            const statut = (resultat.estUsurpation === ct.usurpationAttendue) ? 'RÉUSSI' : 'ÉCHEC';
            if (statut === 'RÉUSSI') { reussis++; } else { echoues++; }

            Logger.log(statut + ' : ' + ct.nom);
            if (resultat.estUsurpation) Logger.log('  Sévérité : ' + resultat.severite + ' | Raison : ' + resultat.raison);
            if (statut === 'ÉCHEC') Logger.log('  ⚠️ Détecté=' + resultat.estUsurpation + ' Attendu=' + ct.usurpationAttendue);
            Logger.log('');

            details.push({
                nom: ct.nom,
                attendu: ct.usurpationAttendue,
                obtenu: resultat.estUsurpation,
                statut: statut,
                severite: resultat.severite || 'aucune',
                raison: resultat.raison || 'Légitime (aucune menace détectée)'
            });
        }
    } finally {
        _cacheDomaineProprietaire = domaineProprietaireSauvegarde;
    }

    Logger.log('Résultats : ' + reussis + ' réussis, ' + echoues + ' échoués sur ' + casTests.length + ' tests');

    if (retournerResultats) {
        return {
            total: casTests.length,
            reussis: reussis,
            echoues: echoues,
            details: details
        };
    }
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
        const resultat = verifierUsurpation_(message);
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
 * Compare le compteur affiché au tableau de bord à ce que contient réellement
 * Gmail, et explique l'écart s'il y en a un.
 *
 * À lancer depuis l'éditeur Apps Script (Exécuter > diagnostiquerAlertes) puis
 * à lire dans le journal d'exécution.
 *
 * @returns {{etiquetteExiste: boolean, filsEtiquetes: number, statUsurpations: number,
 *            ecart: number, exemples: Array<Object>}} Rapport de diagnostic.
 */
function diagnostiquerAlertes() {
    const rapport = {
        etiquetteExiste: false,
        filsEtiquetes: 0,
        statUsurpations: 0,
        ecart: 0,
        exemples: [],
    };

    Logger.log('════════ DIAGNOSTIC DES ALERTES ════════');

    // 1. L'étiquette existe-t-elle encore ?
    const etiquette = GmailApp.getUserLabelByName(NOM_ETIQUETTE);
    rapport.etiquetteExiste = !!etiquette;
    if (!etiquette) {
        Logger.log('✗ L\'étiquette « ' + NOM_ETIQUETTE + ' » est INTROUVABLE.');
        Logger.log('  Elle a probablement été supprimée depuis Gmail. Supprimer une');
        Logger.log('  étiquette la retire de tous les messages qui la portaient, sans');
        Logger.log('  toucher aux messages eux-mêmes. Les compteurs, eux, sont conservés.');
        Logger.log('  → Lancez configurer() pour la recréer, puis reanalyserBoiteReception().');
        return rapport;
    }
    Logger.log('✓ Étiquette « ' + NOM_ETIQUETTE + ' » présente.');

    // 2. Combien de fils la portent réellement ?
    let debut = 0;
    const PAS = 100;
    let lot;
    do {
        lot = GmailApp.search('label:' + NOM_ETIQUETTE, debut, PAS);
        rapport.filsEtiquetes += lot.length;
        for (const fil of lot) {
            if (rapport.exemples.length < 10) {
                const dernier = fil.getMessages()[fil.getMessages().length - 1];
                rapport.exemples.push({
                    objet: dernier.getSubject(),
                    de: dernier.getFrom(),
                    date: dernier.getDate(),
                });
            }
        }
        debut += PAS;
    } while (lot.length === PAS);

    Logger.log('→ Fils portant l\'étiquette dans Gmail : ' + rapport.filsEtiquetes);

    // 3. Que dit le compteur ?
    const stats = getStatistiques_();
    rapport.statUsurpations = stats.totalUsurpations || 0;
    rapport.ecart = rapport.statUsurpations - rapport.filsEtiquetes;
    Logger.log('→ Compteur « usurpations bloquées » : ' + rapport.statUsurpations);
    Logger.log('→ Écart : ' + rapport.ecart);

    // 4. Interprétation
    if (rapport.filsEtiquetes === 0 && rapport.statUsurpations > 0) {
        Logger.log('');
        Logger.log('Aucun fil ne porte l\'étiquette alors que le compteur est positif.');
        Logger.log('Causes possibles, par ordre de fréquence :');
        Logger.log('  a) les messages signalés ont été supprimés ou archivés depuis ;');
        Logger.log('  b) l\'étiquette a été supprimée puis recréée dans Gmail ;');
        Logger.log('  c) le compteur est cumulatif depuis l\'installation, alors que');
        Logger.log('     la recherche ne porte que sur les messages encore présents.');
        Logger.log('  → reinitialiserStatistiques() remet le compteur à zéro.');
    } else if (rapport.ecart > 0) {
        Logger.log('');
        Logger.log('Le compteur dépasse le nombre de fils étiquetés. C\'est attendu si');
        Logger.log('des messages signalés ont depuis été supprimés ou archivés.');
    } else if (rapport.filsEtiquetes > 0) {
        Logger.log('');
        Logger.log('Compteur et étiquettes concordent.');
        Logger.log('Pour les retrouver dans Gmail, cherchez : label:' + NOM_ETIQUETTE);
        Logger.log('L\'étiquette peut être repliée sous « Plus » dans la barre latérale.');
    }

    if (rapport.exemples.length) {
        Logger.log('');
        Logger.log('Derniers messages étiquetés :');
        rapport.exemples.forEach(e => {
            Logger.log('  • ' + e.date + ' — ' + e.de + ' — ' + e.objet);
        });
    }

    Logger.log('════════════════════════════════════════');
    return rapport;
}

/**
 * Retire l'étiquette d'alerte de tous les fils qui la portent.
 *
 * Étape indispensable d'une remise à zéro : la déduplication considère qu'un
 * fil déjà étiqueté a déjà été signalé et ne le recompte pas. Sans ce retrait,
 * une ré-analyse après remise à zéro laisserait les compteurs à zéro tout en
 * ayant réexaminé les messages.
 *
 * Aucun message n'est supprimé ni déplacé : seule l'étiquette est retirée, et
 * l'analyse qui suit la repose sur les messages toujours jugés frauduleux.
 *
 * @returns {number} Nombre de fils désétiquetés
 */
function retirerEtiquetteDeTous_() {
    const etiquette = GmailApp.getUserLabelByName(NOM_ETIQUETTE);
    if (!etiquette) return 0;

    let total = 0;
    const PAS = 100;   // GmailApp traite au plus 100 fils par appel
    let lot;
    do {
        lot = GmailApp.search('label:' + NOM_ETIQUETTE, 0, PAS);
        if (lot.length) {
            etiquette.removeFromThreads(lot);
            total += lot.length;
        }
        // La recherche est relancée depuis le début : les fils traités ne
        // portent plus l'étiquette et sortent donc du résultat.
    } while (lot.length === PAS);

    Logger.log('Étiquette retirée de ' + total + ' fil(s).');
    return total;
}

/**
 * Remise à zéro complète : compteurs, cache des messages examinés et
 * étiquetage, suivie d'une nouvelle analyse.
 *
 * C'est la seule séquence qui reconstruit des compteurs justes. Vider le cache
 * sans retirer l'étiquette laisserait la déduplication écarter les fils déjà
 * signalés, et les compteurs resteraient à zéro.
 *
 * @returns {{filsDesetiquetes: number}}
 */
function repartirDeZero() {
    Logger.log('════════ REMISE À ZÉRO COMPLÈTE ════════');
    const filsDesetiquetes = retirerEtiquetteDeTous_();
    effacerCacheTraite();
    reinitialiserStatistiques();
    Logger.log('Compteurs, cache et étiquetage effacés. Nouvelle analyse...');
    analyserBoiteReception();
    Logger.log('════════════════════════════════════════');
    return { filsDesetiquetes: filsDesetiquetes };
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
        const exp = analyserExpediteur_(dernierMsg.getFrom());
        const domaineAffiche = extraireDomaineDuNomAffichage_(exp.nomAffichage);

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
        const resultat = verifierUsurpation_(message);
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
