/**
 * Store en mémoire pour les codes de vérification email (OTP 6 chiffres).
 * Chaque entrée : { code, expiresAt, attempts }
 * TTL : 10 minutes | Max tentatives : 3
 */

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

// Map<email, { code, expiresAt, attempts }>
const store = new Map();

/**
 * Génère et stocke un code à 6 chiffres pour l'email donné.
 * Remplace tout code existant.
 * @param {string} email
 * @returns {string} le code généré
 */
function generateCode(email) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  store.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0
  });
  return code;
}

/**
 * Vérifie le code pour l'email donné.
 * @param {string} email
 * @param {string} code
 * @returns {{ valid: boolean, reason?: string }}
 */
function verifyCode(email, code) {
  const entry = store.get(email.toLowerCase());

  if (!entry) {
    return { valid: false, reason: 'Aucun code envoyé pour cet email.' };
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(email.toLowerCase());
    return { valid: false, reason: 'Le code a expiré. Veuillez en demander un nouveau.' };
  }

  entry.attempts += 1;

  if (entry.code !== code) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      store.delete(email.toLowerCase());
      return { valid: false, reason: 'Trop de tentatives. Veuillez demander un nouveau code.' };
    }
    return { valid: false, reason: `Code incorrect. ${MAX_ATTEMPTS - entry.attempts} tentative(s) restante(s).` };
  }

  // Code correct → consommer l'entrée
  store.delete(email.toLowerCase());
  return { valid: true };
}

/**
 * Supprime manuellement le code d'un email (ex: après inscription réussie).
 * @param {string} email
 */
function deleteCode(email) {
  store.delete(email.toLowerCase());
}

module.exports = { generateCode, verifyCode, deleteCode };
