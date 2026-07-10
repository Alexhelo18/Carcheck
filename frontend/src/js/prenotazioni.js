async function loadBookingPage() {
    const form = document.getElementById("bookingForm");

    if (!form) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const officinaId = params.get("id");
    const officina = officinaId ? await api.getOfficinaById(officinaId) : null;
    const title = document.getElementById("bookingTitle");
    const message = document.getElementById("bookingMessage");

    if (officina) {
        title.textContent = `Prenota da ${officina.nome}`;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.textContent = "";

        const formData = new FormData(form);
        const prenotazione = {
            officinaId: Number(officinaId),
            nome: formData.get("nome"),
            email: formData.get("email"),
            servizio: formData.get("servizio"),
            data: formData.get("data"),
            orario: formData.get("orario"),
            note: formData.get("note")
        };

        try {
            await api.createPrenotazione(prenotazione);
            message.textContent = "Prenotazione inviata. Riceverai una conferma dall'officina.";
            form.reset();
        } catch (err) {
            message.textContent = "Impossibile inviare la prenotazione. Controlla che il backend sia attivo.";
        }
    });
}

loadBookingPage();
