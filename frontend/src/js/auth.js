function getAuthPayload(form) {
    const formData = new FormData(form);
    const type = form.dataset.type || "";

    return {
        nome: formData.get("nome"),
        citta: formData.get("citta"),
        indirizzo: formData.get("indirizzo"),
        servizi: formData.get("servizi"),
        email: formData.get("email"),
        password: formData.get("password"),
        tipo: type.includes("officina") ? "officina" : "utente"
    };
}

function loadAuthForms() {
    const forms = document.querySelectorAll(".auth-form");

    forms.forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const type = form.dataset.type || "";
            const message = form.parentElement.querySelector(".form-message");
            const endpoint = type.includes("login") ? "/auth/login" : "/auth/register";

            message.textContent = "";

            try {
                const result = await api.request(endpoint, {
                    method: "POST",
                    body: JSON.stringify(getAuthPayload(form))
                });
                const payload = getAuthPayload(form);
                let session = result.utente || payload;

                if (!type.includes("login") && session.tipo === "officina") {
                    const officina = await api.request("/officine", {
                        method: "POST",
                        body: JSON.stringify({
                            nome: payload.nome,
                            citta: payload.citta,
                            indirizzo: payload.indirizzo,
                            servizi: String(payload.servizi || "")
                                .split(",")
                                .map((servizio) => servizio.trim())
                                .filter(Boolean),
                            descrizione: "Profilo officina in aggiornamento."
                        })
                    });

                    session = {
                        ...session,
                        officinaId: officina.id
                    };
                }

                localStorage.setItem("carcheckUser", JSON.stringify(session));

                message.textContent = type.includes("login")
                    ? "Accesso effettuato."
                    : "Account creato correttamente.";
                form.reset();

                window.location.href = session.tipo === "officina"
                    ? "../pages/dashboardOfficina.html"
                    : "../pages/dashboardUser.html";
            } catch (err) {
                message.textContent = "Operazione non riuscita. Controlla che il backend sia attivo.";
            }
        });
    });
}

loadAuthForms();
