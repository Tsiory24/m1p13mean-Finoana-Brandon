const Boutique = require("../models/Boutique");
const Notification = require("../models/Notification");
const Reservation = require("../models/Reservation");
const Categorie = require("../models/Categorie");


// GET ma boutique (responsable connecté)
exports.getMaBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null })
      .populate('localeId')
      .populate('categorieId', 'nom')
      .populate('proprietaire');

    // Récupère les réservations validées pour cette boutique (locales louées actives)
    let reservationsActives = [];
    if (boutique) {
      reservationsActives = await Reservation.find({
        boutiqueId: boutique._id,
        statut: 'validée'
      })
        .populate('localeId')
        .sort({ dateDebut: -1 });
    }

    res.status(200).json({
      success: true,
      data: { boutique: boutique || null, reservationsActives }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de votre boutique',
      error: err.message
    });
  }
};

// GET all boutiques
exports.getAllBoutiques = async (req, res) => {
  try {
    // activeLocale=true → front-office : n'afficher que les boutiques avec une
    // réservation validée dont dateFin >= aujourd'hui
    const activeLocaleOnly = req.query.activeLocale === 'true';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let boutiqueIdsWithActiveResa = null;
    if (activeLocaleOnly) {
      const activeResas = await Reservation.find({
        statut: 'validée',
        dateFin: { $gte: today }
      }).distinct('boutiqueId');
      boutiqueIdsWithActiveResa = activeResas.map(id => id.toString());
    }

    const baseFilter = { deletedAt: null };
    if (activeLocaleOnly) baseFilter._id = { $in: boutiqueIdsWithActiveResa };

    const boutiques = await Boutique.find(baseFilter)
      .populate('localeId')
      .populate("categorieId", "nom")
      .populate('proprietaire');

    // Fetch all validated reservations for all boutiques in one query
    const boutiqueIds = boutiques.map(b => b._id);
    const reservationsFilter = { boutiqueId: { $in: boutiqueIds }, statut: 'validée' };
    if (activeLocaleOnly) reservationsFilter.dateFin = { $gte: today };

    const reservations = await Reservation.find(reservationsFilter)
      .populate('localeId', 'code zone surface etat');

    // Group by boutiqueId
    const resaMap = {};
    for (const r of reservations) {
      const key = r.boutiqueId.toString();
      if (!resaMap[key]) resaMap[key] = [];
      resaMap[key].push(r);
    }

    const boutiquesWithLocales = boutiques.map(b => {
      const obj = b.toObject();
      obj.localesLouees = resaMap[b._id.toString()] || [];
      return obj;
    });

    res.status(200).json({
      success: true,
      data: { boutiques: boutiquesWithLocales }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des boutiques',
      error: err.message
    });
  }
};

// GET boutique by ID
exports.getBoutiqueById = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({_id : req.params.id , deletedAt: null })
    .populate("localeId")
    .populate("proprietaire")
    .populate("categorieId", "nom");
    if (!boutique) return res.status(404).json({success:false, message: "Boutique not found" });
    res.status(200).json({
        success: true,
        data: {
          boutique
        }
      });
  } catch (err) {
    res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des boutiques',
        error: err.message
    });
  }
};

exports.getBoutiqueBySlug = async (req, res) => {
  try {
    const param = req.params.slug;
    const mongoose = require('mongoose');
    const isId = mongoose.Types.ObjectId.isValid(param);

    let boutique = await Boutique.findOne({ slug: param, deletedAt: null })
      .populate("localeId")
      .populate("proprietaire")
      .populate("categorieId", "nom");

    // Fallback to _id lookup for documents that don't have a slug yet
    if (!boutique && isId) {
      boutique = await Boutique.findOne({ _id: param, deletedAt: null })
        .populate("localeId")
        .populate("proprietaire")
        .populate("categorieId", "nom");
    }

    if (!boutique) return res.status(404).json({ success: false, message: "Boutique introuvable" });
    res.status(200).json({ success: true, data: { boutique } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// CREATE boutique
exports.createBoutique = async (req, res) => {
  try {
    const { nom, type, active, image, categorieId } = req.body;

    if (categorieId) {
      const categorie = await Categorie.findOne({ _id: categorieId, deletedAt: null });
      if (!categorie) {
        return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
      }
    }

    const boutique = new Boutique({
      nom,
      proprietaire: req.user._id,
      type: type ?? "kiosque",
      active: active ?? false,
      image: image ?? null,
      categorieId: categorieId ?? null
    });

    const newBoutique = await boutique.save();

    // Notification admin
    await Notification.create({
      type: 'boutique_creation',
      message: `${req.user.nom || req.user.email} a demandé la création de la boutique "${nom}".`,
      targetRole: 'admin',
      refId: newBoutique._id,
      refModel: 'Boutique',
      data: { boutiqueId: newBoutique._id, nom, userId: req.user._id }
    });

    res.status(201).json({
      success: true,
      data: newBoutique
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la boutique",
      error: err.message
    });
  }
};

// UPDATE boutique
exports.updateBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({
      _id: req.params.id,
      deletedAt: null
    });

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée"
      });
    }

    // 🔐 Vérifier que l'utilisateur est le propriétaire
    if (boutique.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Action non autorisée, utilisateur requis"
      });
    }

    const { nom, type, active, localeId, image, categorieId } = req.body;

    if (nom !== undefined) boutique.nom = nom;
    if (type !== undefined) boutique.type = type;
    if (active !== undefined) boutique.active = active;
    if (localeId !== undefined) boutique.localeId = localeId;
    if (image !== undefined) boutique.image = image;
    if (categorieId !== undefined) {
      if (categorieId) {
        const categorie = await Categorie.findOne({ _id: categorieId, deletedAt: null });
        if (!categorie) {
          return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
        }
      }
      boutique.categorieId = categorieId || null;
    }

    const updatedBoutique = await boutique.save();

    res.status(200).json({
      success: true,
      data: updatedBoutique
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la modification de la boutique",
      error: err.message
    });
  }
};



// VALIDATE boutique (admin only)
exports.validateBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ _id: req.params.id, deletedAt: null })
      .populate('localeId')
      .populate('proprietaire');

    if (!boutique) {
      return res.status(404).json({ success: false, message: "Boutique non trouvée" });
    }

    boutique.active = true;
    await boutique.save();

    // Notifie le propriétaire
    try {
      await Notification.create({
        type: 'boutique_validee',
        message: `Votre boutique "${boutique.nom}" a été validée 🎉 ! Vous pouvez maintenant réserver une locale.`,
        targetUser: boutique.proprietaire._id,
        refId: boutique._id,
        refModel: 'Boutique',
        data: { boutiqueId: boutique._id }
      });
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: "Boutique validée avec succès",
      data: { boutique }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la validation de la boutique",
      error: err.message
    });
  }
};

// CANCEL boutique (admin: any; responsable: only if not yet active)
exports.annulerBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ _id: req.params.id, deletedAt: null });

    if (!boutique) {
      return res.status(404).json({ success: false, message: "Boutique non trouvée" });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = boutique.proprietaire.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "Action non autorisée" });
    }

    // Responsable can only cancel if boutique is NOT yet active
    if (!isAdmin && boutique.active) {
      return res.status(403).json({
        success: false,
        message: "Impossible d'annuler une boutique déjà validée"
      });
    }

    boutique.deletedAt = new Date();
    boutique.active = false;
    await boutique.save();

    // Notifie le propriétaire si c'est l'admin qui annule
    try {
      if (isAdmin && isOwner === false) {
        const proprietaire = boutique.proprietaire;
        await Notification.create({
          type: 'boutique_annulee',
          message: `Votre demande de création de la boutique "${boutique.nom}" a été refusée par l'administration.`,
          targetUser: proprietaire,
          refId: null,
          refModel: null,
          data: { boutiqueId: boutique._id, nom: boutique.nom }
        });
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: "Boutique annulée avec succès"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'annulation de la boutique",
      error: err.message
    });
  }
};

// GET boutiques à l'affiche (public)
exports.getAfficheBoutiques = async (req, res) => {
  try {
    const boutiques = await Boutique.find({ enAffiche: true, deletedAt: null, active: true })
      .populate('localeId')
      .populate('categorieId', 'nom')
      .populate('proprietaire', 'nom email')
      .sort({ ordreAffiche: 1 });
    res.status(200).json({ success: true, data: boutiques });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des boutiques à l'affiche", error: err.message });
  }
};

// PUT boutiques à l'affiche (admin) — reçoit [{ boutiqueId, ordre }]
exports.setAfficheBoutiques = async (req, res) => {
  try {
    const liste = req.body;
    if (!Array.isArray(liste)) {
      return res.status(400).json({ success: false, message: 'Format invalide, tableau attendu' });
    }
    await Boutique.updateMany({ enAffiche: true }, { $set: { enAffiche: false, ordreAffiche: null } });
    for (const item of liste) {
      await Boutique.findByIdAndUpdate(item.boutiqueId, {
        $set: { enAffiche: true, ordreAffiche: item.ordre }
      });
    }
    const updated = await Boutique.find({ enAffiche: true, deletedAt: null })
      .populate('categorieId', 'nom')
      .sort({ ordreAffiche: 1 });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur lors de la mise à jour des boutiques à l'affiche", error: err.message });
  }
};

// DELETE boutique
exports.deleteBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({
      _id: req.params.id,
      deletedAt: null
    });

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée"
      });
    }

    // 🔐 Vérification du propriétaire
    if (boutique.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Action non autorisée, utilisateur requis"
      });
    }

    boutique.deletedAt = new Date();
    boutique.active = false;

    await boutique.save();

    res.status(200).json({
      success: true,
      message: "Boutique désactivée avec succès",
      data : {
        boutique
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la boutique",
      error: err.message
    });
  }
};

