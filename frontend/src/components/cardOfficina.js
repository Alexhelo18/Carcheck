function createOfficinaCard(officina) {
    const serviziList = Array.isArray(officina.servizi) ? officina.servizi : [];
    const recensioniList = Array.isArray(officina.recensioni) ? officina.recensioni : [];
    const servizi = serviziList.slice(0, 3).map((servizio) => `<span>${servizio}</span>`).join("");
    const rating = Number(officina.rating || 0);

    return `
        <article class="officina-card">
            <div class="card-topline">
                <span class="rating">${rating.toFixed(1)}</span>
                <span>${recensioniList.length} recensioni</span>
            </div>
            <h3>${officina.nome || "Officina"}</h3>
            <p class="muted">${officina.indirizzo || "Indirizzo in aggiornamento"}, ${officina.citta || ""}</p>
            <p>${officina.descrizione || "Descrizione in aggiornamento."}</p>
            <div class="tag-list">${servizi || "<span>Servizi in aggiornamento</span>"}</div>
            <div class="card-actions">
                <a href="../pages/officina.html?id=${officina.id}" class="btn-secondary">Vedi recensioni</a>
                <a href="../pages/prenotazione.html?id=${officina.id}" class="btn-primary">Prenota</a>
            </div>
        </article>
    `;
}
