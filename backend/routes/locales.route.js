const express = require("express");
const router = express.Router();
const localeController = require("../controllers/locale.controller");
const localeMiddleware = require("../middlewares/locales.middleware");

// routes
router.get("/", localeController.getAllLocales);
router.get("/disponibilite", localeController.getAllLocalesAvecDisponibilite);
router.get("/:id", localeController.getLocaleById);
router.post("/",localeMiddleware.validateCreateLocale, localeController.createLocale);
router.put("/:id", localeController.updateLocale);
router.delete("/:id", localeController.deleteLocale);
router.post("/reserver", localeController.reserverLocale);
router.put(
    "/:id/assign-boutique",
    localeMiddleware.validateBoutiqueIdPourAssignementLocale, // injecte req.boutique
    localeController.assignnerBoutique
  );

module.exports = router;
