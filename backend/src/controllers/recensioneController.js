const { officine } = require("./officinaController");
const { prenotazioni, BOOKING_STATUS } = require("./prenotazioneController");

function create(req, res) {
    const officina = officine.find((item) => item.id === Number(req.body.officinaId));

    if (!officina) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    const bookingId = req.body.bookingId ? Number(req.body.bookingId) : null;
    const booking = bookingId ? prenotazioni.find((item) => item.id === bookingId) : null;
    const alreadyReviewed = bookingId && officina.recensioni.some((item) => Number(item.bookingId) === bookingId);

    if (bookingId && (!booking || booking.status !== BOOKING_STATUS.COMPLETED || alreadyReviewed)) {
        return res.status(403).json({ message: "Puoi recensire solo una prenotazione completata e non gia recensita." });
    }

    const recensione = {
        bookingId,
        autore: req.body.autore,
        voto: Number(req.body.voto),
        testo: req.body.testo,
        verified: Boolean(booking)
    };

    officina.recensioni.push(recensione);
    res.status(201).json({ ok: true, recensione });
}

module.exports = {
    create
};
