const express = require("express");
const router = express.Router();
const boutiqueController = require("../controllers/boutique.controller");
// const boutiqueMiddleware = require("../middlewares/boutiques.middleware");
const authMiddleware = require("../middlewares/auth");

// routes
router.get("/", boutiqueController.getAllBoutiques);
router.get("/:id", boutiqueController.getBoutiqueById);
router.post("/",authMiddleware.protect, boutiqueController.createBoutique);
router.put("/:id", authMiddleware.protect,boutiqueController.updateBoutique);
router.delete("/:id", authMiddleware.protect,boutiqueController.deleteBoutique);

module.exports = router;
