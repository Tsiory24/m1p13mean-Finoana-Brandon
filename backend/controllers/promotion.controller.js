const Promotion = require('../models/Promotion');
const Produit = require('../models/Produit');
const VariantProduit = require('../models/VariantProduit');
const PrixProduit = require('../models/PrixProduit');
const PrixVariantOption = require('../models/PrixVariantOption');
const Boutique = require('../models/Boutique');

// ── Helper : expirer les promotions dépassées d'une boutique ────────────────
async function _expirePromos(boutiqueId) {
  const now = new Date();
  const expirées = await Promotion.find({
    boutiqueId,
    actif: true,
    dateFin: { $lt: now }
  });

  for (const promo of expirées) {
    try {
      if (promo.type === 'produit') {
        await Produit.findByIdAndUpdate(promo.produitId, {
          prix_actuel: promo.prixOriginal
        });
        await PrixProduit.create({
          produitId: promo.produitId,
          prix_par_unite: promo.prixOriginal,
          motif: 'Fin de promotion'
        });
      } else if (promo.type === 'variant_option') {
        await VariantProduit.findOneAndUpdate(
          { _id: promo.variantId, 'options._id': promo.optionId },
          { $set: { 'options.$.prix_supplement': promo.prixOriginal } }
        );
        await PrixVariantOption.create({
          variantId: promo.variantId,
          optionId: promo.optionId,
          optionValeur: promo.optionValeur,
          prix_supplement: promo.prixOriginal,
          motif: 'Fin de promotion'
        });
      }
      promo.actif = false;
      promo.terminePar = 'expiration';
      await promo.save();
    } catch (e) {
      // Ne pas bloquer les autres expirations
    }
  }
}

// ── Promotions actives (public) ─────────────────────────────────────────────
exports.getPromotionsActives = async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      actif: true,
      dateDebut: { $lte: now },
      dateFin: { $gte: now }
    };
    if (req.query.produitId) filter.produitId = req.query.produitId;
    if (req.query.boutiqueId) filter.boutiqueId = req.query.boutiqueId;

    const promotions = await Promotion.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: promotions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Liste des promotions de la boutique (responsable) ──────────────────────
exports.getPromotionsByBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique introuvable' });
    }

    // Expirer les promos dépassées en lazy
    await _expirePromos(boutique._id);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const total = await Promotion.countDocuments({ boutiqueId: boutique._id });
    const promotions = await Promotion.find({ boutiqueId: boutique._id })
      .populate('produitId', 'nom prix_actuel images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, data: promotions, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Créer une promotion (responsable) ──────────────────────────────────────
exports.creerPromotion = async (req, res) => {
  try {
    const { type, produitId, variantId, optionId, optionValeur, pourcentage, dateDebut, dateFin } = req.body;

    // Validation de base
    if (!type || !['produit', 'variant_option'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type de promotion invalide' });
    }
    if (!produitId) {
      return res.status(400).json({ success: false, message: 'produitId requis' });
    }
    if (!pourcentage || pourcentage < 1 || pourcentage > 99) {
      return res.status(400).json({ success: false, message: 'Le pourcentage doit être entre 1 et 99' });
    }
    if (!dateDebut || !dateFin) {
      return res.status(400).json({ success: false, message: 'dateDebut et dateFin sont requis' });
    }
    const dDebut = new Date(dateDebut);
    const dFin = new Date(dateFin);
    const now = new Date();
    if (dFin <= dDebut) {
      return res.status(400).json({ success: false, message: 'La date de fin doit être postérieure à la date de début' });
    }
    if (dFin <= now) {
      return res.status(400).json({ success: false, message: 'La date de fin doit être dans le futur' });
    }

    // Trouver la boutique du responsable
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique introuvable' });
    }

    // Vérifier que le produit appartient à la boutique
    const produit = await Produit.findOne({ _id: produitId, boutiqueId: boutique._id, deletedAt: null });
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit introuvable ou non autorisé' });
    }

    let prixOriginal;
    let promoExistante;

    if (type === 'produit') {
      // Vérifier qu'aucune promo active n'existe sur ce produit
      promoExistante = await Promotion.findOne({
        produitId,
        type: 'produit',
        actif: true,
        dateFin: { $gt: now }
      });
      if (promoExistante) {
        return res.status(400).json({ success: false, message: 'Une promotion est déjà active sur ce produit' });
      }
      prixOriginal = produit.prix_actuel;

    } else {
      // type = 'variant_option'
      if (!variantId || !optionId) {
        return res.status(400).json({ success: false, message: 'variantId et optionId requis pour une promotion de variant' });
      }
      const variant = await VariantProduit.findOne({ _id: variantId, produitId, deletedAt: null });
      if (!variant) {
        return res.status(404).json({ success: false, message: 'Variant introuvable' });
      }
      const option = variant.options.id(optionId);
      if (!option) {
        return res.status(404).json({ success: false, message: 'Option introuvable' });
      }

      // Vérifier qu'aucune promo active n'existe sur cette option
      promoExistante = await Promotion.findOne({
        variantId,
        optionId,
        type: 'variant_option',
        actif: true,
        dateFin: { $gt: now }
      });
      if (promoExistante) {
        return res.status(400).json({ success: false, message: 'Une promotion est déjà active sur cette option' });
      }
      prixOriginal = option.prix_supplement;
    }

    const prixReduit = Math.round(prixOriginal * (1 - pourcentage / 100));
    const motif = `Promotion -${pourcentage}%`;

    // Appliquer le changement de prix
    if (type === 'produit') {
      await Produit.findByIdAndUpdate(produitId, { prix_actuel: prixReduit });
      await PrixProduit.create({ produitId, prix_par_unite: prixReduit, motif });
    } else {
      await VariantProduit.findOneAndUpdate(
        { _id: variantId, 'options._id': optionId },
        { $set: { 'options.$.prix_supplement': prixReduit } }
      );
      await PrixVariantOption.create({
        variantId,
        optionId,
        optionValeur: optionValeur || '',
        prix_supplement: prixReduit,
        motif
      });
    }

    // Créer la promotion
    const promotion = await Promotion.create({
      type,
      produitId,
      variantId: variantId || null,
      optionId: optionId || null,
      optionValeur: optionValeur || null,
      boutiqueId: boutique._id,
      pourcentage,
      prixOriginal,
      prixReduit,
      dateDebut: dDebut,
      dateFin: dFin,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ── Terminer une promotion (responsable) ────────────────────────────────────
exports.terminerPromotion = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique introuvable' });
    }

    const promo = await Promotion.findOne({
      _id: req.params.id,
      boutiqueId: boutique._id,
      actif: true
    });
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promotion introuvable ou déjà terminée' });
    }

    // Restaurer le prix original
    if (promo.type === 'produit') {
      await Produit.findByIdAndUpdate(promo.produitId, { prix_actuel: promo.prixOriginal });
      await PrixProduit.create({
        produitId: promo.produitId,
        prix_par_unite: promo.prixOriginal,
        motif: 'Fin de promotion'
      });
    } else {
      await VariantProduit.findOneAndUpdate(
        { _id: promo.variantId, 'options._id': promo.optionId },
        { $set: { 'options.$.prix_supplement': promo.prixOriginal } }
      );
      await PrixVariantOption.create({
        variantId: promo.variantId,
        optionId: promo.optionId,
        optionValeur: promo.optionValeur || '',
        prix_supplement: promo.prixOriginal,
        motif: 'Fin de promotion'
      });
    }

    promo.actif = false;
    promo.terminePar = 'responsable';
    await promo.save();

    res.status(200).json({ success: true, message: 'Promotion terminée, prix restauré', data: promo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};
