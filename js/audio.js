export class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = {};
        this.unlocked = false;
    }

    async init() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        if (!this.unlocked) {
            // iOS Unlock: 無音バッファの再生
            const buffer = this.ctx.createBuffer(1, 1, 22050);
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.ctx.destination);
            source.start(0);
            this.unlocked = true;
        }
    }

    async preloadForDay(numbers, lang) {
        const langsToLoad = lang === 'bilingual' ? ['ja', 'en'] : [lang];
        const promises = [];
        
        for (const l of langsToLoad) {
            for (const num of numbers) {
                const key = `${l}_${num}`;
                if (!this.buffers[key]) {
                    promises.push(this.fetchAndDecode(l, num, key));
                }
            }
        }
        await Promise.all(promises);
    }

    async fetchAndDecode(lang, num, key) {
        try {
            // 実際の音声ファイルがない場合は無音フォールバックとして扱う
            const res = await fetch(`assets/audio/${lang}/${num}.mp3`);
            if (!res.ok) throw new Error('Network response was not ok');
            const arrayBuffer = await res.arrayBuffer();
            this.buffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn(`Audio load failed for ${key}, using silent fallback.`);
            this.buffers[key] = this.ctx.createBuffer(1, 1, 22050);
        }
    }

    playNumber(num, lang) {
        return new Promise((resolve) => {
            const key = `${lang}_${num}`;
            const buffer = this.buffers[key];
            if (!buffer) {
                resolve();
                return;
            }
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.ctx.destination);
            source.onended = resolve;
            source.start(0);
        });
    }
    
    suspend() {
        if (this.ctx.state === 'running') {
            this.ctx.suspend();
        }
    }
}\n