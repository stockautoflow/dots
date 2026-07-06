export class AudioEngine {
    constructor() {
        // ★修正: MP3ファイルを使用するWeb Audio API方式に戻しました
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = {};
        this.unlocked = false;
    }

    async init() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        if (!this.unlocked) {
            // iOS/TV対策: 無音バッファを再生してロック解除
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
            const res = await fetch(`assets/audio/${lang}/${num}.mp3`);
            if (!res.ok) throw new Error('Network response was not ok');
            const arrayBuffer = await res.arrayBuffer();
            this.buffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn(`Audio load failed for ${key}`, e);
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
            
            let resolved = false;
            const finish = () => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            };
            
            source.onended = finish;
            source.start(0);
            
            // 安全策: 1.5秒で強制次へ
            setTimeout(finish, 1500);
        });
    }
    
    suspend() {
        if (this.ctx.state === 'running') {
            this.ctx.suspend();
        }
    }
}
