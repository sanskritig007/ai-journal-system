require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const journalRoutes = require("./routes/journalRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend from the public/ folder
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/journal", journalRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});