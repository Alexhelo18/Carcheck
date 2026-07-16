const { officine } = require("./officinaController");
const { readDemoStore } = require("../data/demoStore");
const {
    bookingPolicy,
    PLATFORM_BOOKING_FEE_CENTS,
    PLATFORM_FEE_TRIGGER_STATUS
} = require("../config/bookingConfig");
const {
    BOOKING_STATUS,
    BOOKING_MODE,
    allowedTransitions,
    canTransition
} = require("../config/bookingStateMachine");

const prenotazioni = [];
const bookingEvents = [];
const rescheduleProposals = [];
const notifications = [];
const platformFees = [];
const calendarBlocks = [];
const workshopSettings = {};
const workshopServices = {};

const SERVICE_CATEGORIES = [
    "tagliando",
    "cambio olio",
    "cambio gomme",
    "freni",
    "diagnosi",
    "revisione",
    "carrozzeria",
    "elettrauto",
    "aria condizionata",
    "batteria",
    "soccorso stradale",
    "altro"
];

const DEFAULT_SERVICES = [
    { nome: "Tagliando", categoria: "tagliando", durataMinuti: 90, prezzoDa: 120, bookingMode: BOOKING_MODE.REQUEST },
    { nome: "Cambio gomme", categoria: "cambio gomme", durataMinuti: 45, prezzoDa: 35, bookingMode: BOOKING_MODE.INSTANT },
    { nome: "Diagnosi elettronica", categoria: "diagnosi", durataMinuti: 60, prezzoDa: 50, bookingMode: BOOKING_MODE.REQUEST },
    { nome: "Freni", categoria: "freni", durataMinuti: 90, prezzoDa: 90, bookingMode: BOOKING_MODE.REQUEST }
];

const DEFAULT_DAYS = {
    lunedi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
    martedi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
    mercoledi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
    giovedi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
    venerdi: { open: true, morningStart: "08:00", morningEnd: "13:00", afternoonStart: "15:00", afternoonEnd: "19:00", concurrentCapacity: 3 },
    sabato: { open: true, morningStart: "08:30", morningEnd: "12:30", afternoonStart: "", afternoonEnd: "", concurrentCapacity: 2 },
    domenica: { open: false, morningStart: "", morningEnd: "", afternoonStart: "", afternoonEnd: "", concurrentCapacity: 0 }
};

const DAY_KEYS = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
const ACTIVE_HOLD_STATUSES = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.IN_PROGRESS];

function toInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

function minutesFromTime(time) {
    const [hours, minutes] = String(time || "").split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }
    return hours * 60 + minutes;
}

function dateAtTime(dateValue, time) {
    const [year, month, day] = String(dateValue).split("-").map(Number);
    const [hours, minutes] = String(time).split(":").map(Number);

    if (![year, month, day, hours, minutes].every(Number.isFinite)) {
        return null;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function timeLabel(date) {
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function sameDate(date, dateValue) {
    return date.toISOString().slice(0, 10) === dateValue;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && aEnd > bStart;
}

function ensureWorkshopSettings(workshopId) {
    const demoSettings = readDemoStore().workshopSettings || {};

    if (!workshopSettings[workshopId] && demoSettings[workshopId]) {
        workshopSettings[workshopId] = demoSettings[workshopId];
    }

    if (!workshopSettings[workshopId]) {
        workshopSettings[workshopId] = {
            timezone: "Europe/Rome",
            days: JSON.parse(JSON.stringify(DEFAULT_DAYS)),
            closures: [],
            holidays: [],
            slotIntervalMinutes: bookingPolicy.defaultSlotIntervalMinutes,
            minAdvanceHours: bookingPolicy.defaultMinAdvanceHours,
            maxFutureDays: bookingPolicy.defaultMaxFutureDays,
            preparationMinutes: bookingPolicy.defaultPreparationMinutes,
            concurrentCapacity: bookingPolicy.defaultConcurrentCapacity,
            pendingHoldMinutes: bookingPolicy.pendingExpirationMinutes,
            rescheduleExpirationMinutes: bookingPolicy.rescheduleExpirationMinutes
        };
    }

    return workshopSettings[workshopId];
}

function normalizeService(input, workshopId, index = 0) {
    return {
        id: input.id || Number(`${workshopId}${index + 1}`),
        workshopId: Number(workshopId),
        nome: String(input.nome || input.name || "Servizio").trim(),
        descrizione: input.descrizione || input.description || "",
        categoria: SERVICE_CATEGORIES.includes(String(input.categoria || "").toLowerCase())
            ? String(input.categoria).toLowerCase()
            : "altro",
        durataMinuti: toInt(input.durataMinuti || input.durationMinutes, 60),
        prezzoDa: toMoney(input.prezzoDa || input.estimatedPrice || input.prezzoBase, 0),
        attivo: input.attivo !== false,
        bookingMode: input.bookingMode === BOOKING_MODE.INSTANT ? BOOKING_MODE.INSTANT : BOOKING_MODE.REQUEST,
        preparationMinutes: toInt(input.preparationMinutes, 0),
        capacityRequired: Math.max(1, toInt(input.capacityRequired, 1)),
        manualApprovalRequired: input.bookingMode !== BOOKING_MODE.INSTANT,
        customerFields: Array.isArray(input.customerFields) ? input.customerFields : []
    };
}

function ensureWorkshopServices(workshopId) {
    const demoServices = (readDemoStore().services || []).filter((service) => Number(service.workshopId) === Number(workshopId));

    if (!workshopServices[workshopId] && demoServices.length) {
        workshopServices[workshopId] = demoServices.map((service, index) => normalizeService(service, workshopId, index));
    }

    if (!workshopServices[workshopId]) {
        const officina = officine.find((item) => Number(item.id) === Number(workshopId));
        const fromWorkshop = Array.isArray(officina?.servizi)
            ? officina.servizi.map((servizio, index) => typeof servizio === "string"
                ? normalizeService({ nome: servizio, categoria: servizio.toLowerCase() }, workshopId, index)
                : normalizeService(servizio, workshopId, index))
            : [];

        workshopServices[workshopId] = (fromWorkshop.length ? fromWorkshop : DEFAULT_SERVICES.map((service, index) => normalizeService(service, workshopId, index)));
    }

    return workshopServices[workshopId];
}

function findWorkshop(workshopId) {
    return officine.find((item) => Number(item.id) === Number(workshopId))
        || (readDemoStore().workshops || []).find((item) => Number(item.id) === Number(workshopId));
}

function findService(workshopId, serviceIdOrName) {
    const services = ensureWorkshopServices(workshopId);
    return services.find((service) => Number(service.id) === Number(serviceIdOrName) || service.nome === serviceIdOrName);
}

function recordEvent(booking, type, actor, note = "", previousStatus = booking.previousStatus || null) {
    const event = {
        id: bookingEvents.length + 1,
        bookingId: booking.id,
        type,
        createdAt: new Date().toISOString(),
        actor: actor || "system",
        note,
        previousStatus,
        newStatus: booking.status
    };

    bookingEvents.push(event);
    return event;
}

function addNotification(booking, type, recipientRole, message) {
    const notification = {
        id: notifications.length + 1,
        bookingId: booking.id,
        workshopId: booking.workshopId,
        userEmail: booking.userEmail,
        type,
        recipientRole,
        message,
        read: false,
        createdAt: new Date().toISOString()
    };

    notifications.push(notification);
    return notification;
}

function expirePendingBookings() {
    const now = new Date();

    prenotazioni.forEach((booking) => {
        if ([BOOKING_STATUS.PENDING, BOOKING_STATUS.RESCHEDULE_PROPOSED].includes(booking.status) && booking.expiresAt && new Date(booking.expiresAt) <= now) {
            const previous = booking.status;
            booking.status = BOOKING_STATUS.EXPIRED;
            booking.updatedAt = now.toISOString();
            recordEvent(booking, "expired", "system", "Scadenza automatica della richiesta.", previous);
            addNotification(booking, "booking_expired", "utente", "La richiesta e scaduta: seleziona un nuovo orario.");
        }
    });
}

function getDaySchedule(settings, dateValue) {
    const date = new Date(`${dateValue}T12:00:00`);
    const dayKey = DAY_KEYS[date.getDay()];
    return settings.days[dayKey];
}

function isClosedDate(settings, dateValue) {
    return settings.holidays.includes(dateValue) || settings.closures.some((closure) => {
        const start = String(closure.startDate || "").slice(0, 10);
        const end = String(closure.endDate || closure.startDate || "").slice(0, 10);
        return dateValue >= start && dateValue <= end;
    });
}

function getSessions(day) {
    if (!day || !day.open) {
        return [];
    }

    return [
        [day.morningStart, day.morningEnd],
        [day.afternoonStart, day.afternoonEnd]
    ].filter(([start, end]) => minutesFromTime(start) !== null && minutesFromTime(end) !== null && minutesFromTime(start) < minutesFromTime(end));
}

function getBlockingIntervals(workshopId, startAt, endAt) {
    const demoBookings = readDemoStore().bookings || [];
    const allBookings = [...prenotazioni, ...demoBookings.filter((demo) => !prenotazioni.some((booking) => Number(booking.id) === Number(demo.id)))];
    const demoBlocks = readDemoStore().calendarBlocks || [];
    const allBlocks = [...calendarBlocks, ...demoBlocks.filter((demo) => !calendarBlocks.some((block) => Number(block.id) === Number(demo.id)))];
    const bookingIntervals = allBookings
        .filter((booking) => Number(booking.workshopId) === Number(workshopId))
        .filter((booking) => ACTIVE_HOLD_STATUSES.includes(booking.status))
        .map((booking) => ({
            startAt: new Date(booking.startAt),
            endAt: new Date(booking.endAt),
            capacityRequired: booking.capacityRequired
        }))
        .filter((interval) => overlaps(startAt, endAt, interval.startAt, interval.endAt));

    const proposalIntervals = rescheduleProposals
        .filter((proposal) => proposal.status === "PENDING")
        .filter((proposal) => Number(proposal.workshopId) === Number(workshopId))
        .map((proposal) => ({
            startAt: new Date(proposal.startAt),
            endAt: new Date(proposal.endAt),
            capacityRequired: proposal.capacityRequired
        }))
        .filter((interval) => overlaps(startAt, endAt, interval.startAt, interval.endAt));

    const manualBlocks = allBlocks
        .filter((block) => Number(block.workshopId) === Number(workshopId))
        .map((block) => ({
            startAt: new Date(block.startAt),
            endAt: new Date(block.endAt),
            capacityRequired: block.capacityBlocked
        }))
        .filter((interval) => overlaps(startAt, endAt, interval.startAt, interval.endAt));

    return [...bookingIntervals, ...proposalIntervals, ...manualBlocks];
}

function hasCapacity(workshopId, startAt, endAt, capacityRequired, concurrentCapacity) {
    const intervals = getBlockingIntervals(workshopId, startAt, endAt);
    const occupied = intervals.reduce((sum, interval) => sum + interval.capacityRequired, 0);

    return occupied + capacityRequired <= concurrentCapacity;
}

function getAvailabilitySlots(workshopId, serviceId, dateValue) {
    expirePendingBookings();

    const workshop = findWorkshop(workshopId);
    const service = findService(workshopId, serviceId);
    const settings = ensureWorkshopSettings(workshopId);

    if (!workshop || !service || !service.attivo || !dateValue || isClosedDate(settings, dateValue)) {
        return [];
    }

    const day = getDaySchedule(settings, dateValue);
    const sessions = getSessions(day);
    const totalMinutes = service.durataMinuti + service.preparationMinutes + settings.preparationMinutes;
    const capacity = day.concurrentCapacity || settings.concurrentCapacity;
    const minStart = addMinutes(new Date(), settings.minAdvanceHours * 60);
    const maxStart = addMinutes(new Date(), settings.maxFutureDays * 24 * 60);
    const slots = [];

    sessions.forEach(([sessionStart, sessionEnd]) => {
        let cursorMinutes = minutesFromTime(sessionStart);
        const sessionEndMinutes = minutesFromTime(sessionEnd);

        while (cursorMinutes !== null && cursorMinutes + totalMinutes <= sessionEndMinutes) {
            const hours = Math.floor(cursorMinutes / 60).toString().padStart(2, "0");
            const minutes = (cursorMinutes % 60).toString().padStart(2, "0");
            const startAt = dateAtTime(dateValue, `${hours}:${minutes}`);
            const endAt = addMinutes(startAt, totalMinutes);
            const available = startAt >= minStart && startAt <= maxStart && hasCapacity(workshopId, startAt, endAt, service.capacityRequired, capacity);

            if (available) {
                slots.push({
                    time: `${hours}:${minutes}`,
                    startAt: startAt.toISOString(),
                    endAt: endAt.toISOString(),
                    capacityAvailable: capacity,
                    bookingMode: service.bookingMode
                });
            }

            cursorMinutes += settings.slotIntervalMinutes;
        }
    });

    return slots;
}

function validateAvailabilityOrThrow(workshopId, service, startAt, endAt) {
    const settings = ensureWorkshopSettings(workshopId);
    const dateValue = startAt.toISOString().slice(0, 10);
    const day = getDaySchedule(settings, dateValue);
    const capacity = day?.concurrentCapacity || settings.concurrentCapacity;

    if (!day || !day.open || isClosedDate(settings, dateValue)) {
        const err = new Error("L'officina non e disponibile in questa data.");
        err.status = 409;
        throw err;
    }

    const sessionContainsSlot = getSessions(day).some(([sessionStart, sessionEnd]) => {
        const sessionStartAt = dateAtTime(dateValue, sessionStart);
        const sessionEndAt = dateAtTime(dateValue, sessionEnd);
        return startAt >= sessionStartAt && endAt <= sessionEndAt;
    });

    if (!sessionContainsSlot || !hasCapacity(workshopId, startAt, endAt, service.capacityRequired, capacity)) {
        const err = new Error("Questo orario non e piu disponibile. Seleziona un altro orario.");
        err.status = 409;
        throw err;
    }
}

function serializeBooking(booking) {
    return {
        ...booking,
        stato: booking.status,
        data: booking.startAt ? booking.startAt.slice(0, 10) : booking.data,
        orario: booking.startAt ? timeLabel(new Date(booking.startAt)) : booking.orario,
        officinaId: booking.workshopId,
        officinaNome: booking.workshopName,
        nome: booking.customerName,
        email: booking.userEmail,
        servizio: booking.serviceName,
        note: booking.customerNotes
    };
}

function changeStatus(booking, status, actor, note = "") {
    if (!canTransition(booking.status, status)) {
        const err = new Error("Transizione di stato non consentita.");
        err.status = 400;
        throw err;
    }

    const previous = booking.status;
    booking.status = status;
    booking.updatedAt = new Date().toISOString();

    if (status === BOOKING_STATUS.CONFIRMED) {
        booking.confirmedAt = booking.confirmedAt || booking.updatedAt;
    }

    if ([BOOKING_STATUS.CANCELLED_BY_USER, BOOKING_STATUS.CANCELLED_BY_WORKSHOP].includes(status)) {
        booking.cancelledAt = booking.updatedAt;
        booking.cancelledBy = actor;
        booking.cancellationReason = note;
    }

    if (status === BOOKING_STATUS.COMPLETED) {
        booking.completedAt = booking.updatedAt;
        generatePlatformFee(booking);
    }

    recordEvent(booking, "status_changed", actor, note, previous);
}

function generatePlatformFee(booking) {
    if (booking.status !== PLATFORM_FEE_TRIGGER_STATUS || platformFees.some((fee) => fee.bookingId === booking.id)) {
        return null;
    }

    const fee = {
        id: platformFees.length + 1,
        bookingId: booking.id,
        workshopId: booking.workshopId,
        amountCents: PLATFORM_BOOKING_FEE_CENTS,
        currency: "EUR",
        status: "DUE",
        maturedAt: new Date().toISOString(),
        paidAt: null,
        reversedAt: null,
        disputeNote: ""
    };

    platformFees.push(fee);
    return fee;
}

function index(req, res) {
    expirePendingBookings();

    const { email, officinaId, status, from, to } = req.query;
    const demoBookings = readDemoStore().bookings || [];
    const allBookings = [...prenotazioni, ...demoBookings.filter((demo) => !prenotazioni.some((booking) => Number(booking.id) === Number(demo.id)))];
    const results = allBookings.filter((booking) => {
        const emailMatch = !email || booking.userEmail === email;
        const workshopMatch = !officinaId || Number(booking.workshopId) === Number(officinaId);
        const statusMatch = !status || booking.status === status;
        const fromMatch = !from || booking.startAt >= new Date(from).toISOString();
        const toMatch = !to || booking.startAt <= new Date(to).toISOString();

        return emailMatch && workshopMatch && statusMatch && fromMatch && toMatch;
    });

    res.json(results.map(serializeBooking));
}

function services(req, res) {
    const workshop = findWorkshop(req.params.id);

    if (!workshop) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    return res.json(ensureWorkshopServices(req.params.id));
}

function saveServices(req, res) {
    const workshop = findWorkshop(req.params.id);

    if (!workshop) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    const servicesList = Array.isArray(req.body.services) ? req.body.services : [];
    workshopServices[req.params.id] = servicesList.map((service, index) => normalizeService(service, req.params.id, index));
    workshop.servizi = workshopServices[req.params.id];

    return res.json({ ok: true, services: workshopServices[req.params.id] });
}

function availability(req, res) {
    const { serviceId, date } = req.query;
    const slots = getAvailabilitySlots(req.params.id, serviceId, date);

    return res.json({ slots });
}

function getAgenda(req, res) {
    const workshop = findWorkshop(req.params.id);

    if (!workshop) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    return res.json({
        settings: ensureWorkshopSettings(req.params.id),
        blocks: [
            ...calendarBlocks,
            ...(readDemoStore().calendarBlocks || [])
        ].filter((block) => Number(block.workshopId) === Number(req.params.id))
    });
}

function saveAgenda(req, res) {
    const workshop = findWorkshop(req.params.id);

    if (!workshop) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    const current = ensureWorkshopSettings(req.params.id);
    const days = req.body.days || current.days;

    if (req.body.concurrentCapacity && !req.body.days) {
        Object.keys(days).forEach((dayKey) => {
            days[dayKey].concurrentCapacity = Number(req.body.concurrentCapacity);
        });
    }

    workshopSettings[req.params.id] = {
        ...current,
        ...req.body,
        days
    };

    return res.json({ ok: true, settings: workshopSettings[req.params.id] });
}

function createBlock(req, res) {
    const workshop = findWorkshop(req.params.id);

    if (!workshop) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    const startAt = new Date(req.body.startAt);
    const endAt = new Date(req.body.endAt);

    if (!req.body.title || !Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || startAt >= endAt) {
        return res.status(400).json({ message: "Dati blocco agenda non validi." });
    }

    const block = {
        id: calendarBlocks.length + 1,
        workshopId: Number(req.params.id),
        title: req.body.title,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        capacityBlocked: Math.max(1, toInt(req.body.capacityBlocked, 1)),
        note: req.body.note || "",
        recurrence: req.body.recurrence || null,
        createdAt: new Date().toISOString()
    };

    calendarBlocks.push(block);
    return res.status(201).json({ ok: true, block });
}

function create(req, res) {
    try {
        expirePendingBookings();

        const workshopId = Number(req.body.workshopId || req.body.officinaId);
        const workshop = findWorkshop(workshopId);
        const service = findService(workshopId, req.body.serviceId || req.body.servizio);
        const dateValue = req.body.date || req.body.data;
        const timeValue = req.body.time || req.body.orario;

        if (!workshop || !service || !dateValue || !timeValue || !req.body.vehicle) {
            return res.status(400).json({ message: "Seleziona officina, servizio, veicolo, data e orario." });
        }

        const startAt = dateAtTime(dateValue, timeValue);

        if (!startAt || !Number.isFinite(startAt.getTime())) {
            return res.status(400).json({ message: "Data o orario non validi." });
        }

        const totalMinutes = service.durataMinuti + service.preparationMinutes + ensureWorkshopSettings(workshopId).preparationMinutes;
        const endAt = addMinutes(startAt, totalMinutes);

        validateAvailabilityOrThrow(workshopId, service, startAt, endAt);

        const status = service.bookingMode === BOOKING_MODE.INSTANT ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.PENDING;
        const now = new Date().toISOString();
        const settings = ensureWorkshopSettings(workshopId);
        const booking = {
            id: prenotazioni.length + 1,
            userId: req.body.userId || null,
            userEmail: req.body.email || req.body.userEmail,
            customerName: req.body.nome || req.body.customerName,
            workshopId,
            workshopName: workshop.nome,
            workshopAddress: workshop.indirizzo || [workshop.via, workshop.cap, workshop.citta].filter(Boolean).join(", "),
            vehicle: req.body.vehicle,
            serviceId: service.id,
            serviceName: service.nome,
            status,
            bookingMode: service.bookingMode,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            durationMinutes: service.durataMinuti,
            preparationMinutes: service.preparationMinutes + settings.preparationMinutes,
            capacityRequired: service.capacityRequired,
            customerNotes: req.body.customerNotes || req.body.note || "",
            workshopNotes: "",
            warningLights: req.body.warningLights || "",
            estimatedPrice: service.prezzoDa,
            cancellationPolicy: `${bookingPolicy.freeCancellationHours} ore prima dell'appuntamento`,
            expiresAt: status === BOOKING_STATUS.PENDING ? addMinutes(new Date(), settings.pendingHoldMinutes).toISOString() : null,
            createdAt: now,
            updatedAt: now,
            confirmedAt: status === BOOKING_STATUS.CONFIRMED ? now : null,
            completedAt: null,
            cancelledAt: null,
            cancelledBy: null,
            cancellationReason: ""
        };

        prenotazioni.push(booking);
        recordEvent(booking, "created", "utente", status === BOOKING_STATUS.CONFIRMED ? "Prenotazione confermata automaticamente." : "Richiesta inviata.");
        addNotification(booking, "booking_created", "officina", `Nuova ${status === BOOKING_STATUS.PENDING ? "richiesta" : "prenotazione"} per ${booking.serviceName}.`);
        addNotification(booking, "booking_created", "utente", status === BOOKING_STATUS.CONFIRMED ? "Prenotazione confermata." : "Richiesta inviata all'officina.");

        return res.status(201).json({ ok: true, booking: serializeBooking(booking) });
    } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || "Errore nella creazione della prenotazione." });
    }
}

function show(req, res) {
    expirePendingBookings();

    const booking = prenotazioni.find((item) => item.id === Number(req.params.id));

    if (!booking) {
        return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    return res.json({
        booking: serializeBooking(booking),
        events: bookingEvents.filter((event) => event.bookingId === booking.id),
        proposals: rescheduleProposals.filter((proposal) => proposal.bookingId === booking.id)
    });
}

function update(req, res) {
    const booking = prenotazioni.find((item) => item.id === Number(req.params.id));

    if (!booking) {
        return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    const status = req.body.status || req.body.stato;

    try {
        changeStatus(booking, status, req.body.actor || "officina", req.body.note || "");
        return res.json({ ok: true, prenotazione: serializeBooking(booking), booking: serializeBooking(booking) });
    } catch (err) {
        return res.status(err.status || 400).json({ message: err.message });
    }
}

function statusAction(status, actor, notificationType, notificationMessage) {
    return (req, res) => {
        const booking = prenotazioni.find((item) => item.id === Number(req.params.id));

        if (!booking) {
            return res.status(404).json({ message: "Prenotazione non trovata" });
        }

        try {
            changeStatus(booking, status, actor, req.body.note || req.body.reason || "");
            addNotification(booking, notificationType, actor === "officina" ? "utente" : "officina", notificationMessage);
            return res.json({ ok: true, booking: serializeBooking(booking) });
        } catch (err) {
            return res.status(err.status || 400).json({ message: err.message });
        }
    };
}

function createRescheduleProposal(req, res) {
    const booking = prenotazioni.find((item) => item.id === Number(req.params.id));

    if (!booking) {
        return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    try {
        const service = findService(booking.workshopId, booking.serviceId);
        const startAt = dateAtTime(req.body.date, req.body.time);

        if (!startAt || !Number.isFinite(startAt.getTime())) {
            return res.status(400).json({ message: "Data o orario non validi." });
        }

        const endAt = addMinutes(startAt, booking.durationMinutes + booking.preparationMinutes);
        validateAvailabilityOrThrow(booking.workshopId, service, startAt, endAt);

        const previous = booking.status;
        changeStatus(booking, BOOKING_STATUS.RESCHEDULE_PROPOSED, "officina", req.body.note || "Proposta alternativa.");

        const proposal = {
            id: rescheduleProposals.length + 1,
            bookingId: booking.id,
            workshopId: booking.workshopId,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            capacityRequired: booking.capacityRequired,
            note: req.body.note || "",
            status: "PENDING",
            expiresAt: addMinutes(new Date(), ensureWorkshopSettings(booking.workshopId).rescheduleExpirationMinutes).toISOString(),
            createdAt: new Date().toISOString(),
            previousStatus: previous
        };

        rescheduleProposals.push(proposal);
        addNotification(booking, "reschedule_proposed", "utente", "L'officina ha proposto un nuovo orario.");

        return res.status(201).json({ ok: true, proposal, booking: serializeBooking(booking) });
    } catch (err) {
        return res.status(err.status || 400).json({ message: err.message });
    }
}

function acceptRescheduleProposal(req, res) {
    const booking = prenotazioni.find((item) => item.id === Number(req.params.id));
    const proposal = rescheduleProposals.find((item) => item.id === Number(req.params.proposalId) && item.bookingId === Number(req.params.id));

    if (!booking || !proposal || proposal.status !== "PENDING") {
        return res.status(404).json({ message: "Proposta non trovata o non attiva." });
    }

    try {
        booking.startAt = proposal.startAt;
        booking.endAt = proposal.endAt;
        proposal.status = "ACCEPTED";
        changeStatus(booking, BOOKING_STATUS.CONFIRMED, "utente", "Proposta accettata.");
        addNotification(booking, "reschedule_accepted", "officina", "Il cliente ha accettato la proposta.");
        return res.json({ ok: true, booking: serializeBooking(booking) });
    } catch (err) {
        return res.status(err.status || 400).json({ message: err.message });
    }
}

function rejectRescheduleProposal(req, res) {
    const booking = prenotazioni.find((item) => item.id === Number(req.params.id));
    const proposal = rescheduleProposals.find((item) => item.id === Number(req.params.proposalId) && item.bookingId === Number(req.params.id));

    if (!booking || !proposal || proposal.status !== "PENDING") {
        return res.status(404).json({ message: "Proposta non trovata o non attiva." });
    }

    try {
        proposal.status = "REJECTED";
        changeStatus(booking, BOOKING_STATUS.CANCELLED_BY_USER, "utente", "Proposta rifiutata.");
        addNotification(booking, "reschedule_rejected", "officina", "Il cliente ha rifiutato la proposta.");
        return res.json({ ok: true, booking: serializeBooking(booking) });
    } catch (err) {
        return res.status(err.status || 400).json({ message: err.message });
    }
}

function userBookings(req, res) {
    req.query.email = req.query.email || req.headers["x-user-email"];
    return index(req, res);
}

function workshopBookings(req, res) {
    req.query.officinaId = req.query.officinaId || req.query.workshopId || req.headers["x-workshop-id"];
    return index(req, res);
}

function getNotifications(req, res) {
    const { email, workshopId } = req.query;
    const results = notifications.filter((notification) => {
        const emailMatch = !email || notification.userEmail === email;
        const workshopMatch = !workshopId || Number(notification.workshopId) === Number(workshopId);
        return emailMatch && workshopMatch;
    });

    return res.json(results);
}

module.exports = {
    index,
    create,
    update,
    show,
    services,
    saveServices,
    availability,
    getAgenda,
    saveAgenda,
    createBlock,
    userBookings,
    workshopBookings,
    getNotifications,
    confirm: statusAction(BOOKING_STATUS.CONFIRMED, "officina", "booking_confirmed", "Prenotazione confermata dall'officina."),
    reject: statusAction(BOOKING_STATUS.REJECTED, "officina", "booking_rejected", "Richiesta rifiutata dall'officina."),
    cancel: (req, res) => {
        const actor = req.body.actor === "officina" ? "officina" : "utente";
        const status = actor === "officina" ? BOOKING_STATUS.CANCELLED_BY_WORKSHOP : BOOKING_STATUS.CANCELLED_BY_USER;

        if (actor === "officina" && String(req.body.note || req.body.reason || "").trim().length < 10) {
            return res.status(400).json({ message: "Inserisci un motivo dell'annullamento di almeno 10 caratteri." });
        }

        return statusAction(status, actor, "booking_cancelled", "Prenotazione annullata.")(req, res);
    },
    checkIn: statusAction(BOOKING_STATUS.IN_PROGRESS, "officina", "booking_checked_in", "Arrivo del veicolo confermato. Lavorazione avviata."),
    start: statusAction(BOOKING_STATUS.IN_PROGRESS, "officina", "booking_started", "Lavoro avviato."),
    complete: statusAction(BOOKING_STATUS.COMPLETED, "officina", "booking_completed", "Lavoro completato. Ora puoi lasciare una recensione."),
    noShow: statusAction(BOOKING_STATUS.NO_SHOW, "officina", "booking_no_show", "Cliente segnato come non presentato."),
    createRescheduleProposal,
    acceptRescheduleProposal,
    rejectRescheduleProposal,
    prenotazioni,
    bookingEvents,
    rescheduleProposals,
    notifications,
    platformFees,
    calendarBlocks,
    workshopSettings,
    workshopServices,
    allowedTransitions,
    BOOKING_STATUS,
    BOOKING_MODE
};
