const COMPANY_CONFIG = {
    legalName: "[DA COMPLETARE]",
    vatNumber: "[DA COMPLETARE]",
    legalAddress: "[DA COMPLETARE]",
    supportEmail: "[EMAIL SUPPORTO DA COMPLETARE]",
    privacyEmail: "[EMAIL PRIVACY DA COMPLETARE]",
    bookingManagementFee: "2",
    bookingFeeRule: "per appuntamento completato"
};

const COOKIE_CATEGORIES = [
    { id: "necessary", label: "Cookie tecnici", required: true },
    { id: "preferences", label: "Preferenze", required: false },
    { id: "analytics", label: "Analytics", required: false },
    { id: "marketing", label: "Marketing", required: false }
];

async function submitContactRequest(data) {
    return api.request("/contact", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

async function submitReport(data) {
    return api.request("/reports", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

async function submitJobApplication(data) {
    return api.request("/jobs/applications", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

function setFieldError(form, name, message) {
    const error = form.querySelector(`[data-error-for="${name}"]`);

    if (error) {
        error.textContent = message || "";
    }
}

function clearFormErrors(form) {
    form.querySelectorAll(".field-error").forEach((error) => {
        error.textContent = "";
    });
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateRequired(form, name, message) {
    const field = form.elements[name];
    const value = field && field.type === "checkbox" ? field.checked : String(field?.value || "").trim();

    if (!value) {
        setFieldError(form, name, message);
        return false;
    }

    return true;
}

function validateEmail(form, name = "email") {
    const value = String(form.elements[name]?.value || "").trim();

    if (!isValidEmail(value)) {
        setFieldError(form, name, "Inserisci un indirizzo email valido.");
        return false;
    }

    return true;
}

function validateAttachment(form, name, maxMb) {
    const field = form.elements[name];

    if (!field || !field.files || !field.files.length) {
        return true;
    }

    const maxBytes = maxMb * 1024 * 1024;
    const valid = Array.from(field.files).every((file) => file.size <= maxBytes);

    if (!valid) {
        setFieldError(form, name, `Ogni allegato deve pesare massimo ${maxMb} MB.`);
    }

    return valid;
}

function readForm(form) {
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        if (value instanceof File) {
            data[key] = value.name || "";
            return;
        }

        if (data[key]) {
            data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
            return;
        }

        data[key] = value;
    });

    return data;
}

function setSubmitState(button, loading, defaultText) {
    if (!button) {
        return;
    }

    button.disabled = loading;
    button.textContent = loading ? "Invio in corso..." : defaultText;
}

function bindAsyncForm(formId, validator, submitter, defaultText) {
    const form = document.getElementById(formId);

    if (!form) {
        return;
    }

    const message = form.querySelector(".form-message");
    const submit = form.querySelector("[type='submit']");

    form.querySelectorAll("input, textarea, select").forEach((field) => {
        field.addEventListener("input", () => setFieldError(form, field.name, ""));
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearFormErrors(form);
        message.textContent = "";

        if (!validator(form)) {
            const firstError = form.querySelector(".field-error:not(:empty)");
            const fieldName = firstError?.dataset.errorFor;
            form.elements[fieldName]?.focus();
            return;
        }

        const honeypot = form.elements.website;

        if (honeypot && honeypot.value) {
            return;
        }

        setSubmitState(submit, true, defaultText);

        try {
            await submitter(readForm(form));
            message.textContent = "Richiesta inviata correttamente.";
            form.reset();
        } catch (err) {
            message.textContent = "Invio non disponibile: collega l'endpoint backend per completare questa funzione.";
        } finally {
            setSubmitState(submit, false, defaultText);
        }
    });
}

function bindFaqSearch() {
    const search = document.getElementById("faqSearch");

    if (!search) {
        return;
    }

    const items = document.querySelectorAll(".faq-item");

    search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();

        items.forEach((item) => {
            item.hidden = query && !item.textContent.toLowerCase().includes(query);
        });
    });
}

function bindCookiePreferences() {
    const form = document.getElementById("cookiePreferencesForm");

    if (!form) {
        return;
    }

    const list = form.querySelector(".cookie-options");
    const message = form.querySelector(".form-message");

    list.innerHTML = COOKIE_CATEGORIES.map((category) => `
        <label class="checkbox-row">
            <input name="${category.id}" type="checkbox" ${category.required ? "checked disabled" : ""}>
            <span>${category.label}${category.required ? " - sempre attivi" : ""}</span>
        </label>
    `).join("");

    const save = (mode) => {
        const preferences = COOKIE_CATEGORIES.reduce((result, category) => {
            result[category.id] = category.required || mode === "all" || (mode === "custom" && form.elements[category.id]?.checked);
            return result;
        }, {});

        localStorage.setItem("carcheckCookiePreferences", JSON.stringify({
            savedAt: new Date().toISOString(),
            preferences
        }));
        message.textContent = "Preferenze cookie salvate. Gli script non necessari andranno collegati a questa scelta.";
    };

    document.getElementById("acceptAllCookies")?.addEventListener("click", () => save("all"));
    document.getElementById("rejectOptionalCookies")?.addEventListener("click", () => save("necessary"));

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        save("custom");
    });
}

function fillConfigPlaceholders() {
    document.querySelectorAll("[data-config]").forEach((element) => {
        element.textContent = COMPANY_CONFIG[element.dataset.config] || element.textContent;
    });
}

bindAsyncForm("contactForm", (form) => [
    validateRequired(form, "nome", "Inserisci il nome."),
    validateRequired(form, "cognome", "Inserisci il cognome."),
    validateEmail(form),
    validateRequired(form, "tipoRichiesta", "Seleziona il tipo di richiesta."),
    validateRequired(form, "oggetto", "Inserisci l'oggetto."),
    validateRequired(form, "messaggio", "Inserisci il messaggio."),
    validateRequired(form, "privacy", "Devi accettare l'Informativa Privacy."),
    validateAttachment(form, "allegato", 5)
].every(Boolean), submitContactRequest, "Invia richiesta");

bindAsyncForm("reportForm", (form) => [
    validateRequired(form, "categoria", "Seleziona una categoria."),
    validateRequired(form, "riferimento", "Inserisci URL o riferimento."),
    validateRequired(form, "descrizione", "Descrivi la segnalazione."),
    validateEmail(form),
    validateRequired(form, "buonaFede", "Conferma la dichiarazione di buona fede."),
    validateRequired(form, "privacy", "Devi accettare l'Informativa Privacy."),
    validateAttachment(form, "allegato", 5)
].every(Boolean), submitReport, "Invia segnalazione");

bindAsyncForm("careerForm", (form) => [
    validateRequired(form, "nome", "Inserisci il nome."),
    validateRequired(form, "cognome", "Inserisci il cognome."),
    validateEmail(form),
    validateRequired(form, "messaggio", "Inserisci un messaggio."),
    validateRequired(form, "privacy", "Devi accettare l'Informativa Privacy."),
    validateAttachment(form, "cv", 5)
].every(Boolean), submitJobApplication, "Invia candidatura");

bindFaqSearch();
bindCookiePreferences();
fillConfigPlaceholders();
