require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");

const journalRoutes = require("./routes/journalRoutes");

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});

app.use(express.static(path.join(__dirname, "client/dist")));

app.use("/api/", apiLimiter);
app.use("/api/journal", journalRoutes);

app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist", "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
