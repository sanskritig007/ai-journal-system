const express = require("express");
const router = express.Router();

const controller = require("../controllers/journalController");
const { analysisLimiter, saveLimiter } = require("../middleware/rateLimit");

router.post("/analyze", analysisLimiter, controller.analyzeText);
router.get("/insights/:userId", controller.getInsights);

router.post("/", saveLimiter, controller.createJournal);
router.post("/stream", saveLimiter, controller.createJournalStream);
router.get("/:userId", controller.getEntries);

module.exports = router;
