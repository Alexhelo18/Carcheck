const statusLabels = {
    DRAFT: "Bozza",
    PENDING: "In attesa",
    CONFIRMED: "Confermata",
    RESCHEDULE_PROPOSED: "Modifica proposta",
    REJECTED: "Rifiutata",
    CANCELLED_BY_USER: "Annullata dall'utente",
    CANCELLED_BY_WORKSHOP: "Annullata dall'officina",
    EXPIRED: "Scaduta",
    CHECKED_IN: "Veicolo arrivato",
    IN_PROGRESS: "In lavorazione",
    COMPLETED: "Completata",
    NO_SHOW: "No-show",
    DISPUTED: "Contestata"
};

function initFieldHelpPopovers() {
    const closePopover = (button) => {
        const popover = document.getElementById(button.getAttribute("aria-controls"));

        button.setAttribute("aria-expanded", "false");
        popover?.classList.remove("open");
        if (popover) popover.hidden = true;
    };

    const closeAll = (except = null) => {
        document.querySelectorAll('.field-help-button[aria-expanded="true"]').forEach((button) => {
            if (button !== except) closePopover(button);
        });
    };

    document.addEventListener("click", (event) => {
        const button = event.target.closest(".field-help-button");

        if (button) {
            const popover = document.getElementById(button.getAttribute("aria-controls"));
            const shouldOpen = button.getAttribute("aria-expanded") !== "true";

            closeAll(button);
            button.setAttribute("aria-expanded", String(shouldOpen));
            if (popover) {
                popover.hidden = !shouldOpen;
                popover.classList.toggle("open", shouldOpen);
            }
            return;
        }

        if (!event.target.closest(".field-help-popover")) closeAll();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        const openButton = document.querySelector('.field-help-button[aria-expanded="true"]');
        closeAll();
        openButton?.focus();
    });
}

function getSession() {
    return JSON.parse(localStorage.getItem("carcheckUser") || "null");
}

function renderAccessGate(container, role) {
    const label = role === "officina" ? "officina" : "utente";

    container.innerHTML = `
        <div class="access-gate">
            <p class="eyebrow">Accesso richiesto</p>
            <h2>Questa area e riservata agli account ${label}</h2>
            <p>Accedi con il profilo corretto per vedere questa interfaccia.</p>
            <a href="../pages/login.html" class="btn-primary">Vai al login</a>
        </div>
    `;
}

function formatDateTime(value) {
    if (!value) {
        return "Data da definire";
    }

    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function maskPlate(plate = "") {
    const clean = String(plate).replace(/\s/g, "").toUpperCase();
    if (clean.length < 4) {
        return clean || "Targa non indicata";
    }

    return `${clean.slice(0, 2)}***${clean.slice(-2)}`;
}

function bookingActions(booking, mode) {
    if (mode === "utente") {
        if (booking.status === "RESCHEDULE_PROPOSED") {
            const proposal = booking.proposals?.find((item) => item.status === "PENDING");
            return proposal ? `
                <button type="button" data-booking-id="${booking.id}" data-proposal-id="${proposal.id}" data-reschedule-action="accept">Accetta proposta</button>
                <button type="button" data-booking-id="${booking.id}" data-proposal-id="${proposal.id}" data-reschedule-action="reject" class="danger-btn">Rifiuta proposta</button>
            ` : "";
        }

        if (["PENDING", "CONFIRMED"].includes(booking.status)) {
            return `<button type="button" data-booking-id="${booking.id}" data-action="cancel" data-actor="utente" class="danger-btn">Annulla prenotazione</button>`;
        }

        if (booking.status === "COMPLETED") {
            return `<a class="btn-primary" href="../pages/officina.html?id=${booking.workshopId || booking.officinaId}">Lascia recensione</a>`;
        }

        return `<a class="btn-secondary" href="../pages/contatti.html">Richiedi assistenza</a>`;
    }

    const actions = {
        PENDING: [
            ["confirm", "Conferma", ""],
            ["reject", "Rifiuta", "danger-btn"],
            ["reschedule", "Proponi modifica", "btn-secondary"]
        ],
        CONFIRMED: [
            ["check-in", "Segna arrivato", ""],
            ["cancel", "Annulla", "danger-btn"],
            ["no-show", "No-show", "btn-secondary"]
        ],
        CHECKED_IN: [["start", "Avvia lavoro", ""]],
        IN_PROGRESS: [["complete", "Completa lavoro", ""]],
        RESCHEDULE_PROPOSED: [["cancel", "Annulla", "danger-btn"]]
    };

    return (actions[booking.status] || [])
        .map(([action, label, className]) => `<button type="button" data-booking-id="${booking.id}" data-action="${action}" data-actor="officina" class="${className}">${label}</button>`)
        .join("");
}

function renderBookingCard(booking, mode) {
    const vehicle = booking.vehicle || {};
    const actions = bookingActions(booking, mode);

    return `
        <article class="booking-item" data-status="${booking.status}">
            <div>
                <span class="status-pill">${statusLabels[booking.status] || booking.stato || booking.status}</span>
                <h3>${booking.serviceName || booking.servizio}</h3>
                <p>${formatDateTime(booking.startAt || `${booking.data}T${booking.orario || "00:00"}`)}</p>
                <p class="muted">${booking.workshopName || booking.officinaNome || "Officina selezionata"}</p>
                ${booking.workshopAddress ? `<p class="muted">${booking.workshopAddress}</p>` : ""}
            </div>
            <div>
                <strong>${mode === "officina" ? booking.customerName || booking.nome : `${vehicle.marca || ""} ${vehicle.modello || ""}`}</strong>
                <p class="muted">${mode === "officina" ? booking.userEmail || booking.email : maskPlate(vehicle.targa)}</p>
                <p>${vehicle.marca ? `${vehicle.marca} ${vehicle.modello} · ${maskPlate(vehicle.targa)}` : "Veicolo in aggiornamento"}</p>
                ${booking.customerNotes ? `<p>${booking.customerNotes}</p>` : ""}
                ${booking.workshopNotes ? `<p class="muted">${booking.workshopNotes}</p>` : ""}
            </div>
            ${actions ? `<div class="booking-actions">${actions}</div>` : ""}
        </article>
    `;
}

function renderCalendar(bookings) {
    const calendar = document.getElementById("userCalendar");

    if (!calendar) {
        return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const bookedDays = new Set(bookings.map((booking) => Number(String(booking.startAt || booking.data || "").slice(8, 10))));
    const weekdays = ["L", "M", "M", "G", "V", "S", "D"];

    calendar.innerHTML = `
        <div class="calendar-title">${today.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</div>
        ${weekdays.map((day) => `<span class="weekday">${day}</span>`).join("")}
        ${Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const isBooked = bookedDays.has(day);
            const isToday = day === today.getDate();

            return `
                <a class="calendar-day ${isBooked ? "booked" : ""} ${isToday ? "today" : ""}"
                   href="../pages/ricerca.html?giorno=${day}">
                    ${day}
                </a>
            `;
        }).join("")}
    `;
}

async function getWorkshopId(session) {
    if (session?.officinaId) {
        return session.officinaId;
    }

    const workshops = await api.getOfficine();
    return workshops[0]?.id || 1;
}

async function loadUserDashboard() {
    const container = document.getElementById("userBookings");

    if (!container) {
        return;
    }

    const session = getSession();
    const greeting = document.getElementById("userGreeting");
    const nextBookingBtn = document.getElementById("nextBookingBtn");
    const filter = document.getElementById("userBookingFilter");

    if (!session || session.tipo !== "utente") {
        renderAccessGate(container, "utente");
        renderCalendar([]);
        return;
    }

    if (greeting && session.nome) {
        greeting.textContent = `Ciao ${session.nome}`;
    }

    nextBookingBtn?.addEventListener("click", () => {
        window.location.href = "../pages/ricerca.html";
    });

    const render = async () => {
        const bookings = await api.getPrenotazioni({ email: session.email });
        const filtered = filter?.value ? bookings.filter((booking) => booking.status === filter.value) : bookings;
        renderCalendar(bookings);

        container.innerHTML = filtered.length
            ? filtered.map((booking) => renderBookingCard(booking, "utente")).join("")
            : `<p class="empty-state">Non hai ancora prenotazioni.</p>`;
    };

    container.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-booking-id]");

        if (!button) {
            return;
        }

        if (button.dataset.rescheduleAction) {
            await api.respondReschedule(button.dataset.bookingId, button.dataset.proposalId, button.dataset.rescheduleAction);
        } else {
            await api.bookingAction(button.dataset.bookingId, button.dataset.action, { actor: "utente" });
        }

        render();
    });

    filter?.addEventListener("change", render);
    render();
}

function serviceEditorRow(service = {}, index = 0) {
    return `
        <article class="service-editor" data-service-index="${index}">
            <label>Nome <input name="nome" type="text" value="${service.nome || ""}" required></label>
            <label>Categoria
                <select name="categoria">
                    ${["tagliando", "cambio olio", "cambio gomme", "freni", "diagnosi", "revisione", "carrozzeria", "elettrauto", "aria condizionata", "batteria", "soccorso stradale", "altro"].map((category) => `
                        <option value="${category}" ${service.categoria === category ? "selected" : ""}>${category}</option>
                    `).join("")}
                </select>
            </label>
            <label>Durata minuti <input name="durataMinuti" type="number" min="15" value="${service.durataMinuti || 60}"></label>
            <label>Prezzo da <input name="prezzoDa" type="number" min="0" step="0.01" value="${service.prezzoDa || 0}"></label>
            <label>Modalita
                <select name="bookingMode">
                    <option value="REQUEST" ${service.bookingMode !== "INSTANT" ? "selected" : ""}>Richiesta</option>
                    <option value="INSTANT" ${service.bookingMode === "INSTANT" ? "selected" : ""}>Immediata</option>
                </select>
            </label>
            <label>Preparazione minuti <input name="preparationMinutes" type="number" min="0" value="${service.preparationMinutes || 0}"></label>
            <label>Capacita occupata <input name="capacityRequired" type="number" min="1" value="${service.capacityRequired || 1}"></label>
            <label class="checkbox-row"><input name="attivo" type="checkbox" ${service.attivo !== false ? "checked" : ""}><span>Servizio attivo</span></label>
            <label class="wide">Descrizione <textarea name="descrizione" rows="2">${service.descrizione || ""}</textarea></label>
        </article>
    `;
}

function readServicesEditor() {
    return Array.from(document.querySelectorAll(".service-editor")).map((row) => ({
        nome: row.querySelector('[name="nome"]').value.trim(),
        categoria: row.querySelector('[name="categoria"]').value,
        durataMinuti: Number(row.querySelector('[name="durataMinuti"]').value),
        prezzoDa: Number(row.querySelector('[name="prezzoDa"]').value),
        bookingMode: row.querySelector('[name="bookingMode"]').value,
        preparationMinutes: Number(row.querySelector('[name="preparationMinutes"]').value),
        capacityRequired: Number(row.querySelector('[name="capacityRequired"]').value),
        attivo: row.querySelector('[name="attivo"]').checked,
        descrizione: row.querySelector('[name="descrizione"]').value.trim()
    })).filter((service) => service.nome);
}

async function bindWorkshopSettings(workshopId) {
    const agendaForm = document.getElementById("agendaForm");
    const blockForm = document.getElementById("calendarBlockForm");
    const servicesForm = document.getElementById("servicesForm");
    const servicesEditor = document.getElementById("servicesEditor");

    if (!agendaForm || !servicesForm) {
        return;
    }

    try {
        const agenda = await api.getWorkshopAgenda(workshopId);
        Object.entries(agenda.settings || {}).forEach(([key, value]) => {
            if (agendaForm.elements[key] && typeof value !== "object") {
                agendaForm.elements[key].value = value;
            }
        });
        const services = await api.getWorkshopServices(workshopId);
        servicesEditor.innerHTML = services.map(serviceEditorRow).join("");
    } catch (err) {
        servicesEditor.innerHTML = serviceEditorRow({}, 0);
    }

    document.getElementById("addServiceBtn")?.addEventListener("click", () => {
        servicesEditor.insertAdjacentHTML("beforeend", serviceEditorRow({}, servicesEditor.children.length));
    });

    agendaForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("agendaMessage");
        const data = Object.fromEntries(new FormData(agendaForm).entries());

        await api.saveWorkshopAgenda(workshopId, {
            slotIntervalMinutes: Number(data.slotIntervalMinutes),
            minAdvanceHours: Number(data.minAdvanceHours),
            maxFutureDays: Number(data.maxFutureDays),
            preparationMinutes: Number(data.preparationMinutes),
            concurrentCapacity: Number(data.concurrentCapacity)
        });
        message.textContent = "Agenda salvata.";
    });

    blockForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("blockMessage");
        const data = Object.fromEntries(new FormData(blockForm).entries());

        await api.createCalendarBlock(workshopId, {
            ...data,
            startAt: new Date(data.startAt).toISOString(),
            endAt: new Date(data.endAt).toISOString(),
            capacityBlocked: Number(data.capacityBlocked)
        });
        message.textContent = "Blocco aggiunto. Gli utenti vedranno lo slot come non disponibile.";
        blockForm.reset();
    });

    servicesForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.getElementById("servicesMessage");
        await api.saveWorkshopServices(workshopId, readServicesEditor());
        message.textContent = "Servizi salvati.";
    });
}

async function loadMechanicDashboard() {
    const container = document.getElementById("mechanicBookings");

    if (!container) {
        return;
    }

    const session = getSession();
    const greeting = document.getElementById("mechanicGreeting");
    const filter = document.getElementById("bookingStatusFilter");

    if (!session || session.tipo !== "officina") {
        renderAccessGate(container, "officina");
        return;
    }

    const workshopId = await getWorkshopId(session);

    if (greeting && session.nome) {
        greeting.textContent = `${session.nome}: prenotazioni`;
    }

    const render = async () => {
        const bookings = await api.getPrenotazioni({ officinaId: workshopId });
        const filtered = filter.value
            ? bookings.filter((booking) => booking.status === filter.value)
            : bookings;

        container.innerHTML = filtered.length
            ? filtered.map((booking) => renderBookingCard(booking, "officina")).join("")
            : `<p class="empty-state">Nessuna prenotazione da mostrare.</p>`;
    };

    container.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-booking-id]");

        if (!button) {
            return;
        }

        if (button.dataset.action === "reschedule") {
            const date = window.prompt("Nuova data (AAAA-MM-GG)");
            const time = window.prompt("Nuovo orario (HH:MM)");
            const note = window.prompt("Nota per il cliente") || "";

            if (date && time) {
                await api.proposeReschedule(button.dataset.bookingId, { date, time, note });
            }
        } else {
            await api.bookingAction(button.dataset.bookingId, button.dataset.action, {
                actor: button.dataset.actor || "officina"
            });
        }

        render();
    });

    filter.addEventListener("change", render);
    bindWorkshopSettings(workshopId);
    render();
}

initFieldHelpPopovers();
loadUserDashboard();
loadMechanicDashboard();
