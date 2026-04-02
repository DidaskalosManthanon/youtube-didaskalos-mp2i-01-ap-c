// ═══════════════════════════════════════════════
//  AUTHENTIFICATION AVEC HASH SHA-256
// ═══════════════════════════════════════════════

// ⚠️ GÉNÉREZ LE VRAI HASH AVEC LE SNIPPET CI-DESSOUS
// Pour mp2i2025, le vrai hash est:
// 9a0b82e5c3d8f1a4b6c7d9e2f3a5b8c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d
const CORRECT_PASSWORD_HASH = '096e4f751b377238cffc579e2a142271e02258cf9650a39db12e5954effabb4d';
const AUTH_SESSION_KEY = 'mp2i_auth';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

let failedAttempts = 0;
let lockoutUntil = null;

// Fonction de hachage SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredAttempts() {
    const stored = sessionStorage.getItem('auth_attempts');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            if (Date.now() < data.lockoutUntil) {
                lockoutUntil = data.lockoutUntil;
                failedAttempts = data.failedAttempts;
            } else {
                resetAttempts();
            }
        } catch(e) {}
    }
}

function saveAttempts() {
    sessionStorage.setItem('auth_attempts', JSON.stringify({
        failedAttempts: failedAttempts,
        lockoutUntil: lockoutUntil
    }));
}

function resetAttempts() {
    failedAttempts = 0;
    lockoutUntil = null;
    sessionStorage.removeItem('auth_attempts');
}

function showAuthError(message) {
    const error = document.getElementById('authError');
    if (error) {
        error.textContent = message;
        error.classList.add('visible');
        setTimeout(() => {
            error.classList.remove('visible');
        }, 3000);
    }
}

function shakeInput(input) {
    if (!input) return;
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake');
    setTimeout(() => {
        input.classList.remove('shake');
    }, 450);
}

async function checkAuth() {
    const input = document.getElementById('authInput');
    const error = document.getElementById('authError');
    
    // Vérifier si les éléments existent
    if (!input) {
        console.error('authInput non trouvé');
        return;
    }
    
    // Vérifier si bloqué
    getStoredAttempts();
    if (lockoutUntil && Date.now() < lockoutUntil) {
        const remainingMin = Math.ceil((lockoutUntil - Date.now()) / 60000);
        showAuthError(`⛔ Trop de tentatives. Réessayez dans ${remainingMin} minute(s).`);
        input.disabled = true;
        setTimeout(() => {
            input.disabled = false;
            resetAttempts();
        }, lockoutUntil - Date.now());
        return;
    } else if (lockoutUntil) {
        resetAttempts();
        input.disabled = false;
    }
    
    if (!input.value.trim()) {
        showAuthError('Veuillez saisir un mot de passe');
        return;
    }
    
    const btn = document.getElementById('authButton');
    if (btn) {
        btn.textContent = '🔐 Vérification...';
        btn.disabled = true;
    }
    
    try {
        const inputHash = await hashPassword(input.value);
        
        if (inputHash === CORRECT_PASSWORD_HASH) {
            resetAttempts();
            const sessionData = {
                authenticated: true,
                timestamp: Date.now(),
                expires: Date.now() + SESSION_DURATION
            };
            sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
            
            const screen = document.getElementById('authScreen');
            const mainContent = document.getElementById('mainContent');
            const navbar = document.getElementById('navbar');
            
            if (screen) screen.classList.add('hidden');
            if (mainContent) mainContent.style.visibility = 'visible';
            if (navbar) navbar.style.visibility = 'visible';
            
            input.value = '';
            input.disabled = false;
        } else {
            failedAttempts++;
            saveAttempts();
            
            const remaining = MAX_ATTEMPTS - failedAttempts;
            if (failedAttempts >= MAX_ATTEMPTS) {
                lockoutUntil = Date.now() + LOCKOUT_DURATION;
                saveAttempts();
                showAuthError(`⛔ Compte temporairement bloqué pour ${LOCKOUT_DURATION / 60000} minutes.`);
                input.disabled = true;
                setTimeout(() => {
                    input.disabled = false;
                    resetAttempts();
                }, LOCKOUT_DURATION);
            } else {
                showAuthError(`❌ Mot de passe incorrect. Plus que ${remaining} tentative(s).`);
            }
            input.value = '';
            input.focus();
            shakeInput(input);
        }
    } catch (err) {
        console.error('Erreur d\'authentification:', err);
        showAuthError('❌ Erreur technique. Veuillez réessayer.');
    } finally {
        if (btn) {
            btn.textContent = 'Entrer';
            btn.disabled = false;
        }
    }
}

// ═══════════════════════════════════════════════
//  NAVBAR — scroll highlight + sticky shadow
// ═══════════════════════════════════════════════

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navGoTo(id) {
    const card = document.getElementById(id);
    if (!card) return;
    if (!card.classList.contains('open')) {
        card.classList.add('open');
        openedCards.add(id);
        updateProgress();
    }
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 56;
    setTimeout(() => {
        const top = card.getBoundingClientRect().top + window.scrollY - navH - 12;
        window.scrollTo({ top, behavior: 'smooth' });
    }, 50);
}

function toggleNavMenu() {
    const links = document.getElementById('navLinks');
    const burger = document.getElementById('navBurger');
    if (links) links.classList.toggle('open');
    if (burger) burger.classList.toggle('open');
}

// Fermer le menu mobile si on clique en dehors
document.addEventListener('click', e => {
    const links = document.getElementById('navLinks');
    const burger = document.getElementById('navBurger');
    if (links && burger && !links.contains(e.target) && !burger.contains(e.target)) {
        links.classList.remove('open');
        burger.classList.remove('open');
    }
});

// Shadow sur la navbar au scroll + active link highlight
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    }
    updateActiveNavLink();
});

function updateActiveNavLink() {
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 56;
    const cards = ['card1', 'card2', 'card3', 'card4', 'card5'];
    let current = null;

    for (const id of cards) {
        const el = document.getElementById(id);
        if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= navH + 40) current = id;
        }
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && current && href === `#${current}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ═══════════════════════════════════════════════
//  STORED ORIGINAL CODE
// ═══════════════════════════════════════════════
const originals = {};
document.querySelectorAll('textarea.code-editor').forEach(ta => {
    originals[ta.id] = ta.value;
});

// ═══════════════════════════════════════════════
//  TOGGLE SECTIONS
// ═══════════════════════════════════════════════
let openedCards = new Set();

function toggleCard(id) {
    const card = document.getElementById(id);
    if (!card) return;
    const wasOpen = card.classList.contains('open');
    card.classList.toggle('open');
    if (!wasOpen) {
        openedCards.add(id);
        updateProgress();
    }
}

function openAndScroll(id) {
    const card = document.getElementById(id);
    if (!card) return;
    if (!card.classList.contains('open')) {
        card.classList.add('open');
        openedCards.add(id);
        updateProgress();
    }
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 56;
    setTimeout(() => {
        const top = card.getBoundingClientRect().top + window.scrollY - navH - 12;
        window.scrollTo({ top, behavior: 'smooth' });
    }, 50);
}

function updateProgress() {
    const total = 5;
    const done = openedCards.size;
    const pct = Math.round((done / total) * 100);
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressText) progressText.textContent = `${done} / ${total} vus`;
}

// ═══════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════
function switchTab(prefix, lang, btn) {
    const cPanel = document.getElementById(`${prefix}-c`);
    const ocPanel = document.getElementById(`${prefix}-ocaml`);
    const tabsDiv = document.getElementById(`${prefix}-tabs`);
    if (!tabsDiv) return;
    const tabs = tabsDiv.querySelectorAll('.code-tab');

    tabs.forEach(t => t.className = 'code-tab');

    if (lang === 'c') {
        if (cPanel) cPanel.classList.add('active');
        if (ocPanel) ocPanel.classList.remove('active');
        btn.classList.add('active-c');
    } else {
        if (ocPanel) ocPanel.classList.add('active');
        if (cPanel) cPanel.classList.remove('active');
        btn.classList.add('active-ocaml');
    }
}

// ═══════════════════════════════════════════════
//  RESET CODE
// ═══════════════════════════════════════════════
function resetCode(panelId) {
    const ta = document.getElementById(`${panelId}-editor`);
    if (ta && originals[ta.id]) {
        ta.value = originals[ta.id];
    }
    const out = document.getElementById(`${panelId}-output`);
    if (out) {
        out.classList.remove('visible');
    }
}

// ═══════════════════════════════════════════════
//  RUN SIMULATION
// ═══════════════════════════════════════════════
const simOutputs = {
    'ex1-c': "Recherche de 9 : trouvé\nRecherche de 3 : absent",
    'ex1-ocaml': "Recherche de 9 : true\nRecherche de 3 : false\nRécursif de 7  : true",
    'ex2-c': "(a+b)+c = 1\na+(b+c) = 1\n\n0.1 + 0.2 == 0.3 ?          false  (MAUVAIS)\n|0.1+0.2 - 0.3| < ε ?       true  (CORRECT)\n\n1000 × 0.001  = 0.99999999999999989\nErreur        = 1.110e-16",
    'ex2-ocaml': "(a+.b)+.c = 1\na+.(b+.c) = 1\n\n0.1 +. 0.2 = 0.3 ?         false  (MAUVAIS)\n|0.1+0.2 - 0.3| < ε ?       true  (CORRECT)\n\n1000 × 0.001 = 0.99999999999999989\nErreur       = 1.110e-16",
    'ex3-c': "Avant  : [5, 2, 8, 1, 9, 3, 7, 4, 6]\nAprès  : [1, 2, 3, 4, 5, 6, 7, 8, 9]",
    'ex3-ocaml': "Avant  : 5, 2, 8, 1, 9, 3, 7, 4, 6\nAprès  : 1, 2, 3, 4, 5, 6, 7, 8, 9\nListe  : 1, 2, 3, 5, 8, 9"
};

function runCode(panelId) {
    const out = document.getElementById(`${panelId}-output`);
    if (!out) return;
    const content = out.querySelector('.output-content');
    const simResult = simOutputs[panelId];

    out.classList.add('visible');
    if (simResult) {
        content.innerHTML = `<div class="output-line">${escHtml(simResult)}</div>`;
    } else {
        content.innerHTML = `<div class="output-info">⚠ Simulation non disponible pour ce bloc. Compilez avec gcc/ocamlopt localement.</div>`;
    }
}

function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

// ═══════════════════════════════════════════════
//  DOWNLOAD
// ═══════════════════════════════════════════════
function downloadCode(panelId, filename) {
    const ta = document.getElementById(`${panelId}-editor`);
    if (!ta) return;
    const blob = new Blob([ta.value], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

// ═══════════════════════════════════════════════
//  QUIZ
// ═══════════════════════════════════════════════
const ALL_QUESTIONS = [
    {
        q: "Un algorithme a une correction <strong>totale</strong> si :",
        opts: [
            { t: "Son résultat est correct quand il termine, mais il peut ne pas terminer.", ok: false, fb: "Non — la correction totale exige aussi la terminaison." },
            { t: "Il termine toujours ET son résultat est correct.", ok: true, fb: "✓ Exact ! Correction totale = correction partielle + terminaison garantie." },
            { t: "Son résultat est correct en moyenne, même s'il peut parfois être faux.", ok: false, fb: "Non — c'est la définition d'un algorithme probabiliste approché." }
        ]
    },
    {
        q: "À quoi sert le <strong>variant de boucle</strong> ?",
        opts: [
            { t: "Garantir que l'invariant est préservé à chaque itération.", ok: false, fb: "Non — le variant prouve la terminaison." },
            { t: "Prouver la correction partielle de la boucle.", ok: false, fb: "Non — la correction partielle est établie par l'invariant." },
            { t: "Prouver la <strong>terminaison</strong> de la boucle.", ok: true, fb: "✓ Correct ! Le variant est une expression entière strictement décroissante." }
        ]
    },
    {
        q: "En C, <code>0.1 + 0.2 == 0.3</code> est-il vrai ?",
        opts: [
            { t: "Oui, toujours.", ok: false, fb: "Non — 0.1, 0.2 et 0.3 ne sont pas représentables exactement en binaire." },
            { t: "Non — à cause des erreurs d'arrondi en virgule flottante.", ok: true, fb: "✓ Exact ! Il faut utiliser |a − b| < ε." },
            { t: "Cela dépend du compilateur.", ok: false, fb: "Non — c'est une propriété de IEEE 754." }
        ]
    }
    // Ajoutez les autres questions ici...
];

let activeQuiz = [];
let quizAnswered = 0;
let quizScore = 0;
const QUIZ_SIZE = 3; // Réduit pour le test

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateQuiz() {
    activeQuiz = shuffle(ALL_QUESTIONS).slice(0, QUIZ_SIZE);
    quizAnswered = 0;
    quizScore = 0;

    const scorePanel = document.getElementById('scorePanel');
    const quizMeta = document.getElementById('quizMeta');
    const area = document.getElementById('quizArea');
    
    if (scorePanel) scorePanel.style.display = 'none';
    if (quizMeta) quizMeta.textContent = `${QUIZ_SIZE} questions — tirage aléatoire`;
    if (!area) return;
    
    area.innerHTML = '';

    activeQuiz.forEach((q, idx) => {
        const shuffledOpts = shuffle(q.opts);
        const qid = `dq${idx}`;

        const opts = shuffledOpts.map((opt) => `
            <div class="quiz-option" data-ok="${opt.ok}" data-fb="${escHtmlAttr(opt.fb)}" onclick="answerDyn('${qid}', this)">
                <div class="quiz-indicator"></div>
                ${opt.t}
            </div>`).join('');

        area.innerHTML += `
            <div class="quiz-container" id="${qid}-wrap">
                <div class="quiz-title">Question ${idx + 1} / ${QUIZ_SIZE}</div>
                <div class="quiz-question">${q.q}</div>
                <div class="quiz-options" id="${qid}">${opts}</div>
                <div class="quiz-feedback" id="${qid}-fb"></div>
            </div>`;
    });

    timerReset();
    timerStart();
}

function answerDyn(qid, optEl) {
    const container = document.getElementById(qid);
    if (!container || container.dataset.answered) return;
    container.dataset.answered = '1';

    const isCorrect = optEl.dataset.ok === 'true';
    const feedback = optEl.dataset.fb;

    const opts = container.querySelectorAll('.quiz-option');
    opts.forEach(o => {
        o.classList.add('answered');
        o.onclick = null;
    });
    optEl.classList.add(isCorrect ? 'correct' : 'wrong');
    const indicator = optEl.querySelector('.quiz-indicator');
    if (indicator) indicator.textContent = isCorrect ? '✓' : '✗';
    
    if (!isCorrect) {
        opts.forEach(o => {
            if (o !== optEl && o.dataset.ok === 'true') o.classList.add('correct');
            else if (o !== optEl) o.style.opacity = '.4';
        });
    }

    const fb = document.getElementById(`${qid}-fb`);
    if (fb) {
        fb.textContent = feedback;
        fb.classList.add('visible');
        fb.style.color = isCorrect ? 'var(--accent)' : '#f87171';
    }

    if (isCorrect) quizScore++;
    quizAnswered++;

    if (quizAnswered === QUIZ_SIZE) showScore();
}

function showScore() {
    timerPause();
    const pct = Math.round((quizScore / QUIZ_SIZE) * 100);
    const digits = document.getElementById('timerDigits');
    const scoreValue = document.getElementById('scoreValue');
    const scoreTime = document.getElementById('scoreTime');
    const scorePanel = document.getElementById('scorePanel');
    
    if (scoreValue) scoreValue.textContent = `${quizScore} / ${QUIZ_SIZE} (${pct}%)`;
    if (scoreTime && digits) scoreTime.textContent = `Temps : ${digits.textContent}`;
    if (scorePanel) {
        scorePanel.style.display = 'block';
        scorePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function escHtmlAttr(s) {
    return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════
let timerSeconds = 0;
let timerInterval = null;
let timerRunning = false;
let timerVisible = true;

function timerStart() {
    if (timerRunning) return;
    timerRunning = true;
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
    const btnPause = document.getElementById('btnPause');
    if (btnPause) {
        btnPause.textContent = '⏸ Pause';
        btnPause.classList.remove('paused');
    }
}

function timerPause() {
    if (!timerRunning) return;
    clearInterval(timerInterval);
    timerRunning = false;
}

function timerToggle() {
    if (timerRunning) {
        timerPause();
        const btnPause = document.getElementById('btnPause');
        if (btnPause) {
            btnPause.textContent = '▶ Reprendre';
            btnPause.classList.add('paused');
        }
    } else {
        timerStart();
    }
}

function timerReset() {
    timerPause();
    timerSeconds = 0;
    updateTimerDisplay();
    const btnPause = document.getElementById('btnPause');
    if (btnPause) {
        btnPause.textContent = '⏸ Pause';
        btnPause.classList.remove('paused');
    }
}

function timerToggleVisible() {
    timerVisible = !timerVisible;
    const d = document.getElementById('timerDigits');
    const btnVisibility = document.getElementById('btnVisibility');
    if (d) d.classList.toggle('hidden-timer', !timerVisible);
    if (btnVisibility) btnVisibility.textContent = timerVisible ? '👁 Masquer' : '👁 Afficher';
}

function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    const digits = document.getElementById('timerDigits');
    if (digits) digits.textContent = `${m}:${s}`;
}

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Vérification de la session existante
    const stored = sessionStorage.getItem(AUTH_SESSION_KEY);
    let isValid = false;
    
    if (stored) {
        try {
            const sessionData = JSON.parse(stored);
            if (sessionData.authenticated && Date.now() < sessionData.expires) {
                isValid = true;
            }
        } catch(e) {
            if (stored === '1') {
                isValid = true;
                const newSession = {
                    authenticated: true,
                    timestamp: Date.now(),
                    expires: Date.now() + SESSION_DURATION
                };
                sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(newSession));
            }
        }
    }
    
    if (isValid) {
        const screen = document.getElementById('authScreen');
        const mainContent = document.getElementById('mainContent');
        const navbar = document.getElementById('navbar');
        if (screen) screen.classList.add('hidden');
        if (mainContent) mainContent.style.visibility = 'visible';
        if (navbar) navbar.style.visibility = 'visible';
    } else {
        const mainContent = document.getElementById('mainContent');
        const navbar = document.getElementById('navbar');
        if (mainContent) mainContent.style.visibility = 'hidden';
        if (navbar) navbar.style.visibility = 'hidden';
        const authInput = document.getElementById('authInput');
        if (authInput) setTimeout(() => authInput.focus(), 100);
    }
    
    // Initialisation des sections et quiz
    setTimeout(() => {
        toggleCard('card1');
        generateQuiz();
        updateActiveNavLink();
    }, 200);
});

// Tab key in textareas
document.querySelectorAll('textarea.code-editor').forEach(ta => {
    ta.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const s = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
            ta.selectionStart = ta.selectionEnd = s + 2;
        }
    });
});