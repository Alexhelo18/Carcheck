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
            return booking.reviewed
                ? `<span class="review-completed">Recensione inviata</span>`
                : `<button type="button" data-booking-id="${booking.id}" data-review-toggle aria-expanded="false" aria-controls="review-panel-${booking.id}">Lascia recensione</button>`;
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
        IN_PROGRESS: [["complete", "Lavorazione completata", ""]],
        RESCHEDULE_PROPOSED: [["cancel", "Annulla", "danger-btn"]]
    };

    return (actions[booking.status] || [])
        .map(([action, label, className]) => {
            const panelId = action === "reschedule"
                ? `reschedule-panel-${booking.id}`
                : action === "cancel" && booking.status === "CONFIRMED"
                    ? `cancellation-panel-${booking.id}`
                    : "";
            const disclosure = panelId ? `aria-expanded="false" aria-controls="${panelId}"` : "";
            return `<button type="button" data-booking-id="${booking.id}" data-action="${action}" data-actor="officina" class="${className}" ${disclosure}>${label}</button>`;
        })
        .join("");
}

function renderBookingCard(booking, mode) {
    const vehicle = booking.vehicle || {};
    const actions = bookingActions(booking, mode);
    const reschedulePanel = mode === "officina" && booking.status === "PENDING" ? `
        <form class="reschedule-panel" id="reschedule-panel-${booking.id}" data-reschedule-form data-booking-id="${booking.id}" hidden>
            <div class="reschedule-panel-heading">
                <div>
                    <p class="eyebrow">Proposta alternativa</p>
                    <h4>Modifica data e orario</h4>
                </div>
                <button type="button" class="reschedule-close" data-cancel-reschedule data-booking-id="${booking.id}" aria-label="Chiudi proposta di modifica">Chiudi</button>
            </div>
            <label>Nuova data
                <input name="date" type="date" required>
            </label>
            <label>Nuovo orario
                <input name="time" type="time" required>
            </label>
            <label class="reschedule-note">Nota per il cliente
                <textarea name="note" rows="3" placeholder="Aggiungi un messaggio facoltativo"></textarea>
            </label>
            <div class="reschedule-form-actions">
                <button type="button" class="btn-secondary" data-cancel-reschedule data-booking-id="${booking.id}">Annulla</button>
                <button type="submit">Invia proposta</button>
            </div>
            <p class="form-message" aria-live="polite"></p>
        </form>
    ` : "";
    const cancellationPanel = mode === "officina" && booking.status === "CONFIRMED" ? `
        <form class="reschedule-panel cancellation-panel" id="cancellation-panel-${booking.id}" data-cancellation-form data-booking-id="${booking.id}" hidden>
            <div class="reschedule-panel-heading">
                <div>
                    <p class="eyebrow">Annullamento officina</p>
                    <h4>Indica il motivo dell'annullamento</h4>
                </div>
                <button type="button" class="reschedule-close" data-close-booking-panel aria-label="Chiudi annullamento">Chiudi</button>
            </div>
            <label class="reschedule-note">Motivo per il cliente
                <textarea name="reason" rows="3" minlength="10" required placeholder="Spiega perché non puoi più gestire questa prenotazione"></textarea>
            </label>
            <div class="reschedule-form-actions">
                <button type="button" class="btn-secondary" data-close-booking-panel>Annulla</button>
                <button type="submit" class="danger-btn">Conferma annullamento</button>
            </div>
            <p class="form-message" aria-live="polite"></p>
        </form>
    ` : "";
    const reviewPanel = mode === "utente" && booking.status === "COMPLETED" && !booking.reviewed ? `
        <form class="reschedule-panel review-panel" id="review-panel-${booking.id}" data-review-form data-booking-id="${booking.id}" data-workshop-id="${booking.workshopId || booking.officinaId}" hidden>
            <div class="reschedule-panel-heading">
                <div>
                    <p class="eyebrow">La tua esperienza</p>
                    <h4>Recensisci il lavoro completato</h4>
                </div>
                <button type="button" class="reschedule-close" data-close-review aria-label="Chiudi recensione">Chiudi</button>
            </div>
            <label>Valutazione
                <select name="voto" required>
                    <option value="">Seleziona un voto</option>
                    <option value="5">5 - Eccellente</option>
                    <option value="4">4 - Molto buona</option>
                    <option value="3">3 - Buona</option>
                    <option value="2">2 - Insufficiente</option>
                    <option value="1">1 - Pessima</option>
                </select>
            </label>
            <label class="reschedule-note">Recensione
                <textarea name="testo" rows="4" minlength="10" required placeholder="Racconta puntualità, chiarezza e qualità del servizio"></textarea>
            </label>
            <div class="reschedule-form-actions">
                <button type="button" class="btn-secondary" data-close-review>Annulla</button>
                <button type="submit">Pubblica recensione</button>
            </div>
            <p class="form-message" aria-live="polite"></p>
        </form>
    ` : "";

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
                ${booking.cancellationReason ? `<p class="cancellation-reason"><strong>Motivo annullamento:</strong> ${booking.cancellationReason}</p>` : ""}
            </div>
            ${actions ? `<div class="booking-actions">${actions}</div>` : ""}
            ${reschedulePanel}
            ${cancellationPanel}
            ${reviewPanel}
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
        const closeReview = event.target.closest("[data-close-review]");

        if (closeReview) {
            const panel = closeReview.closest("[data-review-form]");
            const toggle = container.querySelector(`[aria-controls="${panel.id}"]`);
            panel.hidden = true;
            panel.classList.remove("open");
            toggle?.setAttribute("aria-expanded", "false");
            toggle?.focus();
            return;
        }

        const button = event.target.closest("button[data-booking-id]");

        if (!button) {
            return;
        }

        if (button.hasAttribute("data-review-toggle")) {
            const panel = document.getElementById(button.getAttribute("aria-controls"));
            const shouldOpen = button.getAttribute("aria-expanded") !== "true";

            container.querySelectorAll('[data-review-toggle][aria-expanded="true"]').forEach((openButton) => {
                const openPanel = document.getElementById(openButton.getAttribute("aria-controls"));
                openButton.setAttribute("aria-expanded", "false");
                openPanel?.classList.remove("open");
                if (openPanel) openPanel.hidden = true;
            });

            button.setAttribute("aria-expanded", String(shouldOpen));
            panel.hidden = !shouldOpen;
            panel.classList.toggle("open", shouldOpen);
            if (shouldOpen) panel.querySelector('[name="voto"]')?.focus();
            return;
        } else if (button.dataset.rescheduleAction) {
            await api.respondReschedule(button.dataset.bookingId, button.dataset.proposalId, button.dataset.rescheduleAction);
        } else {
            await api.bookingAction(button.dataset.bookingId, button.dataset.action, { actor: "utente" });
        }

        render();
    });

    container.addEventListener("submit", async (event) => {
        const form = event.target.closest("[data-review-form]");

        if (!form) return;

        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const submitButton = form.querySelector('[type="submit"]');
        const message = form.querySelector(".form-message");

        submitButton.disabled = true;
        message.textContent = "Pubblicazione in corso...";

        try {
            await api.createReview({
                bookingId: Number(form.dataset.bookingId),
                officinaId: Number(form.dataset.workshopId),
                email: session.email,
                autore: session.nome || session.email,
                voto: Number(data.voto),
                testo: data.testo.trim()
            });
            await render();
        } catch (err) {
            message.textContent = err.message || "Non è stato possibile pubblicare la recensione.";
            submitButton.disabled = false;
        }
    });

    filter?.addEventListener("change", render);
    render();
}

function serviceEditorRow(service = {}, index = 0) {
    return `
        <article class="service-editor" data-service-index="${index}">
            <div class="service-editor-heading">
                <h3>Servizio ${index + 1}</h3>
                <button type="button" class="service-delete-button" data-delete-service aria-label="Elimina servizio ${index + 1}">Elimina servizio</button>
            </div>
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

function refreshServiceEditorLabels(container) {
    Array.from(container.querySelectorAll(".service-editor")).forEach((row, index) => {
        row.dataset.serviceIndex = index;
        row.querySelector(".service-editor-heading h3").textContent = `Servizio ${index + 1}`;
        row.querySelector("[data-delete-service]").setAttribute("aria-label", `Elimina servizio ${index + 1}`);
    });
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
        refreshServiceEditorLabels(servicesEditor);
    } catch (err) {
        servicesEditor.innerHTML = serviceEditorRow({}, 0);
    }

    document.getElementById("addServiceBtn")?.addEventListener("click", () => {
        servicesEditor.insertAdjacentHTML("beforeend", serviceEditorRow({}, servicesEditor.children.length));
        refreshServiceEditorLabels(servicesEditor);
    });

    servicesEditor.addEventListener("click", (event) => {
        const deleteButton = event.target.closest("[data-delete-service]");

        if (!deleteButton) return;

        deleteButton.closest(".service-editor")?.remove();
        refreshServiceEditorLabels(servicesEditor);
        document.getElementById("servicesMessage").textContent = "Servizio rimosso dall'elenco. Premi Salva servizi per confermare.";
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
        const cancelButton = event.target.closest("[data-cancel-reschedule], [data-close-booking-panel]");

        if (cancelButton) {
            const panel = cancelButton.closest(".reschedule-panel");
            const toggle = container.querySelector(`[aria-controls="${panel.id}"]`);
            panel.hidden = true;
            panel.classList.remove("open");
            toggle?.setAttribute("aria-expanded", "false");
            toggle?.focus();
            return;
        }

        const button = event.target.closest("button[data-booking-id]");

        if (!button) {
            return;
        }

        if (button.dataset.action === "reschedule" || (button.dataset.action === "cancel" && button.hasAttribute("aria-controls"))) {
            const panel = document.getElementById(button.getAttribute("aria-controls"));
            const shouldOpen = button.getAttribute("aria-expanded") !== "true";

            container.querySelectorAll('.booking-actions [aria-expanded="true"]').forEach((openButton) => {
                const openPanel = document.getElementById(openButton.getAttribute("aria-controls"));
                openButton.setAttribute("aria-expanded", "false");
                openPanel?.classList.remove("open");
                if (openPanel) openPanel.hidden = true;
            });

            button.setAttribute("aria-expanded", String(shouldOpen));
            panel.hidden = !shouldOpen;
            panel.classList.toggle("open", shouldOpen);
            if (shouldOpen) panel.querySelector('[name="date"]')?.focus();
            return;
        } else {
            await api.bookingAction(button.dataset.bookingId, button.dataset.action, {
                actor: button.dataset.actor || "officina"
            });
        }

        render();
    });

    container.addEventListener("submit", async (event) => {
        const form = event.target.closest("[data-reschedule-form], [data-cancellation-form]");

        if (!form) return;

        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const submitButton = form.querySelector('[type="submit"]');
        const message = form.querySelector(".form-message");
        const isCancellation = form.hasAttribute("data-cancellation-form");

        submitButton.disabled = true;
        message.textContent = isCancellation ? "Annullamento in corso..." : "Invio della proposta in corso...";

        try {
            if (isCancellation) {
                await api.bookingAction(form.dataset.bookingId, "cancel", {
                    actor: "officina",
                    reason: data.reason.trim()
                });
            } else {
                await api.proposeReschedule(form.dataset.bookingId, {
                    date: data.date,
                    time: data.time,
                    note: data.note || ""
                });
            }
            await render();
        } catch (err) {
            message.textContent = err.message || "Non è stato possibile inviare la proposta.";
            submitButton.disabled = false;
        }
    });

    filter.addEventListener("change", render);
    bindWorkshopSettings(workshopId);
    render();
}

initFieldHelpPopovers();
loadUserDashboard();
loadMechanicDashboard();
