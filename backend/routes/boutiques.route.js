const express = require("express");
const router = express.Router();
const boutiqueController = require("../controllers/boutique.controller");
// const boutiqueMiddleware = require("../middlewares/boutiques.middleware");
const authMiddleware = require("../middlewares/auth");

// routes
router.get("/", boutiqueController.getAllBoutiques);
router.get("/ma-boutique", authMiddleware.protect, boutiqueController.getMaBoutique);
router.get("/affiche", boutiqueController.getAfficheBoutiques);
router.put("/affiche", authMiddleware.protect, authMiddleware.authorize('admin'), boutiqueController.setAfficheBoutiques);
router.get("/:id", boutiqueController.getBoutiqueById);
router.post("/", authMiddleware.protect, boutiqueController.createBoutique);
router.put("/:id/valider", authMiddleware.protect, authMiddleware.authorize('admin'), boutiqueController.validateBoutique);
router.put("/:id", authMiddleware.protect, boutiqueController.updateBoutique);
router.delete("/:id/annuler", authMiddleware.protect, boutiqueController.annulerBoutique);
router.delete("/:id", authMiddleware.protect, boutiqueController.deleteBoutique);

module.exports = router;
