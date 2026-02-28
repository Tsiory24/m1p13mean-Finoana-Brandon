const StockMouvement = require('../models/StockMouvement');
const Produit = require('../models/Produit');
const Boutique = require('../models/Boutique');
const VariantProduit = require('../models/VariantProduit');
const { createLog } = require('../utils/logger');

// @desc    Ajouter un mouvement de stock (entrée ou sortie manuel)
// @route   POST /api/stocks/mouvement
// @access  Private (admin, responsable_boutique)
exports.addMouvement = async (req, res) => {
  try {
    const { produitId, boutiqueId, type, quantite, motif, variantId, optionId, optionValeur } = req.body;

    if (!produitId || !boutiqueId || !type || !quantite) {
      return res.status(400).json({
        success: false,
        message: 'produitId, boutiqueId, type et quantite sont obligatoires'
      });
    }

    const [produit, boutique] = await Promise.all([
      Produit.findOne({ _id: produitId, deletedAt: null }),
      Boutique.findOne({ _id: boutiqueId, deletedAt: null })
    ]);

    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    // Un responsable_boutique ne peut gérer que sa propre boutique
    if (req.user.role === 'responsable_boutique' &&
        boutique.proprietaire?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez gérer que le stock de votre boutique'
      });
    }

    // Si un variant + option sont spécifiés, mettre à jour le stock de l'option
    if (variantId && optionId) {
      const variant = await VariantProduit.findOne({ _id: variantId, deletedAt: null });
      if (!variant) {
        return res.status(404).json({ success: false, message: 'Variant non trouvé' });
      }
      const option = variant.options.id(optionId);
      if (!option) {
        return res.status(404).json({ success: false, message: 'Option de variant non trouvée' });
      }
      if (type === 'entree') {
        option.stock += Number(quantite);
      } else {
        option.stock = Math.max(0, option.stock - Number(quantite));
      }
      await variant.save();
    }

    const mouvement = await StockMouvement.create({
      produitId,
      boutiqueId,
      type,
      quantite,
      motif: motif || null,
      variantId: variantId || null,
      optionId: optionId || null,
      optionValeur: optionValeur || null
    });

    await createLog({
      action: 'add_stock_mouvement',
      type: 'create',
      utilisateur: req.user._id,
      details: { mouvementId: mouvement._id, produitId, boutiqueId, type, quantite, motif, variantId, optionId },
      statut: 'succès',
      message: `Mouvement de stock (${type}) : ${quantite} unité(s) du produit "${produit.nom}"${optionValeur ? ` [${optionValeur}]` : ''}`
    }, req);

    res.status(201).json({ success: true, data: mouvement });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Stock actuel d'une boutique (agrégation par produit)
// @route   GET /api/stocks/boutique/:boutiqueId
// @access  Private
exports.getStockByBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    const stock = await StockMouvement.aggregate([
      { $match: { boutiqueId: boutique._id } },
      {
        $group: {
          _id: '$produitId',
          quantite_entree: {
            $sum: { $cond: [{ $eq: ['$type', 'entree'] }, '$quantite', 0] }
          },
          quantite_sortie: {
            $sum: { $cond: [{ $eq: ['$type', 'sortie'] }, '$quantite', 0] }
          }
        }
      },
      {
        $addFields: {
          quantite_disponible: { $subtract: ['$quantite_entree', '$quantite_sortie'] }
        }
      },
      {
        $lookup: {
          from: 'produits',
          localField: '_id',
          foreignField: '_id',
          as: 'produit'
        }
      },
      { $unwind: '$produit' },
      {
        $project: {
          _id: 0,
          produitId: '$_id',
          nom: '$produit.nom',
          prix_actuel: '$produit.prix_actuel',
          quantite_entree: 1,
          quantite_sortie: 1,
          quantite_disponible: 1
        }
      },
      { $sort: { nom: 1 } }
    ]);

    res.json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Liste des mouvements d'une boutique (paginée, filtrable)
// @route   GET /api/stocks/mouvements/:boutiqueId
// @access  Private
exports.getMouvementsByBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const boutique = await Boutique.findOne({ _id: boutiqueId, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    const filter = { boutiqueId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.produitId) filter.produitId = req.query.produitId;

    const [mouvements, total] = await Promise.all([
      StockMouvement.find(filter)
        .populate('produitId', 'nom prix_actuel')
        .populate('commandeId', 'statut_commande date_commande')
        .populate('variantId', 'nom')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip),
      StockMouvement.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        mouvements,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
