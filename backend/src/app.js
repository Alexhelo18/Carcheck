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

app.get("/api/workshops/:id/services", prenotazioneController.services);
app.put("/api/workshops/:id/services", prenotazioneController.saveServices);
app.get("/api/workshops/:id/availability", prenotazioneController.availability);
app.get("/api/workshops/:id/agenda", prenotazioneController.getAgenda);
app.put("/api/workshops/:id/agenda", prenotazioneController.saveAgenda);
app.post("/api/workshops/:id/calendar-blocks", prenotazioneController.createBlock);
app.get("/api/users/me/bookings", prenotazioneController.userBookings);
app.get("/api/workshops/me/bookings", prenotazioneController.workshopBookings);
app.get("/api/notifications", prenotazioneController.getNotifications);
app.get("/api/bookings/:id", prenotazioneController.show);
app.post("/api/bookings", prenotazioneController.create);
app.patch("/api/bookings/:id/confirm", prenotazioneController.confirm);
app.patch("/api/bookings/:id/reject", prenotazioneController.reject);
app.post("/api/bookings/:id/reschedule-proposals", prenotazioneController.createRescheduleProposal);
app.patch("/api/bookings/:id/reschedule-proposals/:proposalId/accept", prenotazioneController.acceptRescheduleProposal);
app.patch("/api/bookings/:id/reschedule-proposals/:proposalId/reject", prenotazioneController.rejectRescheduleProposal);
app.patch("/api/bookings/:id/cancel", prenotazioneController.cancel);
app.patch("/api/bookings/:id/check-in", prenotazioneController.checkIn);
app.patch("/api/bookings/:id/start", prenotazioneController.start);
app.patch("/api/bookings/:id/complete", prenotazioneController.complete);
app.patch("/api/bookings/:id/no-show", prenotazioneController.noShow);

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
