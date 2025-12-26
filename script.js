// --- Global Variables ---
let currentLang = 'ua';
let mode = 'BOT'; // 'BOT' or 'PvP'
let difficulty = 'medium';
let score1 = 0;
let score2 = 0;
let attempts = 0;
let phase = 'GK'; // 'GK' or 'STRIKER'
let savedGkChoice = '';
let isAnimating = false; // Блокування натискань під час удару

// --- Sound Engine (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();

const Sound = {
    // Ініціалізація аудіо (браузери вимагають жест користувача для запуску звуку)
    init: function() {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    },

    // Генератор тону (осцилятор)
    playTone: function(freq, type, duration, vol = 0.1) {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },

    // Звук удару (низька частота, швидке падіння)
    kick: function() {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },

    // Свисток судді (модуляція)
    whistle: function() {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.frequency.setValueAtTime(2500, now);
        osc.frequency.linearRampToValueAtTime(1500, now + 0.1);
        
        // Тремоло ефект (вібрація)
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 50; // Швидкість вібрації
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 500; // Глибина вібрації
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        lfo.stop(now + 0.6);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(now + 0.6);
    },

    // Гол (мажорний акорд)
    goal: function() {
        this.playTone(523.25, 'triangle', 0.3); // C5
        setTimeout(() => this.playTone(659.25, 'triangle', 0.3), 100); // E5
        setTimeout(() => this.playTone(783.99, 'triangle', 0.6), 200); // G5
    },

    // Промах (низький "пук")
    miss: function() {
        this.playTone(150, 'sawtooth', 0.4); 
        setTimeout(() => this.playTone(100, 'sawtooth', 0.4), 150);
    },

    // Клік по кнопці
    click: function() {
        this.playTone(800, 'sine', 0.05, 0.05);
    }
};

const translations = {
    ua: {
        bot: "ГРАТИ ПРОТИ БОТА", pvp: "ГРАТИ 1 НА 1 (PvP)", diff: "ОБЕРИ СКЛАДНІСТЬ:",
        easy: "ЛЕГКО", medium: "СЕРЕДНЬО", hard: "ЛЕГЕНДА", player1: "ГРАВЕЦЬ 1", 
        player2: "ГРАВЕЦЬ 2", bot_name: "БОТ", left: "ВЛІВО", center: "ЦЕНТР", 
        right: "ВПРАВО", before_kick: "ОЧІКУВАННЯ...", ready: "ГОТОВИЙ БИТИ", 
        your_kick: "ТВІЙ УДАР!", gk_choice: "ГРАВЕЦЬ 1: СТРИБОК", 
        striker_choice: "ГРАВЕЦЬ 2: УДАР", win: "ПЕРЕМОГА!", lose: "ПОРАЗКА", 
        draw: "НІЧИЯ", menu: "В МЕНЮ"
    },
    en: {
        bot: "PLAY AGAINST BOT", pvp: "PLAY 1 VS 1 (PvP)", diff: "CHOOSE DIFFICULTY:",
        easy: "EASY", medium: "MEDIUM", hard: "LEGEND", player1: "PLAYER 1", 
        player2: "PLAYER 2", bot_name: "BOT", left: "LEFT", center: "CENTER", 
        right: "RIGHT", before_kick: "WAITING...", ready: "READY TO KICK", 
        your_kick: "YOUR KICK!", gk_choice: "PLAYER 1: DIVE", 
        striker_choice: "PLAYER 2: SHOOT", win: "VICTORY!", lose: "DEFEAT", 
        draw: "DRAW", menu: "TO MENU"
    }
};

// --- Menu Functions ---
function setLanguage(l) {
    Sound.init(); // Активуємо звук при першому кліку
    Sound.click();
    currentLang = l;
    updateTexts();
    document.getElementById('language-box').style.display = 'none';
    document.getElementById('menu-initial').style.display = 'block';
}

function updateTexts() {
    const t = translations[currentLang];
    const els = {
        'btn-bot': t.bot, 'btn-pvp': t.pvp, 'txt-diff': t.diff,
        'btn-easy': t.easy, 'btn-medium': t.medium, 'btn-hard': t.hard,
        'btn-restart': t.menu, 'txt-pass': t.before_kick, 'btn-ready': t.ready,
        'btn-left': t.left, 'btn-center': t.center, 'btn-right': t.right
    };
    for (let id in els) {
        if(document.getElementById(id)) document.getElementById(id).innerText = els[id];
    }
}

function showBotDifficulty() {
    Sound.click();
    document.getElementById('menu-initial').style.display = 'none';
    document.getElementById('difficulty-box').style.display = 'block';
}

function startBot(diff) {
    Sound.click();
    mode = 'BOT'; 
    difficulty = diff;
    document.getElementById('p1-name').innerText = translations[currentLang].player1;
    document.getElementById('p2-name').innerText = translations[currentLang].bot_name;
    startGame();
}

function startPvP() {
    Sound.click();
    mode = 'PvP';
    document.getElementById('p1-name').innerText = translations[currentLang].player1;
    document.getElementById('p2-name').innerText = translations[currentLang].player2;
    startGame();
}

// --- Game Logic ---
function startGame() {
    Sound.whistle(); // Свисток на старт
    score1 = 0; score2 = 0; attempts = 0;
    document.getElementById('score1').innerText = '0';
    document.getElementById('score2').innerText = '0';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('overlay').style.display = 'none'; 
    document.getElementById('game-ui').style.display = 'block';
    
    initDots();
    resetRound();
}

function goToMenu() {
    Sound.click();
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('difficulty-box').style.display = 'none';
    document.getElementById('menu-initial').style.display = 'block';
}

function initDots() {
    const bar = document.getElementById('attempts-bar');
    bar.innerHTML = '';
    for(let i=0; i<5; i++) {
        let d = document.createElement('div');
        d.className = 'dot'; 
        d.id = 'dot-' + i;
        bar.appendChild(d);
    }
}

function handleChoice(choice) {
    if (isAnimating) return; 
    Sound.click();

    if (mode === 'PvP' && phase === 'GK') {
        savedGkChoice = choice;
        phase = 'STRIKER';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('pass-screen').style.display = 'block';
        document.getElementById('turn-instruction').innerText = translations[currentLang].before_kick;
    } else {
        let finalGkChoice = '';
        if (mode === 'BOT') {
            const chances = {'easy': 0.25, 'medium': 0.45, 'hard': 0.75};
            const saveChance = chances[difficulty];
            if (Math.random() < saveChance) finalGkChoice = choice;
            else {
                const opts = ['left', 'center', 'right'].filter(o => o !== choice);
                finalGkChoice = opts[Math.floor(Math.random() * opts.length)];
            }
        } else {
            finalGkChoice = savedGkChoice;
        }
        animateShot(choice, finalGkChoice);
    }
}

function confirmReady() {
    Sound.click();
    document.getElementById('pass-screen').style.display = 'none';
    document.getElementById('controls').style.display = 'block';
    document.getElementById('turn-instruction').innerText = translations[currentLang].striker_choice;
}

function animateShot(strikerDir, gkDir) {
    isAnimating = true;
    Sound.kick(); // Звук удару
    document.getElementById('controls').style.display = 'none';
    
    const gk = document.getElementById('goalkeeper');
    const ball = document.getElementById('ball');

    if (gkDir === 'left') {
        gk.style.transform = 'translateX(-180%) rotate(-45deg)'; 
    } else if (gkDir === 'right') {
        gk.style.transform = 'translateX(80%) rotate(45deg)'; 
    } else {
        gk.style.transform = 'translateX(-50%) translateY(-15px)';
    }

    ball.style.bottom = '55%'; 
    ball.style.transform = 'translateX(-50%) scale(0.6) rotate(360deg)';

    if (strikerDir === 'left') ball.style.left = '20%';
    else if (strikerDir === 'right') ball.style.left = '80%';
    else ball.style.left = '50%';

    setTimeout(() => {
        const isGoal = strikerDir !== gkDir;
        const dot = document.getElementById('dot-' + attempts);
        
        if (isGoal) { 
            score1++; 
            Sound.goal(); // Звук голу
            if(dot) dot.classList.add('hit'); 
        } else { 
            score2++; 
            Sound.miss(); // Звук сейву/промаху
            if(dot) dot.classList.add('miss'); 
        }
        
        document.getElementById('score1').innerText = score1;
        document.getElementById('score2').innerText = score2;
        
        attempts++;

        if (attempts >= 5) {
            endGame();
        } else {
            setTimeout(resetRound, 1500);
        }
    }, 600);
}

function endGame() {
    const t = translations[currentLang];
    let msg = '';
    
    // Трохи довший фінальний звук
    if (score1 > score2) { 
        msg = t.win; 
        Sound.goal(); 
    } else if (score2 > score1) { 
        msg = t.lose; 
        Sound.miss(); 
    } else { 
        msg = t.draw; 
        Sound.whistle(); 
    }

    document.getElementById('winner-msg').innerText = msg;
    document.getElementById('overlay').style.display = 'flex';
    isAnimating = false;
}

function resetRound() {
    isAnimating = false;
    phase = 'GK';
    
    const ball = document.getElementById('ball');
    ball.style.transition = 'none'; 
    ball.style.bottom = '25%'; 
    ball.style.left = '50%';
    ball.style.transform = 'translateX(-50%) scale(1) rotate(0deg)';
    
    const gk = document.getElementById('goalkeeper');
    gk.style.transition = 'none';
    gk.style.transform = 'translateX(-50%) rotate(0deg)';

    setTimeout(() => {
        ball.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        gk.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    }, 50);

    document.getElementById('controls').style.display = 'block';
    const t = translations[currentLang];
    document.getElementById('turn-instruction').innerText = mode === 'PvP' ? t.gk_choice : t.your_kick;
}
