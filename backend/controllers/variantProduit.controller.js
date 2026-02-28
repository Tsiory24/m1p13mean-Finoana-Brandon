const VariantProduit = require('../models/VariantProduit');
const PrixVariantOption = require('../models/PrixVariantOption');
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

// ── Prix historique ───────────────────────────────────────────────────────────

/**
 * PATCH /api/variants/:variantId/options/:optionId/prix
 * Change le prix_supplement d'une option spécifique et enregistre l'historique.
 */
exports.changePrixVariantOption = async (req, res) => {
  try {
    const { variantId, optionId } = req.params;
    const { prix_supplement } = req.body;

    if (prix_supplement === undefined || prix_supplement === null) {
      return res.status(400).json({ success: false, message: 'prix_supplement est obligatoire' });
    }

    const variant = await VariantProduit.findOne({ _id: variantId, deletedAt: null });
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant non trouvé' });
    }

    const option = variant.options.id(optionId);
    if (!option) {
      return res.status(404).json({ success: false, message: 'Option non trouvée' });
    }

    const ancienSupplement = option.prix_supplement;
    if (ancienSupplement === prix_supplement) {
      return res.json({ success: true, data: variant, message: 'Prix inchangé' });
    }

    option.prix_supplement = prix_supplement;
    await variant.save();

    await PrixVariantOption.create({
      variantId: variant._id,
      optionId,
      optionValeur: option.valeur,
      prix_supplement
    });

    await createLog({
      action: 'change_prix_variant_option',
      type: 'update',
      utilisateur: req.user._id,
      details: {
        variantId: variant._id,
        optionId,
        optionValeur: option.valeur,
        ancienSupplement,
        nouveauSupplement: prix_supplement
      },
      statut: 'succès',
      message: `Prix de l'option "${option.valeur}" (variant "${variant.nom}") modifié`
    }, req);

    res.json({ success: true, data: variant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/variants/:variantId/prix
 * Retourne l'historique des prix de toutes les options d'un variant.
 */
exports.getHistoriqueVariantPrix = async (req, res) => {
  try {
    const { variantId } = req.params;

    const variant = await VariantProduit.findOne({ _id: variantId, deletedAt: null });
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant non trouvé' });
    }

    const historique = await PrixVariantOption.find({ variantId })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: historique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
