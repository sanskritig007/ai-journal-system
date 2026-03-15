const db = require("../models/db");
const { analyzeEmotion, streamAnalysis } = require("../services/llmService");

// POST /api/journal
// Saves entry + auto-runs LLM analysis and stores the result
exports.createJournal = async (req, res) => {
  const { userId, ambience, text } = req.body;

  // 1. Basic presence check
  if (!userId || !ambience || !text) {
    return res.status(400).json({ error: "userId, ambience, and text are required." });
  }

  // 2. Validate User ID (3-30 chars, alphanumeric + underscores)
  const userIdRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!userIdRegex.test(userId)) {
    return res.status(400).json({ 
      error: "Invalid User ID. Must be 3-30 characters and only contain letters, numbers, and underscores." 
    });
  }

  // 3. Validate Journal Entry (min 10 chars, must contain a space)
  if (text.length < 10 || !text.includes(' ')) {
    return res.status(400).json({ 
      error: "Journal entry too short or invalid. Please write at least 10 characters with multiple words." 
    });
  }

  try {
    // Run LLM analysis first so results are saved together with the entry
    const analysis = await analyzeEmotion(text);

    const keywordsStr = Array.isArray(analysis.keywords)
      ? analysis.keywords.join(",")
      : analysis.keywords;

    db.run(
      `INSERT INTO journals (userId, ambience, text, emotion, keywords, summary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, ambience, text, analysis.emotion, keywordsStr, analysis.summary],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Database error", detail: err.message });
        }

        res.status(201).json({
          message: "Journal saved successfully",
          id: this.lastID,
          emotion: analysis.emotion,
          keywords: analysis.keywords,
          summary: analysis.summary,
        });
      }
    );
  } catch (error) {
    console.error("LLM analysis failed:", error.message);
    // Fallback: save entry without analysis
    db.run(
      `INSERT INTO journals (userId, ambience, text) VALUES (?, ?, ?)`,
      [userId, ambience, text],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Database error", detail: err.message });
        }
        res.status(201).json({
          message: "Journal saved (analysis unavailable)",
          id: this.lastID,
        });
      }
    );
  }
};

// POST /api/journal/stream
// Streams SSE analysis to client and saves journal entry
exports.createJournalStream = async (req, res) => {
  const { userId, ambience, text } = req.body;

  if (!userId || !ambience || !text) {
    return res.status(400).json({ error: "userId, ambience, and text are required." });
  }

  const userIdRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!userIdRegex.test(userId)) {
    return res.status(400).json({ error: "Invalid User ID." });
  }

  if (text.length < 10 || !text.includes(' ')) {
    return res.status(400).json({ error: "Journal entry too short or invalid." });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onComplete = (analysis) => {
      const keywordsStr = Array.isArray(analysis.keywords) ? analysis.keywords.join(",") : analysis.keywords;
      db.run(
        `INSERT INTO journals (userId, ambience, text, emotion, keywords, summary) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, ambience, text, analysis.emotion, keywordsStr, analysis.summary],
        function(err) {
            if (err) console.error("Failed to save streamed journal to DB", err);
        }
      );
  };

  await streamAnalysis(text, res, onComplete);
};

// GET /api/journal/:userId
// Returns all journal entries for a user, newest first
exports.getEntries = (req, res) => {
  const { userId } = req.params;

  db.all(
    `SELECT id, userId, ambience, text, emotion, keywords, summary, createdAt
     FROM journals WHERE userId = ? ORDER BY createdAt DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database error", detail: err.message });
      }

      // Parse keywords back to array
      const entries = rows.map((row) => ({
        ...row,
        keywords: row.keywords ? row.keywords.split(",") : [],
      }));

      res.json(entries);
    }
  );
};

// POST /api/journal/analyze
// Stand-alone endpoint to analyze any text
exports.analyzeText = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "text is required." });
  }

  // Validate text (min 10 chars, must contain a space)
  if (text.length < 10 || !text.includes(' ')) {
    return res.status(400).json({ 
      error: "Text too short or invalid. Please provide at least 10 characters with multiple words." 
    });
  }

  try {
    const result = await analyzeEmotion(text);
    res.json(result);
  } catch (error) {
    console.error("LLM analysis failed:", error.message);
    res.status(500).json({ error: "LLM analysis failed", detail: error.message });
  }
};

// GET /api/journal/insights/:userId
// Returns aggregated mental-health insights for a user
exports.getInsights = (req, res) => {
  const { userId } = req.params;

  db.all(
    `SELECT emotion, ambience, keywords FROM journals WHERE userId = ?`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database error", detail: err.message });
      }

      if (rows.length === 0) {
        return res.json({
          totalEntries: 0,
          topEmotion: null,
          mostUsedAmbience: null,
          recentKeywords: [],
        });
      }

      // Count emotions
      const emotionCount = {};
      const ambienceCount = {};
      const keywordSet = [];

      rows.forEach((row) => {
        if (row.emotion) {
          emotionCount[row.emotion] = (emotionCount[row.emotion] || 0) + 1;
        }
        if (row.ambience) {
          ambienceCount[row.ambience] = (ambienceCount[row.ambience] || 0) + 1;
        }
        if (row.keywords) {
          row.keywords.split(",").forEach((k) => keywordSet.push(k.trim()));
        }
      });

      const topEmotion = Object.keys(emotionCount).sort(
        (a, b) => emotionCount[b] - emotionCount[a]
      )[0] || null;

      const mostUsedAmbience = Object.keys(ambienceCount).sort(
        (a, b) => ambienceCount[b] - ambienceCount[a]
      )[0] || null;

      // Get unique recent keywords (last 10 unique)
      const recentKeywords = [...new Set(keywordSet)].slice(0, 10);

      res.json({
        totalEntries: rows.length,
        topEmotion,
        mostUsedAmbience,
        recentKeywords,
      });
    }
  );
};