const SousCategorie = require('../models/SousCategorie');
const Categorie = require('../models/Categorie');
const { createLog } = require('../utils/logger');

exports.getAllSousCategories = async (req, res) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.categorieId) {
      filter.categorieId = req.query.categorieId;
    }
    const sousCategories = await SousCategorie.find(filter)
      .populate('categorieId', 'nom')
      .sort({ nom: 1 });
    res.json({ success: true, data: sousCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getSousCategorieById = async (req, res) => {
  try {
    const sousCategorie = await SousCategorie.findOne({ _id: req.params.id, deletedAt: null })
      .populate('categorieId', 'nom');
    if (!sousCategorie) {
      return res.status(404).json({ success: false, message: 'Sous-catégorie non trouvée' });
    }
    res.json({ success: true, data: sousCategorie });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.createSousCategorie = async (req, res) => {
  try {
    const { nom, categorieId } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
    }
    if (!categorieId) {
      return res.status(400).json({ success: false, message: 'La catégorie est obligatoire' });
    }

    const categorie = await Categorie.findOne({ _id: categorieId, deletedAt: null });
    if (!categorie) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    const existing = await SousCategorie.findOne({ nom: nom.trim(), categorieId, deletedAt: null });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Une sous-catégorie avec ce nom existe déjà dans cette catégorie' });
    }

    const sousCategorie = await SousCategorie.create({ nom: nom.trim(), categorieId });

    await createLog({
      action: 'create_sous_categorie',
      type: 'create',
      utilisateur: req.user._id,
      details: { sousCategorieId: sousCategorie._id, nom: sousCategorie.nom, categorieId },
      statut: 'succès',
      message: `Sous-catégorie "${sousCategorie.nom}" créée`
    }, req);

    res.status(201).json({ success: true, data: sousCategorie });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.updateSousCategorie = async (req, res) => {
  try {
    const { nom, categorieId } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
    }

    const sousCategorie = await SousCategorie.findOne({ _id: req.params.id, deletedAt: null });
    if (!sousCategorie) {
      return res.status(404).json({ success: false, message: 'Sous-catégorie non trouvée' });
    }

    const newCategorieId = categorieId || sousCategorie.categorieId;

    if (categorieId) {
      const categorie = await Categorie.findOne({ _id: categorieId, deletedAt: null });
      if (!categorie) {
        return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
      }
    }

    const existing = await SousCategorie.findOne({
      nom: nom.trim(),
      categorieId: newCategorieId,
      deletedAt: null,
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Une sous-catégorie avec ce nom existe déjà dans cette catégorie' });
    }

    const ancienNom = sousCategorie.nom;
    sousCategorie.nom = nom.trim();
    sousCategorie.categorieId = newCategorieId;
    await sousCategorie.save();

    await createLog({
      action: 'update_sous_categorie',
      type: 'update',
      utilisateur: req.user._id,
      details: { sousCategorieId: sousCategorie._id, ancienNom, nouveauNom: sousCategorie.nom },
      statut: 'succès',
      message: `Sous-catégorie "${ancienNom}" mise à jour`
    }, req);

    res.json({ success: true, data: sousCategorie });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.deleteSousCategorie = async (req, res) => {
  try {
    const sousCategorie = await SousCategorie.findOne({ _id: req.params.id, deletedAt: null });
    if (!sousCategorie) {
      return res.status(404).json({ success: false, message: 'Sous-catégorie non trouvée' });
    }

    sousCategorie.deletedAt = new Date();
    await sousCategorie.save();

    await createLog({
      action: 'delete_sous_categorie',
      type: 'delete',
      utilisateur: req.user._id,
      details: { sousCategorieId: sousCategorie._id, nom: sousCategorie.nom },
      statut: 'succès',
      message: `Sous-catégorie "${sousCategorie.nom}" supprimée`
    }, req);

    res.json({ success: true, message: 'Sous-catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
