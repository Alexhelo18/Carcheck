const { writeDemoStore } = require("../data/demoStore");
const { hashPassword } = require("../utils/password");
const {
    PLATFORM_BOOKING_FEE_CENTS,
    PLATFORM_FEE_TRIGGER_STATUS,
    PLATFORM_CURRENCY
} = require("../config/bookingConfig");

const requiredEnv = [
    "DEMO_USER_EMAIL",
    "DEMO_USER_PASSWORD",
    "DEMO_WORKSHOP_EMAIL",
    "DEMO_WORKSHOP_PASSWORD",
    "SUPER_ADMIN_EMAIL",
    "SUPER_ADMIN_PASSWORD"
];

function requireEnv() {
    const missing = requiredEnv.filter((key) => !process.env[key]);

    if (missing.length) {
        throw new Error(`Variabili demo mancanti: ${missing.join(", ")}. Seed annullato.`);
    }

    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
        throw new Error("Seed demo bloccato in produzione. Imposta ALLOW_DEMO_SEED=true solo se sai cosa stai facendo.");
    }
}

function isoDate(days, hour = 9, minute = 0) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
}

function endAt(startAt, minutes) {
    return new Date(new Date(startAt).getTime() + minutes * 60000).toISOString();
}

function booking(id, status, service, startAt, overrides = {}) {
    const duration = overrides.durationMinutes || 60;
    return {
        id,
        userId: 1,
        userEmail: process.env.DEMO_USER_EMAIL,
        customerName: "Mario Rossi Demo",
        workshopId: 1,
        workshopName: "Officina Demo CarCheck",
        workshopAddress: "Via Demo 10, 20100 Milano",
        vehicle: overrides.vehicle || {
            marca: "Fiat",
            modello: "Panda",
            anno: 2020,
            targa: "DE000MO",
            alimentazione: "Benzina",
            chilometraggio: 42000,
            versione: "Demo"
        },
        serviceId: service.id,
        serviceName: service.nome,
        status,
        bookingMode: overrides.bookingMode || service.bookingMode,
        startAt,
        endAt: endAt(startAt, duration),
        durationMinutes: duration,
        preparationMinutes: service.preparationMinutes,
        capacityRequired: service.capacityRequired,
        customerNotes: "Prenotazione dimostrativa CarCheck.",
        workshopNotes: overrides.workshopNotes || "",
        estimatedPrice: service.prezzoDa,
        cancellationPolicy: "24 ore prima dell'appuntamento",
        expiresAt: status === "PENDING" || status === "RESCHEDULE_PROPOSED" ? isoDate(1, 20, 0) : null,
        createdAt: isoDate(-7 + id, 8, 0),
        updatedAt: isoDate(-6 + id, 8, 30),
        confirmedAt: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(status) ? isoDate(-5 + id, 9, 0) : null,
        completedAt: status === "COMPLETED" ? endAt(startAt, duration) : null,
        cancelledAt: status.startsWith("CANCELLED") ? isoDate(-2, 12, 0) : null,
        cancelledBy: status === "CANCELLED_BY_USER" ? "utente" : status === "CANCELLED_BY_WORKSHOP" ? "officina" : null,
        cancellationReason: status.startsWith("CANCELLED") ? "Motivo demo." : "",
        is_demo: true
    };
}

function run() {
    requireEnv();

    const services = [
        ["Tagliando", "tagliando", 90, 120, "REQUEST"],
        ["Cambio olio", "cambio olio", 45, 60, "INSTANT"],
        ["Cambio gomme", "cambio gomme", 45, 35, "INSTANT"],
        ["Freni", "freni", 90, 110, "REQUEST"],
        ["Diagnosi elettronica", "diagnosi", 60, 55, "REQUEST"],
        ["Revisione", "revisione", 60, 80, "INSTANT"],
        ["Elettrauto", "elettrauto", 75, 70, "REQUEST"],
        ["Aria condizionata", "aria condizionata", 80, 95, "REQUEST"]
    ].map(([nome, categoria, durataMinuti, prezzoDa, bookingMode], index) => ({
        id: index + 1,
        workshopId: 1,
        nome,
        descrizione: `Servizio demo: ${nome}.`,
        categoria,
        durataMinuti,
        prezzoDa,
        attivo: true,
        bookingMode,
        preparationMinutes: 15,
        capacityRequired: index === 3 ? 2 : 1,
        manualApprovalRequired: bookingMode === "REQUEST",
        customerFields: [],
        is_demo: true
    }));

    const bookings = [
        booking(1, "PENDING", services[0], isoDate(1, 9, 0)),
        booking(2, "CONFIRMED", services[1], isoDate(2, 10, 30)),
        booking(3, "RESCHEDULE_PROPOSED", services[2], isoDate(3, 11, 0)),
        booking(4, "CHECKED_IN", services[3], isoDate(0, 8, 30)),
        booking(5, "IN_PROGRESS", services[4], isoDate(0, 10, 0)),
        booking(6, "COMPLETED", services[5], isoDate(-4, 9, 30)),
        booking(7, "CANCELLED_BY_USER", services[6], isoDate(-3, 15, 0)),
        booking(8, "CANCELLED_BY_WORKSHOP", services[7], isoDate(-2, 16, 0)),
        booking(9, "NO_SHOW", services[0], isoDate(-1, 12, 0)),
        booking(10, "EXPIRED", services[1], isoDate(-5, 14, 0)),
        booking(11, "COMPLETED", services[2], isoDate(-8, 9, 0), { vehicle: { marca: "Volkswagen", modello: "Golf", anno: 2019, targa: "DE111MO", alimentazione: "Diesel", chilometraggio: 76000 } }),
        booking(12, "COMPLETED", services[4], isoDate(-12, 11, 30))
    ];

    const platformFees = bookings
        .filter((item) => item.status === PLATFORM_FEE_TRIGGER_STATUS)
        .map((item, index) => ({
            id: index + 1,
            bookingId: item.id,
            workshopId: item.workshopId,
            amountCents: PLATFORM_BOOKING_FEE_CENTS,
            currency: PLATFORM_CURRENCY,
            rule: `${PLATFORM_BOOKING_FEE_CENTS} cents on ${PLATFORM_FEE_TRIGGER_STATUS}`,
            status: index === 0 ? "PAID" : "DUE",
            maturedAt: item.completedAt,
            paidAt: index === 0 ? isoDate(-2, 10, 0) : null,
            cancelledReason: "",
            changedBy: "seed:demo",
            is_demo: true
        }));

    const store = {
        users: [
            {
                id: 1,
                role: "USER",
                tipo: "utente",
                nome: "Mario",
                cognome: "Rossi Demo",
                email: process.env.DEMO_USER_EMAIL,
                passwordHash: hashPassword(process.env.DEMO_USER_PASSWORD),
                telefono: "+390000000001",
                verified: true,
                status: "ACTIVE",
                createdAt: isoDate(-30),
                lastLoginAt: null,
                is_demo: true
            },
            {
                id: 2,
                role: "WORKSHOP_OWNER",
                tipo: "officina",
                nome: "Titolare",
                cognome: "Demo",
                email: process.env.DEMO_WORKSHOP_EMAIL,
                passwordHash: hashPassword(process.env.DEMO_WORKSHOP_PASSWORD),
                telefono: "+390000000002",
                verified: true,
                status: "ACTIVE",
                officinaId: 1,
                createdAt: isoDate(-28),
                lastLoginAt: null,
                is_demo: true
            }
        ],
        adminUsers: [
            {
                id: 1,
                nome: "Super Admin Demo",
                email: process.env.SUPER_ADMIN_EMAIL,
                passwordHash: hashPassword(process.env.SUPER_ADMIN_PASSWORD),
                role: "SUPER_ADMIN",
                status: "ACTIVE",
                verified: true,
                twoFactorEnabled: false,
                lastLoginAt: null,
                createdAt: isoDate(-20),
                is_demo: true
            }
        ],
        vehicles: [
            { id: 1, userId: 1, marca: "Fiat", modello: "Panda", anno: 2020, targa: "DE000MO", alimentazione: "Benzina", chilometraggio: 42000, versione: "Demo", is_demo: true },
            { id: 2, userId: 1, marca: "Volkswagen", modello: "Golf", anno: 2019, targa: "DE111MO", alimentazione: "Diesel", chilometraggio: 76000, versione: "Demo", is_demo: true }
        ],
        workshops: [
            {
                id: 1,
                ownerId: 2,
                nome: "Officina Demo CarCheck",
                ragioneSociale: "Officina Demo CarCheck SRL",
                partitaIva: "00000000000",
                telefonoOfficina: "+390000000003",
                nazione: "Italia",
                via: "Via Demo 10",
                cap: "20100",
                citta: "Milano",
                provincia: "MI",
                indirizzo: "Via Demo 10, 20100 Milano",
                descrizione: "Officina dimostrativa usata per testare CarCheck.",
                rating: 4.6,
                status: "ACTIVE",
                verificationStatus: "ACTIVE",
                profileCompleted: true,
                verifiedAt: isoDate(-15),
                is_demo: true,
                servizi: services,
                recensioni: []
            }
        ],
        services,
        workshopSettings: {
            1: {
                timezone: "Europe/Rome",
                slotIntervalMinutes: 30,
                minAdvanceHours: 2,
                maxFutureDays: 45,
                preparationMinutes: 10,
                concurrentCapacity: 3,
                pendingHoldMinutes: 720,
                rescheduleExpirationMinutes: 360,
                days: {
                    lunedi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
                    martedi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
                    mercoledi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
                    giovedi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
                    venerdi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
                    sabato: { open: true, morningStart: "08:30", morningEnd: "12:30", afternoonStart: "", afternoonEnd: "", concurrentCapacity: 2 },
                    domenica: { open: false, morningStart: "", morningEnd: "", afternoonStart: "", afternoonEnd: "", concurrentCapacity: 0 }
                },
                closures: [],
                holidays: []
            }
        },
        calendarBlocks: [
            { id: 1, workshopId: 1, title: "Riunione team demo", startAt: isoDate(4, 12, 0), endAt: isoDate(4, 13, 0), capacityBlocked: 1, note: "Blocco demo", is_demo: true },
            { id: 2, workshopId: 1, title: "Chiusura straordinaria demo", startAt: isoDate(6, 15, 0), endAt: isoDate(6, 17, 0), capacityBlocked: 3, note: "Blocco demo", is_demo: true }
        ],
        bookings,
        bookingEvents: bookings.map((item) => ({
            id: item.id,
            bookingId: item.id,
            type: "created",
            createdAt: item.createdAt,
            actor: "seed:demo",
            note: "Evento demo.",
            previousStatus: null,
            newStatus: item.status,
            is_demo: true
        })),
        rescheduleProposals: [
            { id: 1, bookingId: 3, workshopId: 1, startAt: isoDate(4, 15, 30), endAt: isoDate(4, 16, 15), capacityRequired: 1, note: "Proposta demo.", status: "PENDING", expiresAt: isoDate(1, 20, 0), createdAt: isoDate(-1, 9, 0), is_demo: true }
        ],
        reviews: [
            { id: 1, bookingId: 6, userId: 1, workshopId: 1, autore: "Mario Rossi Demo", voto: 5, testo: "Recensione demo verificata.", status: "PUBLISHED", verified: true, createdAt: isoDate(-3), is_demo: true },
            { id: 2, bookingId: 11, userId: 1, workshopId: 1, autore: "Mario Rossi Demo", voto: 4, testo: "Recensione demo verificata.", status: "PUBLISHED", verified: true, createdAt: isoDate(-7), is_demo: true },
            { id: 3, bookingId: null, userId: 1, workshopId: 1, autore: "Account Demo", voto: 3, testo: "Recensione demo non verificata.", status: "PENDING_REVIEW", verified: false, createdAt: isoDate(-2), is_demo: true },
            { id: 4, bookingId: null, userId: 1, workshopId: 1, autore: "Account Demo", voto: 4, testo: "Recensione demo in moderazione.", status: "DISPUTED", verified: false, createdAt: isoDate(-1), is_demo: true }
        ],
        platformFees,
        reports: [
            { id: 1, category: "recensioni false", priority: "alta", status: "OPEN", author: "Mario Rossi Demo", resource: "review:3", description: "Segnalazione demo.", createdAt: isoDate(-2), is_demo: true },
            { id: 2, category: "problemi con prenotazioni", priority: "media", status: "IN_REVIEW", author: "Officina Demo", resource: "booking:8", description: "Segnalazione demo.", createdAt: isoDate(-1), is_demo: true },
            { id: 3, category: "privacy", priority: "bassa", status: "WAITING_FOR_USER", author: "Mario Rossi Demo", resource: "user:1", description: "Richiesta demo.", createdAt: isoDate(-3), is_demo: true }
        ],
        tickets: [
            { id: 1, category: "prenotazione", priority: "alta", status: "OPEN", assignee: "Support demo", linkedBookingId: 1, firstResponseMinutes: null, resolutionMinutes: null, createdAt: isoDate(-1), is_demo: true },
            { id: 2, category: "officina", priority: "media", status: "IN_REVIEW", assignee: "Admin demo", linkedWorkshopId: 1, firstResponseMinutes: 35, resolutionMinutes: null, createdAt: isoDate(-4), is_demo: true },
            { id: 3, category: "fee", priority: "bassa", status: "RESOLVED", assignee: "Admin demo", linkedBookingId: 6, firstResponseMinutes: 20, resolutionMinutes: 180, createdAt: isoDate(-6), is_demo: true }
        ],
        auditLogs: [
            { id: 1, adminEmail: process.env.SUPER_ADMIN_EMAIL, action: "seed_demo", resource: "demoStore", previousState: null, nextState: "created_or_updated", reason: "Seed demo idempotente.", timestamp: new Date().toISOString(), outcome: "success", correlationId: `seed-${Date.now()}`, is_demo: true }
        ],
        settings: {
            PLATFORM_BOOKING_FEE_CENTS,
            PLATFORM_FEE_TRIGGER_STATUS,
            PLATFORM_CURRENCY,
            pendingExpirationMinutes: 720,
            rescheduleExpirationMinutes: 360,
            freeCancellationHours: 24,
            reminderIntervals: [48, 24, 2],
            supportEmail: "[EMAIL SUPPORTO DA COMPLETARE]",
            privacyEmail: "[EMAIL PRIVACY DA COMPLETARE]",
            maintenanceMode: false,
            workshopRegistrationsEnabled: true,
            userRegistrationsEnabled: true,
            reviewsEnabled: true
        }
    };

    writeDemoStore(store);

    console.log("Seed demo completato:");
    console.log(`- utenti demo: ${store.users.length}`);
    console.log(`- admin demo: ${store.adminUsers.length}`);
    console.log(`- officine demo: ${store.workshops.length}`);
    console.log(`- servizi demo: ${store.services.length}`);
    console.log(`- prenotazioni demo: ${store.bookings.length}`);
    console.log(`- recensioni demo: ${store.reviews.length}`);
    console.log(`- fee demo: ${store.platformFees.length}`);
    console.log(`- ticket/segnalazioni demo: ${store.tickets.length + store.reports.length}`);
}

if (require.main === module) {
    try {
        run();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

module.exports = { run };
