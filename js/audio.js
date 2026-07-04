export class AudioEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.unlocked = false;
    }

    async init() {
        if (!this.unlocked) {
            try {
                const utterance = new SpeechSynthesisUtterance('');
                utterance.volume = 0;
                this.synth.speak(utterance);
                this.unlocked = true;
            } catch (e) {}
        }
    }

    async preloadForDay(numbers, lang) {
        return Promise.resolve();
    }

    playNumber(num, lang) {
        return new Promise((resolve) => {
            try {
                const utterance = new SpeechSynthesisUtterance(num.toString());
                utterance.volume = 1;
                utterance.rate = 1.5;
                
                if (lang === 'ja') {
                    utterance.lang = 'ja-JP';
                } else if (lang === 'en') {
                    utterance.lang = 'en-US';
                }

                let resolved = false;
                const finish = () => {
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                };

                utterance.onend = finish;
                utterance.onerror = finish;
                
                this.synth.speak(utterance);
                setTimeout(finish, 1500);
            } catch (e) {
                resolve();
            }
        });
    }
    
    suspend() {
        try { this.synth.cancel(); } catch (e) {}
    }
}
