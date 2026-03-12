const db = require("../models/db");
const analyzeEmotion = require("../services/llmService");

exports.createJournal = (req, res) => {

const { userId, ambience, text } = req.body;

db.run(
  "INSERT INTO journals (userId, ambience, text) VALUES (?, ?, ?)",
  [userId, ambience, text],
  function(err){

    if(err){
      return res.status(500).json(err);
    }

    res.json({
      message: "Journal saved successfully",
      id: this.lastID
    });

  }
);

};

exports.getEntries = (req, res) => {

const { userId } = req.params;

db.all(
"SELECT * FROM journals WHERE userId = ?",
[userId],
(err, rows) => {

if (err) {
return res.status(500).json(err);
}

res.json(rows);

}
);

};

exports.analyzeText = async (req, res) => {
  try {

    const { text } = req.body;

    const result = await analyzeEmotion(text);

    res.json(result);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "LLM analysis failed" });

  }
};

exports.getInsights = (req, res) => {
    res.json({ message: "Insights working" });
};