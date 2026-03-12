const express = require("express");
const router = express.Router();

const controller = require("../controllers/journalController");

router.post("/", controller.createJournal);
router.get("/:userId", controller.getEntries);
router.post("/analyze", controller.analyzeText);
router.get("/insights/:userId", controller.getInsights);

module.exports = router;