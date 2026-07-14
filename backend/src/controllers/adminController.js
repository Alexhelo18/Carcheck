const crypto = require("crypto");
const { readDemoStore, writeDemoStore } = require("../data/demoStore");
const { verifyPassword, hashPassword } = require("../utils/password");
const bookingController = require("./prenotazioneController");
const { utenti } = require("./authController");
const { officine } = require("./officinaController");
const { rootAdmin } = require("../config/adminAccount");

const ADMIN_ROLES = {
    SUPPORT: "SUPPORT",
    ADMIN: "ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN"
};

const rolePermissions = {
    SUPPORT: ["read", "tickets:write", "notes:write"],
    ADMIN: ["read", "users:write", "workshops:write", "bookings:write", "reviews:write", "tickets:write", "reports:write"],
    SUPER_ADMIN: ["read", "users:write", "workshops:write", "bookings:write", "reviews:write", "tickets:write", "reports:write", "settings:write", "admins:write", "fees:write", "security:read"]
};

const adminSessions = new Map();
const runtimeAuditLogs = [];

function safeAdmin(admin) {
    const { passwordHash, ...safe } = admin;
    return safe;
}

function sanitizeUser(user) {
    const { passwordHash, password, token, ...safe } = user;
    return safe;
}

function audit(admin, action, resource, reason = "", previousState = null, nextState = null, outcome = "success", req = null) {
    const entry = {
        id: runtimeAuditLogs.length + 1,
        adminEmail: admin?.email || "system",
        adminRole: admin?.role || "system",
        action,
        resource,
        previousState,
        nextState,
        reason,
        timestamp: new Date().toISOString(),
        ip: req?.ip || "",
        userAgent: req?.headers?.["user-agent"] || "",
        outcome,
        correlationId: crypto.randomUUID()
    };

    runtimeAuditLogs.push(entry);
    return entry;
}

function hasPermission(role, permission) {
    return Boolean(rolePermissions[role]?.includes(permission));
}

function requireAdmin(permission = "read") {
    return (req, res, next) => {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        const session = adminSessions.get(token);

        if (!session) {
            return res.status(401).json({ message: "Sessione amministrativa non valida o scaduta." });
        }

        if (!hasPermission(session.role, permission)) {
            audit(session, "admin_forbidden", req.originalUrl, "Permesso insufficiente.", null, null, "denied", req);
            return res.status(403).json({ message: "Azione non consentita per questo ruolo." });
        }

        req.admin = session;
        next();
    };
}

function getAdminUsers() {
    const storedAdmins = readDemoStore().adminUsers || [];
    const hasRoot = storedAdmins.some((admin) => admin.email === rootAdmin.email);
    return hasRoot ? storedAdmins : [rootAdmin, ...storedAdmins];
}

function getAllUsers() {
    return [...(readDemoStore().users || []), ...utenti.map((utente) => ({
        ...utente,
        role: utente.tipo === "officina" ? "WORKSHOP_OWNER" : "USER",
        status: "ACTIVE",
        verified: true,
        is_demo: false
    }))];
}

function getAllWorkshops() {
    const demo = readDemoStore().workshops || [];
    const ids = new Set(officine.map((item) => Number(item.id)));
    return [...officine.map((item) => ({ ...item, status: item.status || "ACTIVE", is_demo: false })), ...demo.filter((item) => !ids.has(Number(item.id)))];
}

function getAllBookings() {
    const demo = readDemoStore().bookings || [];
    const runtime = bookingController.prenotazioni || [];
    const runtimeIds = new Set(runtime.map((item) => Number(item.id)));
    return [...runtime, ...demo.filter((item) => !runtimeIds.has(Number(item.id)))];
}

function getAllFees() {
    const demo = readDemoStore().platformFees || [];
    const runtime = bookingController.platformFees || [];
    const runtimeIds = new Set(runtime.map((item) => Number(item.id)));
    return [...runtime, ...demo.filter((item) => !runtimeIds.has(Number(item.id)))];
}

function divide(numerator, denominator) {
    return denominator ? Number((numerator / denominator).toFixed(4)) : 0;
}

function overviewMetrics() {
    const users = getAllUsers();
    const workshops = getAllWorkshops();
    const bookings = getAllBookings();
    const fees = getAllFees();
    const confirmed = bookings.filter((item) => item.status === "CONFIRMED").length;
    const completed = bookings.filter((item) => item.status === "COMPLETED").length;
    const cancelled = bookings.filter((item) => ["CANCELLED_BY_USER", "CANCELLED_BY_WORKSHOP"].includes(item.status)).length;
    const requests = bookings.filter((item) => ["PENDING", "CONFIRMED", "REJECTED", "RESCHEDULE_PROPOSED"].includes(item.status)).length;

    const revenueMatured = fees
        .filter((fee) => !["WAIVED", "REFUNDED", "CANCELLED"].includes(fee.status))
        .reduce((sum, fee) => sum + Number(fee.amountCents || 0), 0);

    return {
        users: {
            total: users.length,
            active: users.filter((item) => item.status === "ACTIVE").length,
            verified: users.filter((item) => item.verified).length,
            suspended: users.filter((item) => item.status === "SUSPENDED").length,
            deleted: users.filter((item) => item.status === "DELETED").length,
            withBookings: new Set(bookings.map((item) => item.userEmail)).size
        },
        workshops: {
            total: workshops.length,
            pendingVerification: workshops.filter((item) => item.status === "PENDING_VERIFICATION").length,
            active: workshops.filter((item) => item.status === "ACTIVE").length,
            suspended: workshops.filter((item) => item.status === "SUSPENDED").length,
            withBookings: new Set(bookings.map((item) => item.workshopId)).size,
            withoutAvailability: workshops.filter((item) => !readDemoStore().workshopSettings?.[item.id]).length,
            incompleteProfiles: workshops.filter((item) => !item.profileCompleted).length
        },
        bookings: {
            total: bookings.length,
            pending: bookings.filter((item) => item.status === "PENDING").length,
            confirmed,
            completed,
            cancelledByUser: bookings.filter((item) => item.status === "CANCELLED_BY_USER").length,
            cancelledByWorkshop: bookings.filter((item) => item.status === "CANCELLED_BY_WORKSHOP").length,
            noShow: bookings.filter((item) => item.status === "NO_SHOW").length,
            expired: bookings.filter((item) => item.status === "EXPIRED").length,
            inProgress: bookings.filter((item) => item.status === "IN_PROGRESS").length,
            disputed: bookings.filter((item) => item.status === "DISPUTED").length
        },
        operations: {
            completionRate: divide(completed, confirmed + completed),
            cancellationRate: divide(cancelled, bookings.length),
            noShowRate: divide(bookings.filter((item) => item.status === "NO_SHOW").length, bookings.length),
            workshopAcceptanceRate: divide(bookings.filter((item) => ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(item.status)).length, requests),
            averageBookingsPerWorkshop: divide(bookings.length, workshops.length),
            repeatBookingRate: divide(users.filter((user) => bookings.filter((booking) => booking.userEmail === user.email).length > 1).length, users.length)
        },
        revenue: {
            maturedCents: revenueMatured,
            paidCents: fees.filter((fee) => fee.status === "PAID").reduce((sum, fee) => sum + Number(fee.amountCents || 0), 0),
            dueCents: fees.filter((fee) => fee.status === "DUE").reduce((sum, fee) => sum + Number(fee.amountCents || 0), 0),
            disputedCents: fees.filter((fee) => fee.status === "DISPUTED").reduce((sum, fee) => sum + Number(fee.amountCents || 0), 0),
            refundedCents: fees.filter((fee) => fee.status === "REFUNDED").reduce((sum, fee) => sum + Number(fee.amountCents || 0), 0),
            averageFeeCents: divide(revenueMatured, fees.length),
            feeCount: fees.length
        }
    };
}

function login(req, res) {
    const admin = getAdminUsers().find((item) => item.email === req.body.email && item.status === "ACTIVE");

    if (!admin || !verifyPassword(req.body.password, admin.passwordHash)) {
        audit({ email: req.body.email, role: "unknown" }, "admin_login_failed", "admin_session", "Credenziali non valide.", null, null, "failed", req);
        return res.status(401).json({ message: "Credenziali admin non valide." });
    }

    const token = crypto.randomUUID();
    const session = {
        ...safeAdmin(admin),
        token,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    };

    adminSessions.set(token, session);
    audit(session, "admin_login", "admin_session", "Accesso amministrativo riuscito.", null, null, "success", req);

    return res.json({ token, admin: session, permissions: rolePermissions[admin.role] || [] });
}

function logout(req, res) {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    adminSessions.delete(token);
    audit(req.admin, "admin_logout", "admin_session", "Logout amministrativo.", null, null, "success", req);
    res.json({ ok: true });
}

function overview(req, res) {
    res.json({
        environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
        metrics: overviewMetrics(),
        formulas: {
            completionRate: "prenotazioni completate / (prenotazioni confermate + completate)",
            cancellationRate: "prenotazioni cancellate / prenotazioni totali",
            noShowRate: "no-show / prenotazioni totali",
            workshopAcceptanceRate: "richieste confermate / richieste ricevute",
            averageBookingsPerWorkshop: "prenotazioni totali / officine totali",
            repeatBookingRate: "utenti con piu prenotazioni / utenti totali"
        },
        notifications: [
            ...(readDemoStore().reports || []).filter((item) => item.status === "OPEN").map((item) => ({ type: "report_open", message: `Segnalazione aperta: ${item.category}` })),
            ...(readDemoStore().tickets || []).filter((item) => item.priority === "alta" && item.status !== "RESOLVED").map((item) => ({ type: "ticket_urgent", message: `Ticket urgente #${item.id}` }))
        ]
    });
}

function listUsers(req, res) {
    res.json(getAllUsers().map((user) => {
        const bookings = getAllBookings().filter((booking) => booking.userEmail === user.email);
        return sanitizeUser({
            ...user,
            vehiclesCount: (readDemoStore().vehicles || []).filter((vehicle) => vehicle.userId === user.id).length,
            bookingsCount: bookings.length,
            completedBookings: bookings.filter((booking) => booking.status === "COMPLETED").length,
            cancellations: bookings.filter((booking) => String(booking.status).startsWith("CANCELLED")).length,
            noShow: bookings.filter((booking) => booking.status === "NO_SHOW").length
        });
    }));
}

function listWorkshops(req, res) {
    res.json(getAllWorkshops().map((workshop) => {
        const bookings = getAllBookings().filter((booking) => Number(booking.workshopId) === Number(workshop.id));
        const fees = getAllFees().filter((fee) => Number(fee.workshopId) === Number(workshop.id));
        return {
            ...workshop,
            bookingsCount: bookings.length,
            completedBookings: bookings.filter((booking) => booking.status === "COMPLETED").length,
            acceptanceRate: divide(bookings.filter((booking) => ["CONFIRMED", "COMPLETED"].includes(booking.status)).length, bookings.length),
            cancellationRate: divide(bookings.filter((booking) => String(booking.status).startsWith("CANCELLED")).length, bookings.length),
            activeServices: (workshop.servizi || []).filter((service) => service.attivo !== false).length,
            feeMaturedCents: fees.reduce((sum, fee) => sum + Number(fee.amountCents || 0), 0),
            feeDueCents: fees.filter((fee) => fee.status === "DUE").reduce((sum, fee) => sum + Number(fee.amountCents || 0), 0)
        };
    }));
}

function listBookings(req, res) {
    res.json(getAllBookings());
}

function listFees(req, res) {
    res.json(getAllFees());
}

function listReviews(req, res) {
    res.json(readDemoStore().reviews || []);
}

function listReports(req, res) {
    res.json(readDemoStore().reports || []);
}

function listTickets(req, res) {
    res.json(readDemoStore().tickets || []);
}

function listAuditLogs(req, res) {
    res.json([...(readDemoStore().auditLogs || []), ...runtimeAuditLogs]);
}

function listSettings(req, res) {
    res.json(readDemoStore().settings || {});
}

function patchSettings(req, res) {
    const store = readDemoStore();
    const previousState = store.settings || {};
    store.settings = { ...previousState, ...req.body };
    writeDemoStore(store);
    audit(req.admin, "settings_updated", "global_settings", req.body.reason || "Modifica configurazioni.", previousState, store.settings, "success", req);
    res.json(store.settings);
}

function userStatus(req, res) {
    const store = readDemoStore();
    const user = store.users.find((item) => Number(item.id) === Number(req.params.id));

    if (!user) {
        return res.status(404).json({ message: "Utente non trovato." });
    }

    const previous = { status: user.status };
    user.status = req.body.status || user.status;
    writeDemoStore(store);
    audit(req.admin, "user_status_updated", `user:${user.id}`, req.body.reason || "Cambio stato utente.", previous, { status: user.status }, "success", req);
    res.json(sanitizeUser(user));
}

function workshopStatus(req, res) {
    const store = readDemoStore();
    const workshop = store.workshops.find((item) => Number(item.id) === Number(req.params.id));

    if (!workshop) {
        return res.status(404).json({ message: "Officina non trovata." });
    }

    const previous = { status: workshop.status, verificationStatus: workshop.verificationStatus };
    workshop.status = req.body.status || workshop.status;
    workshop.verificationStatus = req.body.verificationStatus || workshop.verificationStatus;
    workshop.verifiedBy = req.admin.email;
    workshop.verifiedAt = new Date().toISOString();
    writeDemoStore(store);
    audit(req.admin, "workshop_status_updated", `workshop:${workshop.id}`, req.body.reason || "Cambio stato officina.", previous, { status: workshop.status, verificationStatus: workshop.verificationStatus }, "success", req);
    res.json(workshop);
}

function feeAction(req, res) {
    const store = readDemoStore();
    const fee = store.platformFees.find((item) => Number(item.id) === Number(req.params.id));

    if (!fee) {
        return res.status(404).json({ message: "Fee non trovata." });
    }

    const previous = { status: fee.status };
    fee.status = req.body.status || fee.status;
    fee.changedBy = req.admin.email;
    fee.changeReason = req.body.reason || "";
    writeDemoStore(store);
    audit(req.admin, "fee_status_updated", `fee:${fee.id}`, req.body.reason || "Cambio stato fee.", previous, { status: fee.status }, "success", req);
    res.json(fee);
}

function moderateReview(req, res) {
    const store = readDemoStore();
    const review = store.reviews.find((item) => Number(item.id) === Number(req.params.id));

    if (!review) {
        return res.status(404).json({ message: "Recensione non trovata." });
    }

    const previous = { status: review.status };
    review.status = req.body.status || review.status;
    review.moderationReason = req.body.reason || "";
    review.moderatedBy = req.admin.email;
    writeDemoStore(store);
    audit(req.admin, "review_moderated", `review:${review.id}`, req.body.reason || "Moderazione recensione.", previous, { status: review.status }, "success", req);
    res.json(review);
}

function listAdmins(req, res) {
    res.json(getAdminUsers().map(safeAdmin));
}

function createAdmin(req, res) {
    if (req.body.role === ADMIN_ROLES.SUPER_ADMIN && req.admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
        return res.status(403).json({ message: "Solo SUPER_ADMIN puo creare altri SUPER_ADMIN." });
    }

    const store = readDemoStore();
    const admin = {
        id: store.adminUsers.length + 1,
        nome: req.body.nome,
        email: req.body.email,
        passwordHash: hashPassword(req.body.password),
        role: req.body.role || ADMIN_ROLES.SUPPORT,
        status: "ACTIVE",
        verified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        is_demo: false
    };

    store.adminUsers.push(admin);
    writeDemoStore(store);
    audit(req.admin, "admin_created", `admin:${admin.email}`, req.body.reason || "Creazione admin.", null, safeAdmin(admin), "success", req);
    res.status(201).json(safeAdmin(admin));
}

function systemStatus(req, res) {
    res.json({
        backend: "ok",
        database: "demo-json",
        environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
        version: process.env.npm_package_version || "1.0.0",
        lastDeployAt: process.env.RENDER_GIT_COMMIT ? new Date().toISOString() : null,
        providers: {
            payments: "not_configured",
            email: "not_configured",
            sms: "not_configured"
        }
    });
}

module.exports = {
    ADMIN_ROLES,
    rolePermissions,
    requireAdmin,
    login,
    logout,
    overview,
    analytics: overview,
    listUsers,
    userStatus,
    listWorkshops,
    workshopStatus,
    listBookings,
    listFees,
    feeAction,
    listReviews,
    moderateReview,
    listReports,
    listTickets,
    listAuditLogs,
    listSettings,
    patchSettings,
    listAdmins,
    createAdmin,
    systemStatus,
    overviewMetrics,
    adminSessions
};
