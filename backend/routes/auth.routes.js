const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, logout, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');

// Validations pour l'inscription
const registerValidation = [
  body('nom')
    .trim()
    .notEmpty()
    .withMessage('Le nom est obligatoire')
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Le nom ne peut contenir que des lettres, chiffres et underscores'),
  body('motDePasse')
    .notEmpty()
    .withMessage('Le mot de passe est obligatoire')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Veuillez fournir une adresse email valide'),
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('Le contact est obligatoire'),
  body('role')
    .optional()
    .isIn(['admin', 'responsable_boutique', 'acheteur'])
    .withMessage('Le rôle doit être admin, responsable_boutique ou acheteur')
];

// Validations pour la connexion
const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Le nom d\'utilisateur ou email est obligatoire'),
  body('motDePasse')
    .notEmpty()
    .withMessage('Le mot de passe est obligatoire')
];

// Routes publiques
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Routes protégées
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
