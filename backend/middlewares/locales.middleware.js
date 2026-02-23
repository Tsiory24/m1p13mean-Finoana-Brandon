const mongoose = require("mongoose");
const Boutique = require("../models/Boutique");

exports.validateCreateLocale = async (req, res, next) => {
    const { code, zone, surface } = req.body;
  
    if (!code || !zone) {
      return res.status(400).json({
        success: false,
        message: "Le code et la zone sont obligatoires"
      });
    }
  
    if (surface !== undefined && surface <= 0) {
      return res.status(400).json({
        success: false,
        message: "Surface invalide"
      });
    }
  
    next();
  };
  

exports.validateBoutiqueIdPourAssignementLocale = async (req, res, next) => {
  try {
    const { boutiqueId } = req.body;

    if (!boutiqueId) {
      return res.status(400).json({
        success: false,
        message:
          "La boutique ne peut pas être nulle lors de la création de l’assignation box-boutique"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(boutiqueId)) {
      return res.status(400).json({
        success: false,
        message: "Boutique invalide : doit être un ObjectId MongoDB valide"
      });
    }

    const boutique = await Boutique.findById(boutiqueId);

    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique non trouvée"
      });
    }

    req.boutique = boutique;
    next();
  } catch (error) {
    console.error("Erreur validateBoutiqueId:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la validation de la boutique"
    });
  }
};
