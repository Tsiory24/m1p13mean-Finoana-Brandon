const express = require("express");
const router = express.Router();
const dureeContratController = require("../controllers/dureeContrat.controller");

// routes
router.get("/", dureeContratController.getAllDureeContrats);
router.get("/:id", dureeContratController.getDureeContratById);
router.post("/", dureeContratController.createDureeContrat);
router.put("/:id", dureeContratController.updateDureeContrat);
router.delete("/:id", dureeContratController.deleteDureeContrat);

module.exports = router;
