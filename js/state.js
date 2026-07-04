export class StateManager {
    constructor() {
        this.storageKey = "smartdots_v1_data";
        this.state = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) return JSON.parse(data);
        } catch (e) {}
        return {
            settings: { language: "bilingual", speed: 600, skin: "dynamic" },
            progress: { current_day: 1, history: [] }
        };
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    }

    updateSetting(key, value) {
        this.state.settings[key] = value;
        this.save();
    }

    incrementDay() {
        if (this.state.progress.current_day < 90) {
            this.state.progress.current_day++;
        }
        const today = new Date().toISOString().split('T')[0];
        if (!this.state.progress.history.includes(today)) {
            this.state.progress.history.push(today);
        }
        this.save();
    }

    exportBackupCode() {
        try { return btoa(encodeURIComponent(JSON.stringify(this.state))); } 
        catch (e) { return null; }
    }

    importBackupCode(base64Str) {
        try {
            const parsedData = JSON.parse(decodeURIComponent(atob(base64Str)));
            if (parsedData && parsedData.progress && parsedData.progress.current_day) {
                this.state = parsedData;
                this.save();
                return true;
            }
        } catch (e) {}
        return false;
    }
}
