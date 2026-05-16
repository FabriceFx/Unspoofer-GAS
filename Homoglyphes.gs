/**
 * Normalisation des homoglyphes — fait correspondre les caractères Unicode visuellement similaires à l'ASCII.
 */

// Caractères cyrilliques, grecs et pleine largeur qui ressemblent à des lettres latines
const CARTE_HOMOGLYPHES = {
    // Cyrillique minuscule
    '\u0430': 'a', // а
    '\u0441': 'c', // с
    '\u0435': 'e', // е
    '\u043E': 'o', // о
    '\u0440': 'p', // р
    '\u0445': 'x', // х
    '\u0443': 'y', // у
    '\u0456': 'i', // і
    '\u0455': 's', // ѕ
    '\u0458': 'j', // ј
    '\u043A': 'k', // к (assez proche dans certaines polices)
    '\u043D': 'h', // н (ressemble à h dans certaines polices)
    '\u0442': 't', // т (dans certaines polices avec empattement)
    '\u0432': 'b', // в (ressemble à b dans certaines polices)
    '\u0433': 'r', // г (ressemble à r dans certaines polices)
    '\u0437': '3', // з (ressemble à 3)
    '\u0456': 'i', // і (i ukrainien)
    '\u0491': 'r', // ґ

    // Cyrillique majuscule
    '\u0410': 'a', // А
    '\u0412': 'b', // В
    '\u0421': 'c', // С
    '\u0415': 'e', // Е
    '\u041D': 'h', // Н
    '\u0406': 'i', // І
    '\u0408': 'j', // Ј
    '\u041A': 'k', // К
    '\u041C': 'm', // М
    '\u041E': 'o', // О
    '\u0420': 'p', // Р
    '\u0405': 's', // Ѕ
    '\u0422': 't', // Т
    '\u0425': 'x', // Х
    '\u0423': 'y', // У

    // Grec minuscule
    '\u03BF': 'o', // ο
    '\u03B1': 'a', // α
    '\u03BD': 'v', // ν
    '\u03C1': 'p', // ρ
    '\u03B5': 'e', // ε
    '\u03B9': 'i', // ι
    '\u03BA': 'k', // κ
    '\u03C4': 't', // τ (dans certaines polices)

    // Grec majuscule
    '\u0391': 'a', // Α
    '\u0392': 'b', // Β
    '\u0395': 'e', // Ε
    '\u0397': 'h', // Η
    '\u0399': 'i', // Ι
    '\u039A': 'k', // Κ
    '\u039C': 'm', // Μ
    '\u039D': 'n', // Ν
    '\u039F': 'o', // Ο
    '\u03A1': 'p', // Ρ
    '\u03A4': 't', // Τ
    '\u03A5': 'y', // Υ
    '\u03A7': 'x', // Χ
    '\u0396': 'z', // Ζ

    // Point pleine largeur
    '\uFF0E': '.',

    // Symboles courants
    '\u2024': '.', // point de conduite simple
    '\u2025': '..', // point de conduite double
    '\u00B7': '.', // point médian (parfois utilisé comme point final)
};

// Ajouter les lettres latines pleine largeur (majuscules U+FF21-FF3A, minuscules U+FF41-FF5A)
(function () {
    for (let i = 0; i < 26; i++) {
        // Lettres majuscules pleine largeur A-Z → minuscules a-z
        CARTE_HOMOGLYPHES[String.fromCharCode(0xFF21 + i)] = String.fromCharCode(0x61 + i);
        // Lettres minuscules pleine largeur a-z → minuscules a-z
        CARTE_HOMOGLYPHES[String.fromCharCode(0xFF41 + i)] = String.fromCharCode(0x61 + i);
    }
    // Chiffres pleine largeur 0-9
    for (let i = 0; i < 10; i++) {
        CARTE_HOMOGLYPHES[String.fromCharCode(0xFF10 + i)] = String.fromCharCode(0x30 + i);
    }
})();

/**
 * Remplace les caractères homoglyphes par leurs équivalents ASCII et met le résultat en minuscules.
 * @param {string} str - Chaîne d'entrée pouvant contenir des homoglyphes
 * @returns {string} Chaîne normalisée en minuscules ASCII
 */
function normaliserEnAscii(str) {
    if (!str) return '';
    let resultat = '';
    for (let i = 0; i < str.length; i++) {
        const caractere = str[i];
        resultat += CARTE_HOMOGLYPHES[caractere] || caractere;
    }
    return resultat.toLowerCase();
}
