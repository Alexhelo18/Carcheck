const express = require("express");
const cors = require("cors");
const path = require("path");

const authController = require("./controllers/authController");
const officinaController = require("./controllers/officinaController");
const prenotazioneController = require("./controllers/prenotazioneController");
const recensioneController = require("./controllers/recensioneController");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend/src")));
app.use("/public", express.static(path.join(__dirname, "../../public")));

app.get("/api/officine", officinaController.index);
app.get("/api/officine/:id", officinaController.show);
app.post("/api/officine", officinaController.create);
app.get("/api/prenotazioni", prenotazioneController.index);
app.post("/api/prenotazioni", prenotazioneController.create);
app.patch("/api/prenotazioni/:id", prenotazioneController.update);
app.post("/api/recensioni", recensioneController.create);
app.post("/api/auth/register", authController.register);
app.post("/api/auth/login", authController.login);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/src/pages/home.html"));
});

app.listen(PORT, () => {
    console.log(`CarCheck API attiva su http://localhost:${PORT}`);
});
