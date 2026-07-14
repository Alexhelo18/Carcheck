const assert = require("assert");
const officinaController = require("../controllers/officinaController");
const bookingController = require("../controllers/prenotazioneController");

function mockReq({ body = {}, query = {}, params = {}, headers = {} } = {}) {
    return { body, query, params, headers };
}

function mockRes() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        }
    };
}

function call(handler, req) {
    const res = mockRes();
    handler(req, res);
    return res;
}

function nextDate() {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().slice(0, 10);
}

function createWorkshop() {
    const res = call(officinaController.create, mockReq({
        body: {
            nome: "Officina Test",
            citta: "Milano",
            indirizzo: "Via Test 1",
            servizi: []
        }
    }));

    assert.equal(res.statusCode, 201);
    return res.payload;
}

function configureWorkshop(workshopId) {
    call(bookingController.saveAgenda, mockReq({
        params: { id: workshopId },
        body: {
            slotIntervalMinutes: 30,
            minAdvanceHours: 0,
            maxFutureDays: 60,
            preparationMinutes: 0,
            concurrentCapacity: 1
        }
    }));

    const servicesRes = call(bookingController.saveServices, mockReq({
        params: { id: workshopId },
        body: {
            services: [
                { nome: "Cambio gomme", categoria: "cambio gomme", durataMinuti: 30, prezzoDa: 40, bookingMode: "INSTANT", capacityRequired: 1 },
                { nome: "Diagnosi", categoria: "diagnosi", durataMinuti: 30, prezzoDa: 60, bookingMode: "REQUEST", capacityRequired: 1 }
            ]
        }
    }));

    assert.equal(servicesRes.statusCode, 200);
    return servicesRes.payload.services;
}

function createBooking(workshopId, serviceId, date, time, email = "utente@test.it") {
    return call(bookingController.create, mockReq({
        body: {
            workshopId,
            serviceId,
            nome: "Mario Rossi",
            email,
            vehicle: {
                marca: "Fiat",
                modello: "Panda",
                anno: 2020,
                targa: "AB123CD",
                alimentazione: "Benzina",
                chilometraggio: 45000
            },
            date,
            time,
            customerNotes: "Test prenotazione"
        }
    }));
}

function run() {
    const workshop = createWorkshop();
    const services = configureWorkshop(workshop.id);
    const date = nextDate();

    const availability = call(bookingController.availability, mockReq({
        params: { id: workshop.id },
        query: { serviceId: services[0].id, date }
    }));

    assert.ok(availability.payload.slots.length > 0, "deve generare slot disponibili");

    const firstSlot = availability.payload.slots[0].time;
    const instant = createBooking(workshop.id, services[0].id, date, firstSlot);

    assert.equal(instant.statusCode, 201);
    assert.equal(instant.payload.booking.status, "CONFIRMED");

    const duplicate = createBooking(workshop.id, services[0].id, date, firstSlot, "altro@test.it");
    assert.equal(duplicate.statusCode, 409, "deve bloccare doppia prenotazione oltre capacita");

    const nextAvailability = call(bookingController.availability, mockReq({
        params: { id: workshop.id },
        query: { serviceId: services[1].id, date }
    }));
    const requestSlot = nextAvailability.payload.slots[0].time;
    const request = createBooking(workshop.id, services[1].id, date, requestSlot, "request@test.it");

    assert.equal(request.statusCode, 201);
    assert.equal(request.payload.booking.status, "PENDING");

    const bookingId = request.payload.booking.id;
    assert.equal(call(bookingController.confirm, mockReq({ params: { id: bookingId }, body: {} })).statusCode, 200);
    assert.equal(call(bookingController.checkIn, mockReq({ params: { id: bookingId }, body: {} })).statusCode, 200);
    assert.equal(call(bookingController.start, mockReq({ params: { id: bookingId }, body: {} })).statusCode, 200);
    assert.equal(call(bookingController.complete, mockReq({ params: { id: bookingId }, body: {} })).statusCode, 200);
    assert.equal(bookingController.platformFees.length, 1, "la fee deve maturare una sola volta");

    const invalidTransition = call(bookingController.reject, mockReq({ params: { id: bookingId }, body: {} }));
    assert.equal(invalidTransition.statusCode, 400, "deve bloccare transizioni non consentite");

    console.log("bookingFlow.test.js: ok");
}

run();
