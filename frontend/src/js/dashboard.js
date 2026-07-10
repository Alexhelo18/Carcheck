function getSession() {
    return JSON.parse(localStorage.getItem("carcheckUser") || "null");
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "Data da definire";
    }

    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date(dateValue));
}

function renderBookingCard(prenotazione, mode) {
    const actions = mode === "officina" ? `
        <div class="booking-actions">
            <button type="button" data-booking-id="${prenotazione.id}" data-status="confermata">Conferma</button>
            <button type="button" data-booking-id="${prenotazione.id}" data-status="rifiutata" class="danger-btn">Rifiuta</button>
        </div>
    ` : "";

    return `
        <article class="booking-item">
            <div>
                <span class="status-pill">${prenotazione.stato}</span>
                <h3>${prenotazione.servizio}</h3>
                <p>${formatDate(prenotazione.data)} alle ${prenotazione.orario}</p>
                <p class="muted">${prenotazione.officinaNome || "Officina selezionata"}</p>
            </div>
            <div>
                <strong>${prenotazione.nome}</strong>
                <p class="muted">${prenotazione.email}</p>
                ${prenotazione.note ? `<p>${prenotazione.note}</p>` : ""}
            </div>
            ${actions}
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
    const bookedDays = new Set(bookings.map((booking) => Number(String(booking.data || "").split("-")[2])));
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

async function loadUserDashboard() {
    const container = document.getElementById("userBookings");

    if (!container) {
        return;
    }

    const session = getSession();
    const greeting = document.getElementById("userGreeting");
    const nextBookingBtn = document.getElementById("nextBookingBtn");

    if (greeting && session && session.nome) {
        greeting.textContent = `Ciao ${session.nome}`;
    }

    if (nextBookingBtn) {
        nextBookingBtn.addEventListener("click", () => {
            window.location.href = "../pages/ricerca.html";
        });
    }

    if (!session || session.tipo !== "utente") {
        container.innerHTML = `<p class="empty-state">Accedi come utente per vedere calendario e prenotazioni.</p>`;
        renderCalendar([]);
        return;
    }

    const bookings = await api.getPrenotazioni({ email: session.email });
    renderCalendar(bookings);

    container.innerHTML = bookings.length
        ? bookings.map((booking) => renderBookingCard(booking, "utente")).join("")
        : `<p class="empty-state">Non hai ancora prenotazioni. Cerca un'officina e scegli un orario.</p>`;
}

async function loadMechanicDashboard() {
    const container = document.getElementById("mechanicBookings");

    if (!container) {
        return;
    }

    const session = getSession();
    const greeting = document.getElementById("mechanicGreeting");
    const filter = document.getElementById("bookingStatusFilter");

    if (greeting && session && session.nome) {
        greeting.textContent = `${session.nome}: prenotazioni`;
    }

    if (!session || session.tipo !== "officina") {
        container.innerHTML = `<p class="empty-state">Accedi come officina per vedere le prenotazioni ricevute.</p>`;
        return;
    }

    const render = async () => {
        const filters = session.officinaId ? { officinaId: session.officinaId } : {};
        const bookings = await api.getPrenotazioni(filters);
        const filtered = filter.value
            ? bookings.filter((booking) => booking.stato === filter.value)
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

        await api.updatePrenotazione(button.dataset.bookingId, {
            stato: button.dataset.status
        });
        render();
    });

    filter.addEventListener("change", render);
    render();
}

loadUserDashboard();
loadMechanicDashboard();
