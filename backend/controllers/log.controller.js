const Log = require('../models/Log');

// @desc    Obtenir tous les logs (avec pagination)
// @route   GET /api/logs
// @access  Private (Admin seulement)
exports.getAllLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Filtres optionnels
    const filter = {};
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.statut) {
      filter.statut = req.query.statut;
    }
    if (req.query.utilisateur) {
      filter.utilisateur = req.query.utilisateur;
    }

    const logs = await Log.find(filter)
      .populate('utilisateur', 'nom email role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Log.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs',
      error: error.message
    });
  }
};

// @desc    Obtenir les logs d'un utilisateur spécifique
// @route   GET /api/logs/user/:userId
// @access  Private (Admin ou utilisateur lui-même)
exports.getUserLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Vérifier que l'utilisateur peut accéder à ces logs
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ces logs'
      });
    }

    const logs = await Log.find({ utilisateur: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Log.countDocuments({ utilisateur: userId });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs',
      error: error.message
    });
  }
};

