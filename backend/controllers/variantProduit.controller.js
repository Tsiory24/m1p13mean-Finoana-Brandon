const VariantProduit = require('../models/VariantProduit');
const Produit = require('../models/Produit');
const { createLog } = require('../utils/logger');

exports.getVariantsByProduit = async (req, res) => {
  try {
    const { produitId } = req.query;
    const filter = { deletedAt: null };
    if (produitId) filter.produitId = produitId;

    const variants = await VariantProduit.find(filter).sort({ nom: 1 });
    res.json({ success: true, data: variants });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getVariantById = async (req, res) => {
  try {
    const variant = await VariantProduit.findOne({ _id: req.params.id, deletedAt: null });
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant non trouvé' });
    }
    res.json({ success: true, data: variant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.createVariant = async (req, res) => {
  try {
    const { produitId, nom, options } = req.body;

    if (!produitId) {
      return res.status(400).json({ success: false, message: 'Le produit est obligatoire' });
    }
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom du variant est obligatoire' });
    }
    if (!options || options.length === 0) {
      return res.status(400).json({ success: false, message: 'Au moins une option est requise' });
    }

    const produit = await Produit.findOne({ _id: produitId, deletedAt: null });
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const variant = await VariantProduit.create({
      produitId,
      nom: nom.trim(),
      options
    });

    await createLog({
      action: 'create_variant',
      type: 'create',
      utilisateur: req.user._id,
      details: { variantId: variant._id, nom: variant.nom, produitId },
      statut: 'succès',
      message: `Variant "${variant.nom}" créé pour le produit`
    }, req);

    res.status(201).json({ success: true, data: variant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.updateVariant = async (req, res) => {
  try {
    const { nom, options } = req.body;

    const variant = await VariantProduit.findOne({ _id: req.params.id, deletedAt: null });
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant non trouvé' });
    }

    if (nom && nom.trim()) variant.nom = nom.trim();
    if (options !== undefined) {
      if (!options || options.length === 0) {
        return res.status(400).json({ success: false, message: 'Au moins une option est requise' });
      }
      variant.options = options;
    }

    await variant.save();

    await createLog({
      action: 'update_variant',
      type: 'update',
      utilisateur: req.user._id,
      details: { variantId: variant._id, nom: variant.nom },
      statut: 'succès',
      message: `Variant "${variant.nom}" mis à jour`
    }, req);

    res.json({ success: true, data: variant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.deleteVariant = async (req, res) => {
  try {
    const variant = await VariantProduit.findOne({ _id: req.params.id, deletedAt: null });
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant non trouvé' });
    }

    variant.deletedAt = new Date();
    await variant.save();

    await createLog({
      action: 'delete_variant',
      type: 'delete',
      utilisateur: req.user._id,
      details: { variantId: variant._id, nom: variant.nom },
      statut: 'succès',
      message: `Variant "${variant.nom}" supprimé`
    }, req);

    res.json({ success: true, message: 'Variant supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
