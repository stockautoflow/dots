import { StateManager } from './state.js';
import { AudioEngine } from './audio.js';
import { RenderEngine } from './render.js';
import { getDailyNumbers, generateQuiz, generateFormula } from './curriculum.js';

const stateMgr = new StateManager();
const audio = new AudioEngine();
let render;
let wakeLock = null;
let lessonActive = false;

const screens = {
    home: document.getElementById('home-screen'),
    countdown: document.getElementById('countdown-screen'),
    lesson: document.getElementById('lesson-screen'),
    lock: document.getElementById('lock-screen'),
    result: document.getElementById('result-screen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// UI Init
document.getElementById('setting-day').value = stateMgr.state.progress.current_day;
document.getElementById('setting-lang').value = stateMgr.state.settings.language;
document.getElementById('setting-speed').value = stateMgr.state.settings.speed;
document.getElementById('setting-skin').value = stateMgr.state.settings.skin || 'circle';
document.getElementById('setting-dot-color').value = stateMgr.state.settings.dotColor || '#ff6b6b';
document.getElementById('setting-bg-color').value = stateMgr.state.settings.bgColor || '#f0f8ff';

// Events
document.getElementById('setting-day').addEventListener('change', (e) => {
    stateMgr.state.progress.current_day = parseInt(e.target.value);
    stateMgr.save();
});
document.getElementById('setting-lang').addEventListener('change', (e) => stateMgr.updateSetting('language', e.target.value));
document.getElementById('setting-speed').addEventListener('change', (e) => stateMgr.updateSetting('speed', parseInt(e.target.value)));
document.getElementById('setting-skin').addEventListener('change', (e) => stateMgr.updateSetting('skin', e.target.value));
document.getElementById('setting-dot-color').addEventListener('change', (e) => stateMgr.updateSetting('dotColor', e.target.value));
document.getElementById('setting-bg-color').addEventListener('change', (e) => stateMgr.updateSetting('bgColor', e.target.value));

document.getElementById('btn-export').addEventListener('click', () => {
    const code = stateMgr.exportBackupCode();
    if (code) navigator.clipboard.writeText(code).then(() => alert('バックアップコードをコピーしました。'));
});
document.getElementById('btn-import').addEventListener('click', () => {
    const code = document.getElementById('input-import').value;
    if (stateMgr.importBackupCode(code)) {
        alert('復元に成功しました。');
        location.reload();
    } else {
        alert('無効なコードです。');
    }
});

// 通常レッスン開始
document.getElementById('btn-start-lesson').addEventListener('click', async (e) => {
    audio.init(); 
    await startLesson();
});

// ★追加: 掛け流しモード開始
document.getElementById('btn-start-endless').addEventListener('click', async (e) => {
    audio.init(); 
    await startEndlessMode();
});

document.getElementById('btn-return-home').addEventListener('click', () => {
    stateMgr.incrementDay();
    location.reload();
});

let pressTimer;
const btnPause = document.getElementById('btn-pause');
const startHold = (e) => { e.preventDefault(); pressTimer = setTimeout(showChildLock, 2000); };
const endHold = (e) => { e.preventDefault(); clearTimeout(pressTimer); };
btnPause.addEventListener('touchstart', startHold);
btnPause.addEventListener('touchend', endHold);
btnPause.addEventListener('mousedown', startHold);
btnPause.addEventListener('mouseup', endHold);

window.addEventListener('popstate', () => {
    if (lessonActive) {
        history.pushState(null, null, location.href);
        showChildLock();
    }
});

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {}
}

function releaseWakeLock() {
    if (wakeLock !== null) { wakeLock.release(); wakeLock = null; }
}

// --- 通常レッスン処理 ---
async function startLesson() {
    lessonActive = true;
    history.pushState(null, null, location.href);
    await requestWakeLock();
    
    const day = stateMgr.state.progress.current_day;
    const numbers = getDailyNumbers(day);
    const lang = stateMgr.state.settings.language;
    
    showScreen('countdown');
    for (let i = 3; i > 0; i--) {
        if (!lessonActive) return;
        document.getElementById('countdown-text').innerText = i;
        await sleep(1000);
    }
    
    showScreen('lesson');
    await new Promise(resolve => setTimeout(() => {
        if (!render) render = new RenderEngine('main-canvas');
        render.initCanvas(stateMgr.state.settings.bgColor);
        resolve();
    }, 0));

    runLessonLoop(numbers, day, lang);
}

async function runLessonLoop(numbers, day, lang) {
    let speed = stateMgr.state.settings.speed;
    if (lang === 'bilingual') speed = Math.max(speed, 900);

    const textOverlay = document.getElementById('lesson-text-overlay');
    const skin = stateMgr.state.settings.skin;
    const dotColor = stateMgr.state.settings.dotColor;

    for (const num of numbers) {
        if (!lessonActive) return;
        
        render.drawDots(num, skin, dotColor);
        textOverlay.innerText = '';
        
        if (day >= 61) {
            setTimeout(() => { if (lessonActive) textOverlay.innerText = num; }, 300);
        }

        const startTime = Date.now();

        if (lang === 'ja' || lang === 'bilingual') await audio.playNumber(num, 'ja');
        if (lang === 'en' || lang === 'bilingual') {
            if (lang === 'bilingual') await sleep(100);
            await audio.playNumber(num, 'en');
        }
        
        const elapsed = Date.now() - startTime;
        const remaining = speed - elapsed;
        
        if (remaining > 0) await sleep(remaining);
        else await sleep(10);
    }

    if (day <= 30) endLesson();
    else if (day <= 60) runQuizPhase(numbers, day);
    else runFormulaPhase(numbers, lang);
}

// --- ★追加: 掛け流しモード処理 ---
async function startEndlessMode() {
    lessonActive = true;
    history.pushState(null, null, location.href);
    await requestWakeLock();
    
    const lang = stateMgr.state.settings.language;
    
    showScreen('countdown');
    for (let i = 3; i > 0; i--) {
        if (!lessonActive) return;
        document.getElementById('countdown-text').innerText = i;
        await sleep(1000);
    }
    
    showScreen('lesson');
    await new Promise(resolve => setTimeout(() => {
        if (!render) render = new RenderEngine('main-canvas');
        render.initCanvas(stateMgr.state.settings.bgColor);
        resolve();
    }, 0));

    runEndlessLoop(lang);
}

async function runEndlessLoop(lang) {
    let speed = stateMgr.state.settings.speed;
    if (lang === 'bilingual') speed = Math.max(speed, 900);

    const textOverlay = document.getElementById('lesson-text-overlay');
    
    // 掛け流し用のランダムスキンとカラー
    const skins = ['circle', '🍎', '⭐', '🐧', '🚗', '🐶', '🍓', '⚽', '🚃'];
    const colors = ['#ff6b6b', '#3182ce', '#38a169', '#d69e2e', '#805ad5', '#e53e3e', '#dd6b20', '#319795'];
    
    let currentSkin = stateMgr.state.settings.skin;
    let currentColor = stateMgr.state.settings.dotColor;
    
    let num = 1;
    let count = 0;

    while (lessonActive) {
        // 10枚ごとにスキンと色をランダムに変更
        if (count > 0 && count % 10 === 0) {
            currentSkin = skins[Math.floor(Math.random() * skins.length)];
            currentColor = colors[Math.floor(Math.random() * colors.length)];
        }

        render.drawDots(num, currentSkin, currentColor);
        textOverlay.innerText = ''; // 掛け流しでは数字テキストは出さない

        const startTime = Date.now();

        if (lang === 'ja' || lang === 'bilingual') await audio.playNumber(num, 'ja');
        if (lang === 'en' || lang === 'bilingual') {
            if (lang === 'bilingual') await sleep(100);
            await audio.playNumber(num, 'en');
        }
        
        const elapsed = Date.now() - startTime;
        const remaining = speed - elapsed;
        
        if (remaining > 0) await sleep(remaining);
        else await sleep(10);

        num++;
        if (num > 50) num = 1; // 50までいったら1に戻る
        count++;
    }
}

// --- クイズ・数式・終了処理 ---
async function runQuizPhase(numbers, day) {
    const textOverlay = document.getElementById('lesson-text-overlay');
    const skin = stateMgr.state.settings.skin;
    const dotColor = stateMgr.state.settings.dotColor;

    for (let i = 0; i < 3; i++) {
        if (!lessonActive) return;
        const correct = numbers[Math.floor(Math.random() * numbers.length)];
        const quiz = generateQuiz(correct, day);
        
        render.drawQuizScreen(quiz.left, quiz.right, skin, dotColor);
        textOverlay.innerText = `どっちが ${correct} かな？`;
        
        await waitForQuizAnswer(quiz.answerSide);
        textOverlay.innerText = 'ピンポーン！';
        await sleep(1000);
    }
    endLesson();
}

function waitForQuizAnswer(correctSide) {
    return new Promise(resolve => {
        const canvas = document.getElementById('main-canvas');
        let answered = false;
        
        const handler = (e) => {
            if (answered) return;
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            const rect = canvas.getBoundingClientRect();
            const isLeft = (touch.clientX - rect.left) < rect.width / 2;
            
            if ((isLeft && correctSide === 'left') || (!isLeft && correctSide === 'right')) {
                answered = true;
                canvas.removeEventListener('touchstart', handler);
                canvas.removeEventListener('mousedown', handler);
                resolve();
            } else {
                canvas.style.transform = 'translateX(10px)';
                setTimeout(() => canvas.style.transform = 'translateX(-10px)', 50);
                setTimeout(() => canvas.style.transform = 'none', 100);
            }
        };
        
        canvas.addEventListener('touchstart', handler, { passive: false });
        canvas.addEventListener('mousedown', handler);
    });
}

async function runFormulaPhase(numbers, lang) {
    const textOverlay = document.getElementById('lesson-text-overlay');
    const skin = stateMgr.state.settings.skin;
    const dotColor = stateMgr.state.settings.dotColor;

    for (const num of numbers) {
        if (!lessonActive) return;
        const formula = generateFormula(num);
        
        const r = render.getDotRadius(num);
        const finalPositions = render.generatePositions(num, r, render.logicalWidth, render.logicalHeight);
        const posA = finalPositions.slice(0, formula.numA);
        const posB = finalPositions.slice(formula.numA);
        
        for (let i = 0; i <= 10; i++) {
            if (!lessonActive) return;
            render.drawFormulaAnimation(posA, posB, skin, dotColor, i / 10);
            await sleep(50);
        }
        
        textOverlay.innerText = `${formula.numA} + ${formula.numB} = ${num}`;
        await sleep(1500);
    }
    endLesson();
}

function endLesson() {
    lessonActive = false;
    releaseWakeLock();
    showScreen('result');
}

function showChildLock() {
    lessonActive = false;
    audio.suspend();
    showScreen('lock');
    
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    const ans = a + b;
    document.getElementById('lock-quiz-text').innerText = `${a} + ${b} = ?`;
    
    const numpad = document.getElementById('numpad');
    numpad.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.innerText = i;
        btn.onclick = () => { if (i === ans) location.reload(); };
        numpad.appendChild(btn);
    }
}

document.getElementById('btn-lock-cancel').addEventListener('click', () => location.reload());

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW failed: ', err));
    });
}
