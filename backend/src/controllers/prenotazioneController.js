const prenotazioni = [];

function index(req, res) {
    const { email, officinaId } = req.query;

    const results = prenotazioni.filter((prenotazione) => {
        const emailMatch = !email || prenotazione.email === email;
        const officinaMatch = !officinaId || Number(prenotazione.officinaId) === Number(officinaId);

        return emailMatch && officinaMatch;
    });

    res.json(results);
}

function create(req, res) {
    const prenotazione = {
        id: prenotazioni.length + 1,
        officinaId: req.body.officinaId,
        officinaNome: req.body.officinaNome || "",
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

function update(req, res) {
    const prenotazione = prenotazioni.find((item) => item.id === Number(req.params.id));

    if (!prenotazione) {
        return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    prenotazione.stato = req.body.stato || prenotazione.stato;
    return res.json({ ok: true, prenotazione });
}

module.exports = {
    index,
    create,
    update,
    prenotazioni
};
