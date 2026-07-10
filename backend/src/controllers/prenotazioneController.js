const prenotazioni = [];

function create(req, res) {
    const prenotazione = {
        id: prenotazioni.length + 1,
        officinaId: req.body.officinaId,
        nome: req.body.nome,
        email: req.body.email,
        servizio: req.body.servizio,
        data: req.body.data,
        orario: req.body.orario,
        note: req.body.note || "",
        stato: "in attesa"
    };

    prenotazioni.push(prenotazione);
    res.status(201).json({ ok: true, prenotazione });
}

module.exports = {
    create,
    prenotazioni
};
