const Log = require('../models/Log');

/**
 * Enregistre une action dans les logs
 * @param {Object} logData - Données du log
 * @param {string} logData.action - Type d'action (inscription, tentative_login, etc.)
 * @param {string} logData.utilisateur - ID de l'utilisateur (optionnel)
 * @param {Object} logData.details - Détails supplémentaires
 * @param {string} logData.statut - Statut (succès/échec)
 * @param {string} logData.message - Message descriptif
 * @param {Object} req - Objet request Express (pour IP et UserAgent)
 */
const createLog = async (logData, req = null) => {
  try {
    const logEntry = {
      action: logData.action,
      utilisateur: logData.utilisateur || null,
      details: {
        ...logData.details,
        ipAddress: req ? req.ip || req.connection.remoteAddress : null,
        userAgent: req ? req.get('user-agent') : null
      },
      statut: logData.statut,
      message: logData.message
    };

    await Log.create(logEntry);
    console.log(`[LOG] ${logData.action} - ${logData.statut}: ${logData.message}`);
  } catch (error) {
    console.error('Erreur lors de la création du log:', error.message);
    // On ne lance pas d'erreur pour ne pas bloquer le processus principal
  }
};

module.exports = { createLog };
