const Categorie = require('../models/Categorie');
const { createLog } = require('../utils/logger');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Categorie.find({ deletedAt: null }).sort({ nom: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getCategorieById = async (req, res) => {
  try {
    const categorie = await Categorie.findOne({ _id: req.params.id, deletedAt: null });
    if (!categorie) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }
    res.json({ success: true, data: categorie });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.createCategorie = async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
    }

    const existing = await Categorie.findOne({ nom: nom.trim(), deletedAt: null });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Une catégorie avec ce nom existe déjà' });
    }

    const categorie = await Categorie.create({ nom: nom.trim() });

    await createLog({
      action: 'create_categorie',
      type: 'create',
      utilisateur: req.user._id,
      details: { categorieId: categorie._id, nom: categorie.nom },
      statut: 'succès',
      message: `Catégorie "${categorie.nom}" créée`
    }, req);

    res.status(201).json({ success: true, data: categorie });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.updateCategorie = async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
    }

    const categorie = await Categorie.findOne({ _id: req.params.id, deletedAt: null });
    if (!categorie) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    const existing = await Categorie.findOne({ nom: nom.trim(), deletedAt: null, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Une catégorie avec ce nom existe déjà' });
    }

    const ancienNom = categorie.nom;
    categorie.nom = nom.trim();
    await categorie.save();

    await createLog({
      action: 'update_categorie',
      type: 'update',
      utilisateur: req.user._id,
      details: { categorieId: categorie._id, ancienNom, nouveauNom: categorie.nom },
      statut: 'succès',
      message: `Catégorie "${ancienNom}" renommée en "${categorie.nom}"`
    }, req);

    res.json({ success: true, data: categorie });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.deleteCategorie = async (req, res) => {
  try {
    const categorie = await Categorie.findOne({ _id: req.params.id, deletedAt: null });
    if (!categorie) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    categorie.deletedAt = new Date();
    await categorie.save();

    await createLog({
      action: 'delete_categorie',
      type: 'delete',
      utilisateur: req.user._id,
      details: { categorieId: categorie._id, nom: categorie.nom },
      statut: 'succès',
      message: `Catégorie "${categorie.nom}" supprimée`
    }, req);

    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
