const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middlewares/auth');
const { getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/users.controller');

const updateValidation = [
  body('nom')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Le nom ne peut contenir que des lettres, chiffres et underscores'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Veuillez fournir une adresse email valide'),
  body('contact')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le contact ne peut pas être vide'),
  body('role')
    .optional()
    .isIn(['admin', 'responsable_boutique', 'acheteur'])
    .withMessage('Rôle invalide'),
  body('motDePasse')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

router.use(protect, authorize('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateValidation, updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
