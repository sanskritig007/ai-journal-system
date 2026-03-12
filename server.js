require("dotenv").config();
const express = require("express");
const cors = require("cors");


const journalRoutes = require("./routes/journalRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/journal", journalRoutes);

const PORT = 5000;

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});