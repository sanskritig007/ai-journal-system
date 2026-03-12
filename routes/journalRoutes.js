const express = require("express");
const router = express.Router();

const controller = require("../controllers/journalController");

// IMPORTANT: /analyze must come BEFORE /:userId
// Otherwise Express treats "analyze" as a userId param
router.post("/analyze", controller.analyzeText);
router.get("/insights/:userId", controller.getInsights);

router.post("/", controller.createJournal);
router.get("/:userId", controller.getEntries);

module.exports = router;