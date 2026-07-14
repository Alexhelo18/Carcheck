const express = require("express");
const cors = require("cors");
const path = require("path");

const authController = require("./controllers/authController");
const officinaController = require("./controllers/officinaController");
const prenotazioneController = require("./controllers/prenotazioneController");
const recensioneController = require("./controllers/recensioneController");
const adminController = require("./controllers/adminController");

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

app.post("/api/admin/login", adminController.login);
app.post("/api/admin/logout", adminController.requireAdmin("read"), adminController.logout);
app.get("/api/admin/overview", adminController.requireAdmin("read"), adminController.overview);
app.get("/api/admin/analytics", adminController.requireAdmin("read"), adminController.analytics);
app.get("/api/admin/users", adminController.requireAdmin("read"), adminController.listUsers);
app.patch("/api/admin/users/:id/status", adminController.requireAdmin("users:write"), adminController.userStatus);
app.get("/api/admin/workshops", adminController.requireAdmin("read"), adminController.listWorkshops);
app.patch("/api/admin/workshops/:id/status", adminController.requireAdmin("workshops:write"), adminController.workshopStatus);
app.patch("/api/admin/workshops/:id/verify", adminController.requireAdmin("workshops:write"), adminController.workshopStatus);
app.get("/api/admin/bookings", adminController.requireAdmin("read"), adminController.listBookings);
app.get("/api/admin/fees", adminController.requireAdmin("read"), adminController.listFees);
app.post("/api/admin/fees/:id/actions", adminController.requireAdmin("fees:write"), adminController.feeAction);
app.get("/api/admin/payments", adminController.requireAdmin("read"), adminController.listFees);
app.get("/api/admin/reviews", adminController.requireAdmin("read"), adminController.listReviews);
app.post("/api/admin/reviews/:id/moderate", adminController.requireAdmin("reviews:write"), adminController.moderateReview);
app.get("/api/admin/reports", adminController.requireAdmin("read"), adminController.listReports);
app.get("/api/admin/tickets", adminController.requireAdmin("read"), adminController.listTickets);
app.get("/api/admin/audit-logs", adminController.requireAdmin("read"), adminController.listAuditLogs);
app.get("/api/admin/settings", adminController.requireAdmin("read"), adminController.listSettings);
app.patch("/api/admin/settings", adminController.requireAdmin("settings:write"), adminController.patchSettings);
app.get("/api/admin/admin-users", adminController.requireAdmin("read"), adminController.listAdmins);
app.post("/api/admin/admin-users", adminController.requireAdmin("admins:write"), adminController.createAdmin);
app.get("/api/admin/system", adminController.requireAdmin("security:read"), adminController.systemStatus);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/src/pages/home.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/src/pages/admin.html"));
});

app.listen(PORT, () => {
    console.log(`CarCheck API attiva su http://localhost:${PORT}`);
});
