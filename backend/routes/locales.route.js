const express = require("express");
const router = express.Router();
const localeController = require("../controllers/locale.controller");
const localeMiddleware = require("../middlewares/locales.middleware");
const { protect, authorize, optionalProtect } = require('../middlewares/auth');

// routes
router.get("/", localeController.getAllLocales);
router.get("/disponibilite", optionalProtect, localeController.getAllLocalesAvecDisponibilite);
router.get("/:id", localeController.getLocaleById);
router.post("/", protect, authorize('admin'), localeMiddleware.validateCreateLocale, localeController.createLocale);
router.put("/:id", protect, authorize('admin'), localeController.updateLocale);
router.delete("/:id", protect, authorize('admin'), localeController.deleteLocale);
router.post("/reserver", protect, localeController.reserverLocale);
router.put(
    "/:id/assign-boutique",
    localeMiddleware.validateBoutiqueIdPourAssignementLocale, // injecte req.boutique
    localeController.assignnerBoutique
  );

module.exports = router;
