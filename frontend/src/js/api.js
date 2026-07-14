const API_URL = window.location.protocol === "file:"
    ? "http://localhost:3000/api"
    : `${window.location.origin}/api`;

const api = {
    async request(path, options = {}) {
        const res = await fetch(`${API_URL}${path}`, {
            headers: { "Content-Type": "application/json" },
            ...options
        });

        if (!res.ok) {
            const error = new Error("Richiesta non riuscita");
            error.status = res.status;
            throw error;
        }

        return await res.json();
    },

    async getOfficine() {
        try {
            return await this.request("/officine");
        } catch (err) {
            console.error("API officine non disponibile:", err);
            return [];
        }
    },

    async getOfficinaById(id) {
        try {
            return await this.request(`/officine/${id}`);
        } catch (err) {
            console.error("API dettaglio officina non disponibile:", err);
            return null;
        }
    },

    async createPrenotazione(prenotazione) {
        return await this.request("/prenotazioni", {
            method: "POST",
            body: JSON.stringify(prenotazione)
        });
    },

    async getPrenotazioni(filters = {}) {
        const params = new URLSearchParams(filters);
        const query = params.toString() ? `?${params.toString()}` : "";
        return await this.request(`/prenotazioni${query}`);
    },

    async updatePrenotazione(id, data) {
        return await this.request(`/prenotazioni/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data)
        });
    }
};
