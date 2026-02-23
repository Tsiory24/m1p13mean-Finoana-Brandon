const Boutique = require("../models/Boutique");


// GET all boutiques
exports.getAllBoutiques = async (req, res) => {
  try {
    const boutiques = await Boutique.find({ deletedAt: null })
    .populate("localeId")
    .populate("proprietaire");
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
    .populate("proprietaire");
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
    const { nom, type, active } = req.body;

    const boutique = new Boutique({
      nom,
      proprietaire: req.user._id, // 👈 utilisateur connecté
      type: type ?? "kiosque",
      active: active ?? false
    });

    const newBoutique = await boutique.save();

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

    const { nom, type, active, localeId } = req.body;

    if (nom !== undefined) boutique.nom = nom;
    if (type !== undefined) boutique.type = type;
    if (active !== undefined) boutique.active = active;
    if (localeId !== undefined) boutique.localeId = localeId;

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

