const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;
const ITALIAN_VAT_RE = /^\d{11}$/;
const ZIP_RE = /^\d{5}$/;

function getFormData(form) {
    return new FormData(form);
}

function getAuthPayload(form) {
    const formData = getFormData(form);
    const type = form.dataset.type || "";
    const isMechanic = type.includes("officina");
    const serviziOfferti = [...formData.getAll("specializzazioni"), ...formData.getAll("serviziOfferti")];
    const altroServizio = String(formData.get("altroServizio") || "").trim();
    const servizi = altroServizio
        ? [...new Set([...serviziOfferti.filter((servizio) => servizio !== "Altro"), altroServizio])]
        : serviziOfferti.filter((servizio) => servizio !== "Altro");
    const nomeUtente = [formData.get("nome"), formData.get("cognome")]
        .filter(Boolean)
        .join(" ");

    return {
        nome: isMechanic ? formData.get("nomeOfficina") || formData.get("nome") : nomeUtente,
        nomeProfilo: formData.get("nome") || formData.get("ownerNome"),
        cognome: formData.get("cognome") || formData.get("ownerCognome"),
        email: isMechanic ? formData.get("ownerEmail") || formData.get("email") : formData.get("email"),
        telefono: isMechanic ? formData.get("ownerTelefono") || formData.get("telefono") : formData.get("telefono"),
        password: isMechanic ? formData.get("ownerPassword") || formData.get("password") : formData.get("password"),
        marketing: formData.get("marketing") === "on",
        ragioneSociale: formData.get("ragioneSociale"),
        partitaIva: formData.get("partitaIva"),
        telefonoOfficina: formData.get("telefonoOfficina"),
        via: formData.get("via"),
        cap: formData.get("cap"),
        citta: formData.get("citta"),
        provincia: formData.get("provincia"),
        nazione: "Italia",
        indirizzo: [formData.get("via"), formData.get("cap"), formData.get("citta"), formData.get("provincia"), "Italia"]
            .filter(Boolean)
            .join(", "),
        servizi,
        descrizione: formData.get("descrizione"),
        specializzazioneTipo: formData.get("specializzazioneTipo"),
        marcheSpecifiche: String(formData.get("marcheSpecifiche") || "")
            .split(",")
            .map((brand) => brand.trim())
            .filter(Boolean),
        orari: getOpeningHours(formData),
        tipo: isMechanic ? "officina" : "utente"
    };
}

async function registerUser(data) {
    return api.request("/auth/register", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

async function registerWorkshop(data) {
    const result = await api.request("/auth/register", {
        method: "POST",
        body: JSON.stringify(data)
    });
    const officina = await api.request("/officine", {
        method: "POST",
        body: JSON.stringify({
            nome: data.nome,
            ragioneSociale: data.ragioneSociale,
            partitaIva: data.partitaIva,
            telefonoOfficina: data.telefonoOfficina,
            nazione: data.nazione,
            via: data.via,
            cap: data.cap,
            citta: data.citta,
            provincia: data.provincia,
            indirizzo: data.indirizzo,
            servizi: data.servizi,
            descrizione: data.descrizione
        })
    });

    return {
        ...result,
        officina
    };
}

function sanitizeSession(data) {
    const { password, ownerPassword, ...session } = data;
    return session;
}

function getOpeningHours(formData) {
    const days = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"];

    return days.reduce((hours, day) => {
        hours[day] = {
            chiuso: formData.get(`${day}Chiuso`) === "on",
            apertura: formData.get(`${day}Apertura`) || "",
            chiusura: formData.get(`${day}Chiusura`) || ""
        };
        return hours;
    }, {});
}

function setError(form, name, message) {
    const error = form.querySelector(`[data-error-for="${name}"]`);

    if (error) {
        error.textContent = message || "";
    }
}

function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach((error) => {
        error.textContent = "";
    });
}

function requireText(form, name, label) {
    const field = form.elements[name];
    const value = String(field ? field.value : "").trim();

    if (!value) {
        setError(form, name, `${label} è obbligatorio.`);
        return false;
    }

    return true;
}

function validateEmail(form, name = "email") {
    const field = form.elements[name];
    const value = String(field ? field.value : "").trim();

    if (!EMAIL_RE.test(value)) {
        setError(form, name, "Inserisci un indirizzo email valido.");
        return false;
    }

    return true;
}

function validatePhone(form, name, label) {
    const field = form.elements[name];
    const value = String(field ? field.value : "").trim();

    if (!PHONE_RE.test(value)) {
        setError(form, name, `${label} non è valido.`);
        return false;
    }

    return true;
}

function validatePassword(form, passwordName, confirmName) {
    const password = form.elements[passwordName]?.value || "";
    const confirm = form.elements[confirmName]?.value || "";
    let valid = true;

    if (password.length < 8) {
        setError(form, passwordName, "La password deve contenere almeno 8 caratteri.");
        valid = false;
    }

    if (password !== confirm) {
        setError(form, confirmName, "Le password non coincidono.");
        valid = false;
    }

    return valid;
}

function validateRequiredCheckbox(form, name, message) {
    const field = form.elements[name];

    if (!field || !field.checked) {
        setError(form, name, message);
        return false;
    }

    return true;
}

function validateUserRegistration(form) {
    clearErrors(form);

    return [
        requireText(form, "nome", "Il nome"),
        requireText(form, "cognome", "Il cognome"),
        validateEmail(form, "email"),
        validatePhone(form, "telefono", "Il numero di telefono"),
        validatePassword(form, "password", "passwordConfirm"),
        validateRequiredCheckbox(form, "terms", "Devi accettare i Termini e Condizioni."),
        validateRequiredCheckbox(form, "privacy", "Devi accettare l'Informativa Privacy.")
    ].every(Boolean);
}

function validateWorkshopStep(form, step) {
    clearErrors(form);

    if (step === 1) {
        return [
            requireText(form, "ownerNome", "Il nome"),
            requireText(form, "ownerCognome", "Il cognome"),
            validateEmail(form, "ownerEmail"),
            validatePhone(form, "ownerTelefono", "Il numero di telefono"),
            validatePassword(form, "ownerPassword", "ownerPasswordConfirm")
        ].every(Boolean);
    }

    if (step === 2) {
        const vat = String(form.elements.partitaIva.value || "").trim();
        const cap = String(form.elements.cap.value || "").trim();
        let valid = [
            requireText(form, "nomeOfficina", "Il nome officina"),
            requireText(form, "ragioneSociale", "La ragione sociale"),
            validatePhone(form, "telefonoOfficina", "Il telefono officina"),
            requireText(form, "via", "L'indirizzo"),
            requireText(form, "citta", "La città"),
            requireText(form, "provincia", "La provincia")
        ].every(Boolean);

        if (!ITALIAN_VAT_RE.test(vat)) {
            setError(form, "partitaIva", "La Partita IVA italiana deve contenere 11 cifre.");
            valid = false;
        }

        if (!ZIP_RE.test(cap)) {
            setError(form, "cap", "Il CAP deve contenere 5 cifre.");
            valid = false;
        }

        return valid;
    }

    if (step === 3) {
        const services = form.querySelectorAll('[name="serviziOfferti"]:checked');
        const otherChecked = form.querySelector("#serviceOther")?.checked;

        if (!services.length) {
            setError(form, "serviziOfferti", "Seleziona almeno un servizio.");
            return false;
        }

        if (otherChecked && !String(form.elements.altroServizio.value || "").trim()) {
            setError(form, "altroServizio", "Specifica il servizio aggiuntivo.");
            return false;
        }

        return true;
    }

    if (step === 4) {
        const photos = form.elements.fotoOfficina.files || [];

        if (photos.length > 10) {
            setError(form, "fotoOfficina", "Puoi caricare al massimo 10 foto.");
            return false;
        }

        return true;
    }

    return [
        validateRequiredCheckbox(form, "workshopTerms", "Devi accettare i Termini e Condizioni."),
        validateRequiredCheckbox(form, "workshopPrivacy", "Devi accettare l'Informativa Privacy."),
        validateRequiredCheckbox(form, "businessTruth", "Devi dichiarare la correttezza dei dati aziendali.")
    ].every(Boolean);
}

function setRole(form, role) {
    const mode = form.dataset.mode || (form.dataset.type || "").split(" ")[0];
    const isMechanic = role === "officina";
    const card = form.closest(".booking-card");
    const eyebrow = card.querySelector("#authEyebrow");
    const title = card.querySelector("#authTitle");

    form.dataset.type = `${mode} ${role}`;
    form.querySelector(".user-registration-fields")?.classList.toggle("hidden", isMechanic);
    form.querySelector(".workshop-registration-fields")?.classList.toggle("hidden", !isMechanic);

    if (eyebrow) {
        eyebrow.textContent = isMechanic ? "Partner CarCheck" : "Nuovo account";
    }

    if (title) {
        title.textContent = isMechanic ? "Registra la tua officina" : "Registrati";
    }
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

function setSubmitting(button, isSubmitting, text) {
    if (!button) {
        return;
    }

    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Invio in corso..." : text;
}

function loadPasswordToggles() {
    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.togglePassword);
            const show = input.type === "password";

            input.type = show ? "text" : "password";
            button.textContent = show ? "Nascondi" : "Mostra";
        });
    });
}

function loadWorkshopSteps() {
    const form = document.querySelector(".registration-form");

    if (!form) {
        return;
    }

    let currentStep = 1;
    const totalSteps = 5;
    const prevBtn = document.getElementById("workshopPrevBtn");
    const nextBtn = document.getElementById("workshopNextBtn");
    const label = document.getElementById("workshopStepLabel");
    const progress = document.getElementById("workshopProgressBar");

    const renderStep = () => {
        form.querySelectorAll(".workshop-step").forEach((step) => {
            step.classList.toggle("hidden", Number(step.dataset.step) !== currentStep);
        });

        prevBtn.disabled = currentStep === 1;
        nextBtn.textContent = currentStep === totalSteps ? "Registra officina" : "Continua";
        label.textContent = `Passaggio ${currentStep} di ${totalSteps}`;
        progress.style.width = `${(currentStep / totalSteps) * 100}%`;
    };

    prevBtn.addEventListener("click", () => {
        if (currentStep > 1) {
            currentStep -= 1;
            renderStep();
        }
    });

    nextBtn.addEventListener("click", async () => {
        if (!validateWorkshopStep(form, currentStep)) {
            return;
        }

        if (currentStep < totalSteps) {
            currentStep += 1;
            renderStep();
            return;
        }

        await submitRegistration(form, nextBtn, "Registra officina");
    });

    renderStep();
}

function loadRegistrationEnhancements() {
    const description = document.getElementById("workshopDescription");
    const counter = document.getElementById("descriptionCounter");
    const serviceOther = document.getElementById("serviceOther");
    const otherServiceField = document.getElementById("otherServiceField");
    const logoInput = document.getElementById("workshopLogo");
    const photosInput = document.getElementById("workshopPhotos");

    if (description && counter) {
        description.addEventListener("input", () => {
            counter.textContent = `${description.value.length}/500`;
        });
    }

    if (serviceOther && otherServiceField) {
        serviceOther.addEventListener("change", () => {
            otherServiceField.classList.toggle("hidden", !serviceOther.checked);
        });
    }

    if (logoInput) {
        logoInput.addEventListener("change", () => {
            renderFilePreview("logoPreview", logoInput.files, 1);
        });
    }

    if (photosInput) {
        photosInput.addEventListener("change", () => {
            renderFilePreview("photosPreview", photosInput.files, 10);
        });
    }

    document.querySelectorAll(".hours-row input[type='checkbox']").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            checkbox.closest(".hours-row").querySelectorAll("input[type='time']").forEach((input) => {
                input.disabled = checkbox.checked;
            });
        });
    });
}

function renderFilePreview(containerId, files, maxFiles) {
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    container.innerHTML = Array.from(files)
        .slice(0, maxFiles)
        .map((file) => `<span>${file.name}</span>`)
        .join("");
}

async function submitRegistration(form, button, defaultText) {
    const message = form.parentElement.querySelector(".form-message");
    const isMechanic = (form.dataset.type || "").includes("officina");
    const valid = isMechanic ? validateWorkshopStep(form, 5) : validateUserRegistration(form);

    if (!valid) {
        return;
    }

    setSubmitting(button, true, defaultText);
    message.textContent = "";

    try {
        const payload = getAuthPayload(form);
        const result = isMechanic
            ? await registerWorkshop(payload)
            : await registerUser(payload);
        const session = result.utente || sanitizeSession(payload);

        if (result.officina) {
            session.officinaId = result.officina.id;
        }

        localStorage.setItem("carcheckUser", JSON.stringify(session));
        message.textContent = isMechanic
            ? "Registrazione officina completata."
            : "Registrazione completata.";
        form.reset();
    } catch (err) {
        message.textContent = "Registrazione non riuscita. Controlla che il backend sia attivo.";
    } finally {
        setSubmitting(button, false, defaultText);
    }
}

async function submitLegacyAuth(form) {
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
        const session = result.utente || sanitizeSession(payload);

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
}

function loadAuthForms() {
    document.querySelectorAll(".auth-form").forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const mode = form.dataset.mode || "";

            if (mode === "registrazione" && form.classList.contains("registration-form")) {
                await submitRegistration(form, form.querySelector(".submit-btn"), "Registrati");
                return;
            }

            await submitLegacyAuth(form);
        });
    });
}

loadAuthSwitches();
loadPasswordToggles();
loadWorkshopSteps();
loadRegistrationEnhancements();
loadAuthForms();
