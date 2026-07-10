function getAuthPayload(form) {
    const formData = new FormData(form);
    const type = form.dataset.type || "";

    return {
        nome: formData.get("nome"),
        citta: formData.get("citta"),
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
                await api.request(endpoint, {
                    method: "POST",
                    body: JSON.stringify(getAuthPayload(form))
                });

                message.textContent = type.includes("login")
                    ? "Accesso effettuato."
                    : "Account creato correttamente.";
                form.reset();
            } catch (err) {
                message.textContent = "Operazione non riuscita. Controlla che il backend sia attivo.";
            }
        });
    });
}

loadAuthForms();
