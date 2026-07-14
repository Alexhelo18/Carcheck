function getAuthPayload(form) {
    const formData = new FormData(form);
    const type = form.dataset.type || "";
    const isMechanic = type.includes("officina");
    const specializzazioni = formData.getAll("specializzazioni");
    const serviziExtra = String(formData.get("servizi") || "")
        .split(",")
        .map((servizio) => servizio.trim())
        .filter(Boolean);
    const servizi = [...new Set([...specializzazioni, ...serviziExtra])];

    return {
        nome: isMechanic ? formData.get("nomeOfficina") : formData.get("nome"),
        citta: formData.get("citta"),
        indirizzo: formData.get("indirizzo"),
        servizi,
        email: formData.get("email"),
        password: formData.get("password"),
        tipo: isMechanic ? "officina" : "utente"
    };
}

function setRole(form, role) {
    const mode = form.dataset.mode || (form.dataset.type || "").split(" ")[0];
    const isMechanic = role === "officina";
    const card = form.closest(".booking-card");
    const eyebrow = card.querySelector("#authEyebrow");
    const title = card.querySelector("#authTitle");
    const mechanicFields = form.querySelectorAll(".mechanic-field");
    const userFields = form.querySelectorAll(".user-field");

    form.dataset.type = `${mode} ${role}`;

    if (eyebrow) {
        eyebrow.textContent = isMechanic ? "Area officina" : mode === "login" ? "Area utente" : "Nuovo account";
    }

    if (title) {
        title.textContent = mode === "login"
            ? isMechanic ? "Accedi come officina" : "Accedi"
            : isMechanic ? "Registra la tua officina" : "Registrati";
    }

    mechanicFields.forEach((field) => {
        field.classList.toggle("hidden", !isMechanic);
        field.querySelectorAll("input").forEach((input) => {
            input.required = isMechanic && ["nomeOfficina", "citta"].includes(input.name);
        });
    });

    userFields.forEach((field) => {
        field.classList.toggle("hidden", isMechanic);
        field.querySelectorAll("input").forEach((input) => {
            input.required = !isMechanic;
        });
    });
}

function loadAuthSwitches() {
    document.querySelectorAll("[data-auth-switch]").forEach((switcher) => {
        const card = switcher.closest(".booking-card");
        const form = card.querySelector(".auth-form");

        switcher.addEventListener("click", (event) => {
            const button = event.target.closest("[data-role]");

            if (!button) {
                return;
            }

            switcher.querySelectorAll("[data-role]").forEach((item) => {
                item.classList.toggle("active", item === button);
            });

            setRole(form, button.dataset.role);
        });
    });
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
                            servizi: payload.servizi,
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

loadAuthSwitches();
loadAuthForms();
