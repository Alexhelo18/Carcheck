function getParams() {
    return new URLSearchParams(window.location.search);
}

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function getMapsEmbedUrl(query) {
    const search = encodeURIComponent(query || "officine meccaniche Italia");
    return `https://www.google.com/maps?q=${search}&output=embed`;
}

function updateResultsMap(city, service) {
    const map = document.getElementById("resultsMap");

    if (!map) {
        return;
    }

    const parts = [service || "officine meccaniche", city].filter(Boolean);
    map.src = getMapsEmbedUrl(parts.join(" "));
}

function filterOfficine(officine, filters) {
    return officine.filter((officina) => {
        const cityMatch = !filters.citta || normalize(officina.citta).includes(filters.citta);
        const servizi = Array.isArray(officina.servizi) ? officina.servizi : [];
        const serviceMatch = !filters.servizio || servizi.some((servizio) => {
            return normalize(servizio).includes(filters.servizio);
        });
        const ratingMatch = !filters.rating || Number(officina.rating || 0) >= Number(filters.rating);

        return cityMatch && serviceMatch && ratingMatch;
    });
}

function renderOfficine(officine) {
    const container = document.getElementById("officine-container");

    if (!container) {
        return;
    }

    if (!officine.length) {
        container.innerHTML = `
            <p class="empty-state">
                Nessuna officina disponibile al momento. Quando il backend riceve dati reali,
                le officine compariranno automaticamente qui.
            </p>
        `;
        return;
    }

    container.innerHTML = officine.map(createOfficinaCard).join("");
}

async function loadHome() {
    const form = document.getElementById("homeSearchForm");
    const officine = await api.getOfficine();

    renderOfficine(officine.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 3));

    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const citta = encodeURIComponent(document.getElementById("cityInput").value.trim());
            const servizio = encodeURIComponent(document.getElementById("serviceInput").value.trim());
            window.location.href = `../pages/ricerca.html?citta=${citta}&servizio=${servizio}`;
        });
    }
}

async function loadSearch() {
    const params = getParams();
    const form = document.getElementById("searchForm");
    const cityInput = document.getElementById("searchCity");
    const serviceInput = document.getElementById("searchService");
    const ratingInput = document.getElementById("searchRating");
    const counter = document.getElementById("resultsCounter");

    if (!form) {
        return;
    }

    cityInput.value = params.get("citta") || "";
    serviceInput.value = params.get("servizio") || "";
    updateResultsMap(cityInput.value.trim(), serviceInput.value.trim());

    const updateResults = async () => {
        const officine = await api.getOfficine();
        const filtered = filterOfficine(officine, {
            citta: normalize(cityInput.value),
            servizio: normalize(serviceInput.value),
            rating: ratingInput.value
        });

        counter.textContent = `${filtered.length} officine trovate`;
        updateResultsMap(cityInput.value.trim(), serviceInput.value.trim());
        renderOfficine(filtered);
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        updateResults();
    });

    updateResults();
}

loadHome();
loadSearch();
