const { officine } = require("./officinaController");

function create(req, res) {
    const officina = officine.find((item) => item.id === Number(req.body.officinaId));

    if (!officina) {
        return res.status(404).json({ message: "Officina non trovata" });
    }

    const recensione = {
        autore: req.body.autore,
        voto: Number(req.body.voto),
        testo: req.body.testo
    };

    officina.recensioni.push(recensione);
    res.status(201).json({ ok: true, recensione });
}

module.exports = {
    create
};
