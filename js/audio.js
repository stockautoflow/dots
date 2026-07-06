export class AudioEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.unlocked = false;
    }

    // ★修正: iOS/TV対策として、非同期(async)ではなく同期関数に変更
    init() {
        if (!this.unlocked && this.synth) {
            try {
                const utterance = new SpeechSynthesisUtterance('');
                utterance.volume = 0;
                this.synth.speak(utterance);
                this.unlocked = true;
            } catch (e) {
                console.warn("Speech API init failed", e);
            }
        }
    }

    playNumber(num, lang) {
        return new Promise((resolve) => {
            if (!this.synth) {
                resolve();
                return;
            }
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
        try { if (this.synth) this.synth.cancel(); } catch (e) {}
    }
}
