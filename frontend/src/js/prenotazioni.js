const bookingState = {
    step: 1,
    maxStep: 4,
    workshop: null,
    services: [],
    selectedService: null,
    selectedSlot: null
};

function getSession() {
    return JSON.parse(localStorage.getItem("carcheckUser") || "null");
}

function setFieldError(form, name, message) {
    const error = form.querySelector(`[data-error-for="${name}"]`);

    if (error) {
        error.textContent = message || "";
    }
}

function clearBookingErrors(form) {
    form.querySelectorAll(".field-error").forEach((error) => {
        error.textContent = "";
    });
}

function requireField(form, name, message) {
    const field = form.elements[name];
    const value = field?.type === "checkbox" ? field.checked : String(field?.value || "").trim();

    if (!value) {
        setFieldError(form, name, message);
        return false;
    }

    return true;
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function updateProgress() {
    document.querySelectorAll(".booking-progress span").forEach((item, index) => {
        item.classList.toggle("active", index + 1 <= bookingState.step);
    });

    document.querySelectorAll(".booking-step").forEach((step) => {
        step.classList.toggle("active", Number(step.dataset.step) === bookingState.step);
    });

    document.getElementById("bookingBack").hidden = bookingState.step === 1;
    document.getElementById("bookingNext").classList.toggle("hidden", bookingState.step === bookingState.maxStep);
    document.getElementById("bookingSubmit").classList.toggle("hidden", bookingState.step !== bookingState.maxStep);
}

function getSelectedService(form) {
    return bookingState.services.find((service) => String(service.id) === String(form.elements.serviceId.value));
}

function validateStep(form) {
    clearBookingErrors(form);

    if (bookingState.step === 1) {
        const email = String(form.elements.email.value || "").trim();
        const valid = [
            requireField(form, "nome", "Inserisci nome e cognome."),
            requireField(form, "email", "Inserisci l'email."),
            requireField(form, "serviceId", "Seleziona un servizio.")
        ].every(Boolean);

        if (email && !isValidEmail(email)) {
            setFieldError(form, "email", "Inserisci un'email valida.");
            return false;
        }

        bookingState.selectedService = getSelectedService(form);
        return valid;
    }

    if (bookingState.step === 2) {
        return [
            requireField(form, "vehicleBrand", "Inserisci la marca."),
            requireField(form, "vehicleModel", "Inserisci il modello."),
            requireField(form, "vehicleYear", "Inserisci l'anno."),
            requireField(form, "vehiclePlate", "Inserisci la targa."),
            requireField(form, "vehicleFuel", "Seleziona l'alimentazione."),
            requireField(form, "vehicleMileage", "Inserisci il chilometraggio.")
        ].every(Boolean);
    }

    if (bookingState.step === 3) {
        return [
            requireField(form, "data", "Seleziona una data."),
            requireField(form, "orario", "Seleziona un orario disponibile.")
        ].every(Boolean);
    }

    return requireField(form, "vehicleConsent", "Devi accettare la condivisione dei dati veicolo.");
}

function serviceDescription(service) {
    if (!service) {
        return "Seleziona un servizio per vedere durata, prezzo e modalita.";
    }

    const mode = service.bookingMode === "INSTANT" ? "conferma immediata" : "richiesta con conferma officina";
    return `${service.durataMinuti} min · da ${Number(service.prezzoDa || 0).toFixed(2)} € · ${mode}`;
}

function renderServices(form) {
    const select = form.elements.serviceId;
    select.innerHTML = `<option value="">Seleziona servizio</option>${bookingState.services.map((service) => `
        <option value="${service.id}">${service.nome}</option>
    `).join("")}`;

    select.addEventListener("change", () => {
        bookingState.selectedService = getSelectedService(form);
        document.getElementById("serviceHint").textContent = serviceDescription(bookingState.selectedService);
        form.elements.orario.value = "";
        bookingState.selectedSlot = null;
        document.getElementById("slotList").innerHTML = "";
    });
}

async function loadSlots(form) {
    const slotList = document.getElementById("slotList");
    const serviceId = form.elements.serviceId.value;
    const date = form.elements.data.value;

    form.elements.orario.value = "";
    bookingState.selectedSlot = null;

    if (!serviceId || !date || !bookingState.workshop) {
        slotList.innerHTML = `<p class="empty-state">Seleziona servizio e data per vedere gli orari.</p>`;
        return;
    }

    slotList.innerHTML = `<p class="empty-state">Caricamento orari...</p>`;

    try {
        const result = await api.getAvailability(bookingState.workshop.id, serviceId, date);
        const slots = result.slots || [];

        if (!slots.length) {
            slotList.innerHTML = `<p class="empty-state">Nessun orario disponibile per questa data.</p>`;
            return;
        }

        slotList.innerHTML = slots.map((slot) => `
            <button type="button" class="slot-button" data-time="${slot.time}" data-start="${slot.startAt}" data-end="${slot.endAt}">
                ${slot.time}
            </button>
        `).join("");
    } catch (err) {
        slotList.innerHTML = `<p class="empty-state">L'officina non ha ancora configurato le proprie disponibilita.</p>`;
    }
}

function bindSlotSelection(form) {
    document.getElementById("slotList").addEventListener("click", (event) => {
        const button = event.target.closest(".slot-button");

        if (!button) {
            return;
        }

        document.querySelectorAll(".slot-button").forEach((slot) => slot.classList.remove("selected"));
        button.classList.add("selected");
        bookingState.selectedSlot = {
            time: button.dataset.time,
            startAt: button.dataset.start,
            endAt: button.dataset.end
        };
        form.elements.orario.value = button.dataset.time;
        setFieldError(form, "orario", "");
    });
}

function getVehicle(form) {
    return {
        marca: form.elements.vehicleBrand.value.trim(),
        modello: form.elements.vehicleModel.value.trim(),
        anno: Number(form.elements.vehicleYear.value),
        targa: form.elements.vehiclePlate.value.trim().toUpperCase(),
        alimentazione: form.elements.vehicleFuel.value,
        chilometraggio: Number(form.elements.vehicleMileage.value),
        versione: form.elements.vehicleVersion.value.trim()
    };
}

function renderSummary(form) {
    const summary = document.getElementById("bookingSummary");
    const service = bookingState.selectedService || getSelectedService(form);
    const vehicle = getVehicle(form);
    const date = form.elements.data.value;
    const time = form.elements.orario.value;
    const mode = service?.bookingMode === "INSTANT" ? "Prenotazione immediata" : "Richiesta da confermare";

    summary.innerHTML = `
        <h3>Riepilogo</h3>
        <dl>
            <div><dt>Officina</dt><dd>${bookingState.workshop?.nome || "Officina selezionata"}</dd></div>
            <div><dt>Indirizzo</dt><dd>${bookingState.workshop?.indirizzo || "Indirizzo in aggiornamento"}</dd></div>
            <div><dt>Servizio</dt><dd>${service?.nome || ""}</dd></div>
            <div><dt>Veicolo</dt><dd>${vehicle.marca} ${vehicle.modello} · ${vehicle.targa}</dd></div>
            <div><dt>Data e ora</dt><dd>${date} alle ${time}</dd></div>
            <div><dt>Durata stimata</dt><dd>${service?.durataMinuti || 0} minuti</dd></div>
            <div><dt>Prezzo indicativo</dt><dd>Da ${Number(service?.prezzoDa || 0).toFixed(2)} €</dd></div>
            <div><dt>Modalita</dt><dd>${mode}</dd></div>
            <div><dt>Cancellazione</dt><dd>Secondo le condizioni dell'officina e della piattaforma.</dd></div>
        </dl>
    `;
}

function buildBookingPayload(form) {
    const session = getSession();
    const service = bookingState.selectedService || getSelectedService(form);

    return {
        workshopId: bookingState.workshop.id,
        serviceId: service.id,
        nome: form.elements.nome.value.trim(),
        email: form.elements.email.value.trim(),
        userId: session?.id || null,
        vehicle: getVehicle(form),
        date: form.elements.data.value,
        time: form.elements.orario.value,
        customerNotes: form.elements.customerNotes.value.trim(),
        warningLights: form.elements.warningLights.value.trim(),
        note: form.elements.extraNotes.value.trim()
    };
}

async function loadBookingPage() {
    const form = document.getElementById("bookingForm");

    if (!form) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const workshopId = params.get("id");
    const title = document.getElementById("bookingTitle");
    const message = document.getElementById("bookingMessage");
    const session = getSession();

    if (!workshopId) {
        message.textContent = "Seleziona un'officina prima di prenotare.";
        return;
    }

    try {
        bookingState.workshop = await api.getOfficinaById(workshopId);
        bookingState.services = await api.getWorkshopServices(workshopId);
    } catch (err) {
        message.textContent = "Impossibile caricare i dati dell'officina.";
        return;
    }

    if (bookingState.workshop) {
        title.textContent = `Prenota da ${bookingState.workshop.nome}`;
    }

    if (session && session.tipo === "utente") {
        form.elements.nome.value = session.nome || "";
        form.elements.email.value = session.email || "";
    }

    renderServices(form);
    bindSlotSelection(form);
    updateProgress();

    form.elements.data.addEventListener("change", () => loadSlots(form));
    form.elements.serviceId.addEventListener("change", () => {
        if (form.elements.data.value) {
            loadSlots(form);
        }
    });

    document.getElementById("bookingNext").addEventListener("click", async () => {
        if (!validateStep(form)) {
            return;
        }

        if (bookingState.step === 3) {
            renderSummary(form);
        }

        bookingState.step = Math.min(bookingState.step + 1, bookingState.maxStep);
        updateProgress();
    });

    document.getElementById("bookingBack").addEventListener("click", () => {
        bookingState.step = Math.max(bookingState.step - 1, 1);
        updateProgress();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.textContent = "";

        if (!validateStep(form)) {
            return;
        }

        const submit = document.getElementById("bookingSubmit");
        submit.disabled = true;
        submit.textContent = "Invio in corso...";

        try {
            const result = await api.createPrenotazione(buildBookingPayload(form));
            const booking = result.booking || result.prenotazione;
            message.textContent = booking.status === "CONFIRMED"
                ? "Prenotazione confermata. La trovi nella tua area utente."
                : "Richiesta inviata. L'officina potra confermare, rifiutare o proporre una modifica.";
            form.reset();
            bookingState.step = 1;
            bookingState.selectedSlot = null;
            document.getElementById("slotList").innerHTML = "";
            document.getElementById("bookingSummary").innerHTML = "";
            updateProgress();
        } catch (err) {
            message.textContent = err.message || "Questo orario non e piu disponibile. Seleziona un altro orario.";
        } finally {
            submit.disabled = false;
            submit.textContent = "Conferma prenotazione";
        }
    });
}

loadBookingPage();
