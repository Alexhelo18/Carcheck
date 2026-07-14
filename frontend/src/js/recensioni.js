function getMapsEmbedUrl(query) {
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function getOfficinaAddress(officina) {
    return [
        officina.nome,
        officina.via || officina.indirizzo,
        officina.cap,
        officina.citta,
        officina.nazione
    ].filter(Boolean).join(", ");
}

async function loadOfficinaDetail() {
    const container = document.getElementById("officina-detail");

    if (!container) {
        return;
    }

    const id = new URLSearchParams(window.location.search).get("id");

    if (!id) {
        container.innerHTML = `<p class="empty-state">Seleziona un'officina dalla pagina di ricerca.</p>`;
        return;
    }

    const officina = await api.getOfficinaById(id);

    if (!officina) {
        container.innerHTML = `<p class="empty-state">Officina non trovata o backend non disponibile.</p>`;
        return;
    }

    const servizi = (officina.servizi || []).map((servizio) => `<span>${servizio}</span>`).join("");
    const recensioni = (officina.recensioni || []).map((recensione) => {
        const voto = Number(recensione.voto || 0);

        return `
            <article class="review">
                <div>
                    <strong>${recensione.autore}</strong>
                    <span>${"★".repeat(voto)}${"☆".repeat(5 - voto)}</span>
                </div>
                <p>${recensione.testo}</p>
            </article>
        `;
    }).join("");

    const addressQuery = getOfficinaAddress(officina);

    container.innerHTML = `
        <section class="detail-main">
            <p class="eyebrow">${officina.citta}</p>
            <h1>${officina.nome}</h1>
            <p class="muted">${addressQuery}</p>
            <p>${officina.descrizione || "Informazioni officina in aggiornamento."}</p>
            <div class="tag-list">${servizi || "<span>Servizi in aggiornamento</span>"}</div>

            <div class="map-card">
                <iframe
                    title="Mappa ${officina.nome}"
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                    src="${getMapsEmbedUrl(addressQuery)}">
                </iframe>
            </div>

            <h2>Recensioni verificate</h2>
            <div class="reviews-list">
                ${recensioni || `<p class="empty-state">Non ci sono ancora recensioni per questa officina.</p>`}
            </div>
        </section>

        <aside class="detail-side">
            <div class="score-box">
                <span>${Number(officina.rating || 0).toFixed(1)}</span>
                <p>${(officina.recensioni || []).length} recensioni</p>
            </div>
            <a href="../pages/prenotazione.html?id=${officina.id}" class="btn-primary full-width">Prenota ora</a>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}" target="_blank" rel="noreferrer" class="btn-secondary full-width">Apri su Google Maps</a>
        </aside>
    `;
}

loadOfficinaDetail();
