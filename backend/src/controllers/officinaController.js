const officine = [];

function index(req, res) {
    res.json(officine);
}

function show(req, res) {
    const officina = officine.find((item) => item.id === Number(req.params.id));

    if (!officina) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    return res.json(officina);
}

function create(req, res) {
    const indirizzo = req.body.indirizzo || [
        req.body.via,
        req.body.cap,
        req.body.citta,
        req.body.nazione
    ].filter(Boolean).join(", ");

    const officina = {
        id: officine.length + 1,
        nome: req.body.nome,
        nazione: req.body.nazione || "",
        via: req.body.via || "",
        cap: req.body.cap || "",
        citta: req.body.citta,
        indirizzo,
        descrizione: req.body.descrizione || "",
        rating: Number(req.body.rating || 0),
        servizi: Array.isArray(req.body.servizi) ? req.body.servizi : [],
        recensioni: []
    };

    officine.push(officina);
    res.status(201).json(officina);
}

module.exports = {
    index,
    show,
    create,
    officine
};
