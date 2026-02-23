// const mongoose = require("mongoose");
// const Locale = require("../models/Locale");

// Middleware pour vérifier LocaleId lors de la création d'une boutique
// exports.validateLocaleId = async (req, res, next) => {
//   const { localeId } = req.body;

//   // Vérifier que localeId existe
//   if (!localeId) {
//     return res.status(400).json({
//       success: false,
//       message: "localeId ne peut pas être null lors de la création d'une boutique"
//     });
//   }

//   // Vérifier que localeId est un ObjectId valide
//   if (!mongoose.Types.ObjectId.isValid(localeId)) {
//     return res.status(400).json({
//       success: false,
//       message: "localeId invalide, doit être un ObjectId MongoDB"
//     });
//   }

//   // Vérifier que la locale existe en base
//   const locale = await Locale.findById(localeId);
//   if (!locale) {
//     return res.status(404).json({
//       success: false,
//       message: "locale non trouvé"
//     });
//   }

//   // Optionnel : attacher la locale à req pour l'utiliser dans le controller
//   req.locale = locale;

//   next();
// };

