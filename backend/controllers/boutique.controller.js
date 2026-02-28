const Boutique = require("../models/Boutique");
const Notification = require("../models/Notification");
const Categorie = require("../models/Categorie");


// GET ma boutique (responsable connecté)
exports.getMaBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ proprietaire: req.user._id, deletedAt: null })
      .populate('localeId')
      .populate('proprietaire')
      .populate('categorieId', 'nom');
    res.status(200).json({
      success: true,
      data: { boutique: boutique || null }
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
    const boutiques = await Boutique.find({ deletedAt: null })
    .populate("localeId")
    .populate("proprietaire")
    .populate("categorieId", "nom");
    // res.json(boutiques);
    res.status(200).json({
        success: true,
        data: {
          boutiques
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

