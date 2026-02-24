const Unite = require('../models/Unite');
const { createLog } = require('../utils/logger');

exports.getAllUnites = async (req, res) => {
  try {
    const unites = await Unite.find({ deletedAt: null }).sort({ nom: 1 });
    res.json({ success: true, data: unites });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getUniteById = async (req, res) => {
  try {
    const unite = await Unite.findOne({ _id: req.params.id, deletedAt: null });
    if (!unite) {
      return res.status(404).json({ success: false, message: 'Unité non trouvée' });
    }
    res.json({ success: true, data: unite });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.createUnite = async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
    }

    const existing = await Unite.findOne({ nom: nom.trim(), deletedAt: null });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Une unité avec ce nom existe déjà' });
    }

    const unite = await Unite.create({ nom: nom.trim() });

    await createLog({
      action: 'create_unite',
      type: 'create',
      utilisateur: req.user._id,
      details: { uniteId: unite._id, nom: unite.nom },
      statut: 'succès',
      message: `Unité "${unite.nom}" créée`
    }, req);

    res.status(201).json({ success: true, data: unite });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.updateUnite = async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
    }

    const unite = await Unite.findOne({ _id: req.params.id, deletedAt: null });
    if (!unite) {
      return res.status(404).json({ success: false, message: 'Unité non trouvée' });
    }

    const existing = await Unite.findOne({ nom: nom.trim(), deletedAt: null, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Une unité avec ce nom existe déjà' });
    }

    const ancienNom = unite.nom;
    unite.nom = nom.trim();
    await unite.save();

    await createLog({
      action: 'update_unite',
      type: 'update',
      utilisateur: req.user._id,
      details: { uniteId: unite._id, ancienNom, nouveauNom: unite.nom },
      statut: 'succès',
      message: `Unité "${ancienNom}" renommée en "${unite.nom}"`
    }, req);

    res.json({ success: true, data: unite });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.deleteUnite = async (req, res) => {
  try {
    const unite = await Unite.findOne({ _id: req.params.id, deletedAt: null });
    if (!unite) {
      return res.status(404).json({ success: false, message: 'Unité non trouvée' });
    }

    unite.deletedAt = new Date();
    await unite.save();

    await createLog({
      action: 'delete_unite',
      type: 'delete',
      utilisateur: req.user._id,
      details: { uniteId: unite._id, nom: unite.nom },
      statut: 'succès',
      message: `Unité "${unite.nom}" supprimée`
    }, req);

    res.json({ success: true, message: 'Unité supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
