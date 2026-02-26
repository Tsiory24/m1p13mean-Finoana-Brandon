const User = require('../models/User');
const { validationResult } = require('express-validator');
const { createLog } = require('../utils/logger');

// @desc    Obtenir tous les utilisateurs (avec pagination, filtres, tri)
// @route   GET /api/users
// @access  Admin
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.search) {
      filter.$or = [
        { nom: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { contact: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select('-motDePasse');

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Obtenir un utilisateur par ID
// @route   GET /api/users/:id
// @access  Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-motDePasse');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Erreur getUserById:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Modifier un utilisateur
// @route   PUT /api/users/:id
// @access  Admin
exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nom, email, contact, role, isActive, motDePasse } = req.body;

    const user = await User.findById(req.params.id).select('+motDePasse');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Vérifier l'unicité du nom si modifié
    if (nom && nom !== user.nom) {
      const existing = await User.findOne({ nom, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Ce nom est déjà utilisé par un autre utilisateur' });
      }
      user.nom = nom;
    }

    // Vérifier l'unicité de l'email si modifié
    if (email !== undefined) {
      if (email && email !== user.email) {
        const existing = await User.findOne({ email, _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé par un autre utilisateur' });
        }
      }
      user.email = email || undefined;
    }

    if (contact !== undefined) user.contact = contact;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (motDePasse) user.motDePasse = motDePasse;

    await user.save();

    await createLog({
      action: 'modification_utilisateur',
      type: 'admin',
      utilisateur: req.user._id,
      details: { targetUserId: user._id, targetUserNom: user.nom },
      statut: 'succès',
      message: `Utilisateur modifié: ${user.nom}`
    }, req);

    res.status(200).json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      data: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        contact: user.contact,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Erreur updateUser:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Empêcher l'admin de se supprimer lui-même
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    await User.findByIdAndDelete(req.params.id);

    await createLog({
      action: 'suppression_utilisateur',
      type: 'admin',
      utilisateur: req.user._id,
      details: { targetUserId: user._id, targetUserNom: user.nom },
      statut: 'succès',
      message: `Utilisateur supprimé: ${user.nom}`
    }, req);

    res.status(200).json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur deleteUser:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
