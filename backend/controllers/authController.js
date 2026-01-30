const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');
const { createLog } = require('../utils/logger');

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { nom, motDePasse, email, contact, role } = req.body;

    // Vérifier si l'utilisateur existe déjà (nom ou email)
    const conditions = [{ nom: nom }];
    if (email) {
      conditions.push({ email: email });
    }
    
    const existingUser = await User.findOne({ $or: conditions });

    if (existingUser) {
      // Enregistrer la tentative échouée
      await createLog({
        action: 'inscription',
        details: {
          nom: nom,
          email: email,
          contact: contact
        },
        statut: 'échec',
        message: 'Tentative d\'inscription avec nom ou email déjà existant'
      }, req);
      
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec ce nom ou email existe déjà'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      motDePasse,
      email,
      contact,
      role: role || 'acheteur'
    });

    // Générer le token
    const token = generateToken(user._id);

    // Enregistrer l'action dans les logs
    await createLog({
      action: 'inscription',
      utilisateur: user._id,
      details: {
        nom: user.nom,
        email: user.email,
        contact: user.contact,
        role: user.role
      },
      statut: 'succès',
      message: `Nouvel utilisateur inscrit: ${user.nom}`
    }, req);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: {
          id: user._id,
          nom: user.nom,
          email: user.email,
          contact: user.contact,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
};

// @desc    Connexion d'un utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { identifier, motDePasse } = req.body;

    // Vérifier si l'utilisateur existe (par nom ou email)
    const user = await User.findOne({
      $or: [
        { nom: identifier },
        { email: identifier }
      ]
    }).select('+motDePasse');

    if (!user) {
      // Enregistrer la tentative échouée
      await createLog({
        action: 'login_echoue',
        details: {
          identifier: identifier
        },
        statut: 'échec',
        message: 'Tentative de connexion avec identifiant inexistant'
      }, req);
      
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      // Enregistrer la tentative avec compte désactivé
      await createLog({
        action: 'login_echoue',
        utilisateur: user._id,
        details: {
          nom: user.nom,
          identifier: identifier
        },
        statut: 'échec',
        message: 'Tentative de connexion sur compte désactivé'
      }, req);
      
      return res.status(401).json({
        success: false,
        message: 'Votre compte est désactivé. Veuillez contacter l\'administrateur.'
      });
    }

    // Vérifier le mot de passe
    const isPasswordCorrect = await user.comparePassword(motDePasse);

    if (!isPasswordCorrect) {
      // Enregistrer la tentative avec mauvais mot de passe
      await createLog({
        action: 'login_echoue',
        utilisateur: user._id,
        details: {
          nom: user.nom,
          identifier: identifier
        },
        statut: 'échec',
        message: 'Tentative de connexion avec mot de passe incorrect'
      }, req);
      
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Générer le token
    const token = generateToken(user._id);

    // Enregistrer la connexion réussie
    await createLog({
      action: 'login_reussi',
      utilisateur: user._id,
      details: {
        nom: user.nom,
        identifier: identifier
      },
      statut: 'succès',
      message: `Connexion réussie pour ${user.nom}`
    }, req);

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user._id,
          nom: user.nom,
          email: user.email,
          contact: user.contact,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
};

// @desc    Déconnexion (côté client)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Dans une application JWT, la déconnexion est gérée côté client
    // en supprimant le token du localStorage/sessionStorage
    // Cette route peut être utilisée pour des logs ou blacklister des tokens
    
    // Enregistrer la déconnexion
    await createLog({
      action: 'deconnexion',
      utilisateur: req.user._id,
      details: {
        nom: req.user.nom
      },
      statut: 'succès',
      message: `Déconnexion de ${req.user.nom}`
    }, req);
    
    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion',
      error: error.message
    });
  }
};

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
};
