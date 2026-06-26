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
document.getElementById('current-day-text').innerText = stateMgr.state.progress.current_day;
document.getElementById('setting-lang').value = stateMgr.state.settings.language;
document.getElementById('setting-speed').value = stateMgr.state.settings.speed;

// Settings Events
document.getElementById('setting-lang').addEventListener('change', (e) => stateMgr.updateSetting('language', e.target.value));
document.getElementById('setting-speed').addEventListener('change', (e) => stateMgr.updateSetting('speed', parseInt(e.target.value)));

// Backup Events
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

// Start Lesson
document.getElementById('btn-start-lesson').addEventListener('click', async () => {
    await startLesson();
});

document.getElementById('btn-return-home').addEventListener('click', () => {
    stateMgr.incrementDay();
    location.reload();
});

// Child Lock (Hold 2s)
let pressTimer;
const btnPause = document.getElementById('btn-pause');
const startHold = (e) => { e.preventDefault(); pressTimer = setTimeout(showChildLock, 2000); };
const endHold = (e) => { e.preventDefault(); clearTimeout(pressTimer); };
btnPause.addEventListener('touchstart', startHold);
btnPause.addEventListener('touchend', endHold);
btnPause.addEventListener('mousedown', startHold);
btnPause.addEventListener('mouseup', endHold);

// History API (Prevent Back)
window.addEventListener('popstate', () => {
    if (lessonActive) {
        history.pushState(null, null, location.href);
        showChildLock();
    }
});

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) { console.warn('Wake Lock error:', err); }
}

function releaseWakeLock() {
    if (wakeLock !== null) { wakeLock.release(); wakeLock = null; }
}

async function startLesson() {
    lessonActive = true;
    history.pushState(null, null, location.href);
    await requestWakeLock();
    await audio.init();
    
    if (!render) render = new RenderEngine('main-canvas');

    const day = stateMgr.state.progress.current_day;
    const numbers = getDailyNumbers(day);
    const lang = stateMgr.state.settings.language;
    
    showScreen('countdown');
    document.getElementById('countdown-text').innerText = 'Loading...';
    
    await audio.preloadForDay(numbers, lang);
    
    for (let i = 3; i > 0; i--) {
        if (!lessonActive) return;
        document.getElementById('countdown-text').innerText = i;
        await sleep(1000);
    }
    
    showScreen('lesson');
    runLessonLoop(numbers, day, lang);
}

async function runLessonLoop(numbers, day, lang) {
    let speed = stateMgr.state.settings.speed;
    if (lang === 'bilingual') speed = Math.max(speed, 900); // バイリンガル速度調整

    const textOverlay = document.getElementById('lesson-text-overlay');

    for (const num of numbers) {
        if (!lessonActive) return;
        render.drawDots(num, stateMgr.state.settings.skin);
        textOverlay.innerText = '';
        
        if (day >= 61) {
            setTimeout(() => { if (lessonActive) textOverlay.innerText = num; }, 300);
        }

        if (lang === 'ja' || lang === 'bilingual') await audio.playNumber(num, 'ja');
        if (lang === 'en' || lang === 'bilingual') {
            if (lang === 'bilingual') await sleep(100);
            await audio.playNumber(num, 'en');
        }
        
        await sleep(speed);
    }

    if (day <= 30) endLesson();
    else if (day <= 60) runQuizPhase(numbers, day);
    else runFormulaPhase(numbers, lang);
}

async function runQuizPhase(numbers, day) {
    const textOverlay = document.getElementById('lesson-text-overlay');
    for (let i = 0; i < 3; i++) {
        if (!lessonActive) return;
        const correct = numbers[Math.floor(Math.random() * numbers.length)];
        const quiz = generateQuiz(correct, day);
        
        render.drawQuizScreen(quiz.left, quiz.right, stateMgr.state.settings.skin);
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
                canvas.style.transform = 'translateX(5px)';
                setTimeout(() => canvas.style.transform = 'none', 100);
            }
        };
        
        canvas.addEventListener('touchstart', handler, { passive: false });
        canvas.addEventListener('mousedown', handler);
    });
}

async function runFormulaPhase(numbers, lang) {
    const textOverlay = document.getElementById('lesson-text-overlay');
    for (const num of numbers) {
        if (!lessonActive) return;
        const formula = generateFormula(num);
        
        const r = render.getDotRadius(num);
        const finalPositions = render.generatePositions(num, r, render.logicalWidth, render.logicalHeight);
        const posA = finalPositions.slice(0, formula.numA);
        const posB = finalPositions.slice(formula.numA);
        
        for (let p = 0; p <= 1; p += 0.1) {
            if (!lessonActive) return;
            render.drawFormulaAnimation(posA, posB, stateMgr.state.settings.skin, p);
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

// PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW failed: ', err));
    });
}\n