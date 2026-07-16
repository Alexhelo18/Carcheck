const { officine } = require("./officinaController");
const { prenotazioni, BOOKING_STATUS } = require("./prenotazioneController");
const { readDemoStore, writeDemoStore } = require("../data/demoStore");

function create(req, res) {
    const store = readDemoStore();
    const officina = officine.find((item) => item.id === Number(req.body.officinaId));
    const demoOfficina = (store.workshops || []).find((item) => item.id === Number(req.body.officinaId));

    if (!officina && !demoOfficina) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    const bookingId = req.body.bookingId ? Number(req.body.bookingId) : null;
    const booking = bookingId ? prenotazioni.find((item) => item.id === bookingId)
        || (store.bookings || []).find((item) => item.id === bookingId) : null;
    const allReviews = [
        ...(officina?.recensioni || []),
        ...(store.reviews || [])
    ];
    const alreadyReviewed = bookingId && allReviews.some((item) => (
        Number(item.bookingId) === bookingId
        && Number(item.workshopId || req.body.officinaId) === Number(req.body.officinaId)
    ));

    if (bookingId && (!booking || booking.status !== BOOKING_STATUS.COMPLETED || alreadyReviewed)) {
        return res.status(403).json({ message: "Puoi recensire solo una prenotazione completata e non gia recensita." });
    }

    if (!bookingId || String(req.body.email || "").trim().toLowerCase() !== String(booking.userEmail || "").trim().toLowerCase()) {
        return res.status(403).json({ message: "Questa prenotazione non appartiene all'utente indicato." });
    }

    const voto = Number(req.body.voto);
    const testo = String(req.body.testo || "").trim();

    if (!Number.isInteger(voto) || voto < 1 || voto > 5 || testo.length < 10) {
        return res.status(400).json({ message: "Inserisci un voto da 1 a 5 e un commento di almeno 10 caratteri." });
    }

    const recensione = {
        id: allReviews.length + 1,
        bookingId,
        workshopId: Number(req.body.officinaId),
        autore: req.body.autore,
        voto,
        testo,
        status: "PUBLISHED",
        createdAt: new Date().toISOString(),
        verified: true
    };

    if (officina) {
        officina.recensioni.push(recensione);
    } else {
        store.reviews.push(recensione);
        demoOfficina.recensioni = demoOfficina.recensioni || [];
        demoOfficina.recensioni.push(recensione);
        writeDemoStore(store);
    }

    res.status(201).json({ ok: true, recensione });
}

module.exports = {
    create
};
