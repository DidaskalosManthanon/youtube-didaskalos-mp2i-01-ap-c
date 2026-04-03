// ═══════════════════════════════════════════════
//  AUTHENTIFICATION AVEC HASH SHA-256
// ═══════════════════════════════════════════════

const CORRECT_PASSWORD_HASH = '08d06b1551775bf6ea2fcc4d8852ac9c07f3d1bce830806b851f1498cd763acc';
const AUTH_SESSION_KEY = 'mp2i_auth';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

let failedAttempts = 0;
let lockoutUntil = null;

// Stockage du prénom pour réutilisation dans sendResultEmail
let currentUserName = "Élève";

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
    const nameInput = document.getElementById('userNameInput');

    // BUG CORRIGÉ : on utilise la variable globale currentUserName
    currentUserName = nameInput?.value.trim().substring(0, 15) || "Élève";

    if (!input) {
        console.error('authInput non trouvé');
        return;
    }

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

    // BUG CORRIGÉ : id unique "authButton" (suppression du double id dans le HTML)
    const btn = document.getElementById('authButton');
    if (btn) {
        btn.innerHTML = '<span>🔐 Vérification...</span>';
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
            sessionStorage.setItem('mp2i_user_name', currentUserName);

            const screen = document.getElementById('authScreen');
            const mainContent = document.getElementById('mainContent');
            const navbar = document.getElementById('navbar');

            const mainTitle = document.querySelector('h1');
            if (mainTitle) mainTitle.innerHTML = `Bonjour ${currentUserName},<br>Algorithmes et <em>Programmes</em>`;

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
            btn.innerHTML = '<span>Entrer</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
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

document.addEventListener('click', e => {
    const links = document.getElementById('navLinks');
    const burger = document.getElementById('navBurger');
    if (links && burger && !links.contains(e.target) && !burger.contains(e.target)) {
        links.classList.remove('open');
        burger.classList.remove('open');
    }
});

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
// BUG CORRIGÉ : la fonction acceptait 2 args mais n'utilisait que le premier.
//               On uniformise : on ne passe qu'un arg depuis le HTML.
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

// Labels lisibles pour les catégories
const CAT_LABELS = {
    'preuve':          'Preuve d\'algorithmes (terminaison, correction, invariant)',
    'représentation':  'Représentation des données (flottants, pointeurs)',
    'complexité':      'Complexité algorithmique',
    'paradigme':       'Paradigmes de programmation',
    'compilation':     'Compilation & interprétation'
};

// Conseils par catégorie
const CAT_ADVICE = {
    'preuve':          'Relis la définition de variant et d\'invariant de boucle. Pratique avec des boucles simples (tri insertion, recherche séquentielle).',
    'représentation':  'Approfondis la norme IEEE 754 : signe, exposant, mantisse. Teste des comparaisons de flottants en C et OCaml.',
    'complexité':      'Revois le Master Theorem et les récurrences classiques. Entraîne-toi sur le tri fusion, la dichotomie, et les tris quadratiques.',
    'paradigme':       'Compare les mêmes algorithmes en C et en OCaml. Focus sur le style récursif vs itératif, et la currification en OCaml.',
    'compilation':     'Relis la différence compilation/interprétation, les fichiers .h / .c en C, et le processus gcc → objet → exécutable.'
};

const ALL_QUESTIONS = [
  {
    q: "Un algorithme a une correction <strong>totale</strong> si :",
    cat: "preuve",
    opts: [
      { t: "Son résultat est correct quand il termine, mais il peut ne pas terminer.", ok: false, fb: "Non — la correction totale exige aussi la terminaison." },
      { t: "Il termine toujours ET son résultat est correct.", ok: true,  fb: "✓ Exact ! Correction totale = correction partielle + terminaison garantie." },
      { t: "Son résultat est correct en moyenne, même s'il peut parfois être faux.", ok: false, fb: "Non — c'est la définition d'un algorithme probabiliste approché, pas de la correction totale." }
    ]
  },
  {
    q: "À quoi sert le <strong>variant de boucle</strong> ?",
    cat: "preuve",
    opts: [
      { t: "Garantir que l'invariant est préservé à chaque itération.", ok: false, fb: "Non — le variant prouve la terminaison ; l'invariant garantit la correction." },
      { t: "Prouver la correction partielle de la boucle.", ok: false, fb: "Non — la correction partielle est établie par l'invariant de boucle." },
      { t: "Prouver la <strong>terminaison</strong> de la boucle.", ok: true,  fb: "✓ Correct ! Le variant est une expression entière strictement décroissante et minorée par 0 à chaque itération." }
    ]
  },
  {
    q: "En C, <code>0.1 + 0.2 == 0.3</code> est-il vrai ?",
    cat: "représentation",
    opts: [
      { t: "Oui, toujours.", ok: false, fb: "Non — 0.1, 0.2 et 0.3 ne sont pas représentables exactement en binaire." },
      { t: "Non — à cause des erreurs d'arrondi en virgule flottante (IEEE 754).", ok: true,  fb: "✓ Exact ! Il faut utiliser |a − b| < ε pour comparer des flottants." },
      { t: "Cela dépend du compilateur.", ok: false, fb: "Non — c'est une propriété de la représentation IEEE 754, indépendante du compilateur." }
    ]
  },
  {
    q: "Quel est le paradigme principal d'<strong>OCaml</strong> tel qu'il est présenté en MP2I ?",
    cat: "paradigme",
    opts: [
      { t: "Impératif structuré.", ok: false, fb: "Non — OCaml peut être utilisé de manière impérative, mais son paradigme principal en MP2I est fonctionnel." },
      { t: "Déclaratif fonctionnel.", ok: true,  fb: "✓ Correct ! OCaml est présenté en MP2I comme le langage fonctionnel, par opposition à C (impératif)." },
      { t: "Logique (déclaratif).", ok: false, fb: "Non — le paradigme logique est illustré par SQL, pas par OCaml." }
    ]
  },
  {
    q: "Quelle est la différence entre <strong>compilation</strong> et <strong>interprétation</strong> ?",
    cat: "compilation",
    opts: [
      { t: "Un compilateur traduit le code source en code machine avant l'exécution ; un interpréteur l'exécute ligne par ligne à la volée.", ok: true,  fb: "✓ Exact ! En C, gcc compile tout en un exécutable. En Python, l'interpréteur lit et exécute le code à la volée." },
      { t: "L'interprétation est toujours plus rapide car elle n'a pas de phase de compilation.", ok: false, fb: "Non — c'est l'inverse : le code compilé est généralement plus rapide car optimisé en amont." },
      { t: "La compilation et l'interprétation produisent exactement le même fichier exécutable.", ok: false, fb: "Non — la compilation produit un binaire natif ; l'interprétation ne génère pas de fichier exécutable précompilé." }
    ]
  },
  {
    q: "Laquelle de ces affirmations sur les <strong>invariants de boucle</strong> est correcte ?",
    cat: "preuve",
    opts: [
      { t: "Un invariant doit être faux avant la boucle pour garantir la correction.", ok: false, fb: "Non — l'invariant doit être VRAI avant la première itération (initialisation)." },
      { t: "Un invariant vrai à l'entrée et préservé à chaque itération est vrai à la sortie de boucle.", ok: true,  fb: "✓ Correct ! C'est exactement le principe du raisonnement par invariant (similaire à l'induction)." },
      { t: "Un invariant sert uniquement à prouver la terminaison.", ok: false, fb: "Non — la terminaison est prouvée par le variant. L'invariant prouve la correction partielle." }
    ]
  },
  {
    q: "Pourquoi SQL est-il un exemple de paradigme <strong>logique</strong> selon le programme MP2I ?",
    cat: "paradigme",
    opts: [
      { t: "Parce qu'il utilise des boucles for et des conditions if.", ok: false, fb: "Non — les boucles et conditions sont typiques du paradigme impératif." },
      { t: "Parce qu'il décrit des faits et des contraintes et laisse le moteur déduire les résultats.", ok: true,  fb: "✓ Exact ! SQL décrit des faits et des contraintes ; le moteur déduit les réponses. Le programme MP2I le mentionne comme exemple de paradigme logique." },
      { t: "Déclaratif fonctionnel.", ok: false, fb: "Non — SQL est déclaratif mais pas au sens fonctionnel (pas de fonctions d'ordre supérieur, pas de types algébriques)." }
    ]
  },
  {
    q: "Laquelle de ces récurrences a une solution en <strong>O(n log n)</strong> ?",
    cat: "complexité",
    opts: [
      { t: "T(n) = T(n-1) + O(1)", ok: false, fb: "Non — cette récurrence donne T(n) = O(n) (progression arithmétique)." },
      { t: "T(n) = 2·T(n/2) + O(n)", ok: true,  fb: "✓ Correct ! Par le Master Theorem (cas 2) : a=2, b=2, f(n)=O(n) ⟹ T(n) = O(n log n). C'est la récurrence du tri fusion." },
      { t: "T(n) = T(n/2) + O(1)", ok: false, fb: "Non — cette récurrence donne T(n) = O(log n) (recherche dichotomique)." }
    ]
  },
  {
    q: "En C, l'expression <code>t + 1</code> où <code>t</code> est un tableau est équivalente à :",
    cat: "représentation",
    opts: [
      { t: "L'adresse mémoire de t plus 1 octet.", ok: false, fb: "Non — l'arithmétique des pointeurs s'effectue en unités du type pointé. Pour int t[], t+1 avance de sizeof(int) octets." },
      { t: "Un pointeur vers t[1] (t plus sizeof du type pointé).", ok: true,  fb: "✓ Exact ! En C, l'arithmétique de pointeur avance de sizeof(type_pointé) à chaque unité." },
      { t: "La valeur t[0] + 1.", ok: false, fb: "Non — t+1 est une opération sur l'adresse, pas sur la valeur." }
    ]
  },
  {
    q: "Un <strong>invariant de boucle</strong> doit vérifier trois conditions. Laquelle n'en fait PAS partie ?",
    cat: "preuve",
    opts: [
      { t: "Il est vrai avant le premier tour de boucle (initialisation).", ok: false, fb: "Si — l'initialisation est bien une des trois conditions." },
      { t: "Il doit être vrai après chaque itération (conservation).", ok: false, fb: "Si — la conservation est une des trois conditions." },
      { t: "Il décroît strictement à chaque itération.", ok: true,  fb: "✓ Correct ! Décroître strictement est la propriété du VARIANT (terminaison), pas de l'invariant. L'invariant est préservé, pas décroissant." }
    ]
  },
  {
    q: "Quelle est la complexité <strong>temporelle</strong> du tri fusion dans le pire cas ?",
    cat: "complexité",
    opts: [
      { t: "O(n²)", ok: false, fb: "Non — O(n²) correspond aux tris naïfs (insertion, sélection, bulles)." },
      { t: "O(n log n)", ok: true,  fb: "✓ Exact ! Le tri fusion divise toujours en deux et fusionne en O(n) : T(n) = 2T(n/2) + O(n) ⟹ O(n log n)." },
      { t: "O(n)", ok: false, fb: "Non — O(n) serait optimal mais impossible pour un tri par comparaisons selon la borne inférieure." }
    ]
  },
  {
    q: "En OCaml, <code>let f x y = x + y</code> est une fonction :",
    cat: "paradigme",
    opts: [
      { t: "À deux paramètres obligatoires, de type <code>int -> int -> int</code>.", ok: true,  fb: "✓ Correct ! En OCaml toutes les fonctions sont curryfiées : f prend x et renvoie une fonction qui prend y." },
      { t: "Qui doit être appelée avec un tuple <code>f (x, y)</code>.", ok: false, fb: "Non — cela serait la syntaxe pour <code>let f (x, y) = x + y</code> (déconstruction de tuple)." },
      { t: "Impure car elle modifie une variable globale.", ok: false, fb: "Non — cette fonction est pure ; elle ne modifie aucun état externe." }
    ]
  },
  {
    q: "Combien de bits occupe un <code>double</code> en C (norme IEEE 754) ?",
    cat: "représentation",
    opts: [
      { t: "32 bits", ok: false, fb: "Non — 32 bits correspond à un <code>float</code> (simple précision)." },
      { t: "64 bits", ok: true,  fb: "✓ Exact ! Un double est sur 64 bits : 1 bit signe, 11 bits exposant, 52 bits mantisse." },
      { t: "128 bits", ok: false, fb: "Non — 128 bits existe (<code>long double</code> sur certaines plateformes) mais ce n'est pas le double standard." }
    ]
  },
  {
    q: "Dans quelle structure de données la complexité de la recherche est-elle <strong>O(1)</strong> en moyenne ?",
    cat: "complexité",
    opts: [
      { t: "Tableau trié", ok: false, fb: "Non — dans un tableau trié, la recherche par dichotomie est O(log n)." },
      { t: "Table de hachage (hashtable)", ok: true,  fb: "✓ Exact ! En moyenne (et avec une bonne fonction de hachage), la recherche dans une hashtable est O(1) amorti." },
      { t: "Arbre binaire de recherche non équilibré", ok: false, fb: "Non — dans le pire cas (arbre dégénéré), la recherche est O(n)." }
    ]
  }
];

let activeQuiz = [];
let quizAnswered = 0;
let quizScore = 0;
const QUIZ_SIZE = 10;

// BUG CORRIGÉ : userAnswers est maintenant déclaré et peuplé
let userAnswers = [];

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
    // BUG CORRIGÉ : on initialise userAnswers avec la bonne taille
    userAnswers = activeQuiz.map(() => ({ ok: null }));

    document.getElementById('scorePanel').style.display = 'none';
    document.getElementById('quizMeta').textContent = `${QUIZ_SIZE} questions — tirage aléatoire (${ALL_QUESTIONS.length} disponibles)`;

    const area = document.getElementById('quizArea');
    area.innerHTML = '';

    activeQuiz.forEach((q, idx) => {
        const shuffledOpts = shuffle(q.opts);
        const qid = `dq${idx}`;

        const opts = shuffledOpts.map((opt, oi) => `
      <div class="quiz-option" data-ok="${opt.ok}" data-fb="${escHtmlAttr(opt.fb)}" onclick="answerDyn('${qid}', ${idx}, this)">
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

// BUG CORRIGÉ : answerDyn reçoit maintenant l'index pour remplir userAnswers
function answerDyn(qid, questionIdx, optEl) {
    const container = document.getElementById(qid);
    if (container.dataset.answered) return;
    container.dataset.answered = '1';

    const isCorrect = optEl.dataset.ok === 'true';
    const feedback = optEl.dataset.fb;

    // BUG CORRIGÉ : on enregistre la réponse dans userAnswers
    userAnswers[questionIdx] = { ok: isCorrect };

    const opts = container.querySelectorAll('.quiz-option');
    opts.forEach(o => { o.classList.add('answered'); o.onclick = null; });
    optEl.classList.add(isCorrect ? 'correct' : 'wrong');
    optEl.querySelector('.quiz-indicator').textContent = isCorrect ? '✓' : '✗';
    if (!isCorrect) {
        opts.forEach(o => {
            if (o !== optEl && o.dataset.ok === 'true') o.classList.add('correct');
            else if (o !== optEl) o.style.opacity = '.4';
        });
    }

    const fb = document.getElementById(`${qid}-fb`);
    fb.textContent = feedback;
    fb.classList.add('visible');
    fb.style.color = isCorrect ? 'var(--accent)' : '#ff4444';

    if (isCorrect) quizScore++;
    quizAnswered++;

    if (quizAnswered === QUIZ_SIZE) {
        setTimeout(() => {
            document.getElementById('scorePanel').scrollIntoView({ behavior: 'smooth' });
        }, 500);
        showScore();
    }
}

// ═══════════════════════════════════════════════
//  LOGIQUE MARKETING & SCORE
// ═══════════════════════════════════════════════

function getMarketingContent(score, total) {
    const pct = (score / total) * 100;

    if (pct < 70) {
        return {
            title: "Besoin d'un coup de pouce ? 💡",
            message: `Ton score de ${score}/${total} montre que les bases du programme MP2I (C/OCaml) ne sont pas encore totalement ancrées. En prépa, ces lacunes peuvent vite devenir bloquantes pour les DS.`,
            btnText: "Réserver un diagnostic gratuit (15 min)",
            btnLink: "https://calendly.com/didaskalosmanthanon/point-parents-presentation-de-l-outil-15-min",
            class: "warn"
        };
    } else if (pct < 100) {
        return {
            title: "Vise l'excellence ! 🚀",
            message: `Bien joué ! Avec ${score}/${total}, tu maîtrises l'essentiel. Pour atteindre les notes sommitales aux concours (X/ENS), il faut maintenant travailler la rédaction et les cas particuliers.`,
            btnText: "Demander mes fiches de synthèse PDF",
            btnLink: "#card5",
            class: "success"
        };
    } else {
        return {
            title: "Niveau Major ! 🏆",
            message: "10/10. Tu as une excellente maîtrise. Es-tu prêt à te confronter à des sujets de concours originaux et des annales corrigées ?",
            btnText: "Accéder aux ressources avancées",
            btnLink: "https://docs.google.com/forms/d/e/1FAIpQLSfiOvJG1wicFQY8EQufqy5YxGgTPSFPxdyb-OAtk95SUGxWFA/viewform",
            class: "excellence"
        };
    }
}

// BUG CORRIGÉ : showScore() utilise désormais userAnswers (correctement peuplé)
//               et la variable stats (plus summary qui n'existait pas)
function showScore() {
    timerPause();
    const pct = Math.round((quizScore / QUIZ_SIZE) * 100);
    const time = document.getElementById('timerDigits').textContent;

    // Analyse des erreurs par catégorie (stats, pas summary)
    const stats = {};
    const totalPerCat = {};

    activeQuiz.forEach((q, idx) => {
        totalPerCat[q.cat] = (totalPerCat[q.cat] || 0) + 1;
        // BUG CORRIGÉ : userAnswers[idx] est maintenant toujours défini
        if (userAnswers[idx] && !userAnswers[idx].ok) {
            stats[q.cat] = (stats[q.cat] || 0) + 1;
        }
    });

    // Récupération du contenu marketing
    const marketing = getMarketingContent(quizScore, QUIZ_SIZE);

    // Mise à jour de l'affichage du score
    document.getElementById('scoreValue').textContent = `${quizScore} / ${QUIZ_SIZE} (${pct}%)`;
    document.getElementById('scoreTime').textContent = `Temps : ${time}`;

    // Construction de l'analyse par catégorie
    let categoryAnalysisHtml = '';
    if (Object.keys(stats).length > 0) {
        // Tri par nombre d'erreurs décroissant
        const sortedErrors = Object.entries(stats).sort((a, b) => b[1] - a[1]);

        const rows = sortedErrors.map(([cat, errCount]) => {
            const total = totalPerCat[cat];
            const ok = total - errCount;
            const pctCat = Math.round((ok / total) * 100);
            const label = CAT_LABELS[cat] || cat;
            const advice = CAT_ADVICE[cat] || '';
            const barColor = pctCat >= 70 ? 'var(--accent)' : pctCat >= 40 ? 'var(--warn)' : '#f87171';

            return `
            <div class="cat-row">
              <div class="cat-info">
                <span class="cat-name">${label}</span>
                <span class="cat-score">${ok}/${total} correct</span>
              </div>
              <div class="cat-bar-wrap">
                <div class="cat-bar-fill" style="width:${pctCat}%; background:${barColor};"></div>
              </div>
              ${errCount > 0 ? `<div class="cat-advice">💡 ${advice}</div>` : ''}
            </div>`;
        }).join('');

        categoryAnalysisHtml = `
        <div class="category-analysis">
          <div class="cat-analysis-title">📊 Analyse par catégorie</div>
          ${rows}
        </div>`;
    } else {
        categoryAnalysisHtml = `<div class="category-analysis perfect"><div class="cat-analysis-title">✅ Score parfait sur toutes les catégories !</div></div>`;
    }

    // BUG CORRIGÉ : on écrit une seule fois dans marketing-cta-area,
    //               avec à la fois l'analyse catégorielle et le bloc marketing
    const marketingArea = document.getElementById('marketing-cta-area');
    marketingArea.innerHTML = `
        ${categoryAnalysisHtml}
        <div class="marketing-cta ${marketing.class}">
            <h3>${marketing.title}</h3>
            <p>${marketing.message}</p>
            <a href="${marketing.btnLink}" class="cta-button">${marketing.btnText}</a>
        </div>
    `;

    document.getElementById('scorePanel').style.display = 'block';

    setTimeout(() => {
        document.getElementById('scorePanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function escHtmlAttr(s) {
    return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Timer ────────────────────────────────────────────────────────────────────
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
    document.getElementById('btnPause').textContent = '⏸ Pause';
    document.getElementById('btnPause').classList.remove('paused');
}

function timerPause() {
    if (!timerRunning) return;
    clearInterval(timerInterval);
    timerRunning = false;
}

function timerToggle() {
    if (timerRunning) {
        timerPause();
        document.getElementById('btnPause').textContent = '▶ Reprendre';
        document.getElementById('btnPause').classList.add('paused');
    } else {
        timerStart();
    }
}

function timerReset() {
    timerPause();
    timerSeconds = 0;
    updateTimerDisplay();
    document.getElementById('btnPause').textContent = '⏸ Pause';
    document.getElementById('btnPause').classList.remove('paused');
}

function timerToggleVisible() {
    timerVisible = !timerVisible;
    const d = document.getElementById('timerDigits');
    d.classList.toggle('hidden-timer', !timerVisible);
    document.getElementById('btnVisibility').textContent = timerVisible ? '👁 Masquer' : '👁 Afficher';
}

function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    document.getElementById('timerDigits').textContent = `${m}:${s}`;
}

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const stored = sessionStorage.getItem(AUTH_SESSION_KEY);
    let isValid = false;

    if (stored) {
        try {
            const sessionData = JSON.parse(stored);
            if (sessionData.authenticated && Date.now() < sessionData.expires) {
                isValid = true;
                // Restaurer le prénom depuis la session
                const savedName = sessionStorage.getItem('mp2i_user_name');
                if (savedName) {
                    currentUserName = savedName;
                    const mainTitle = document.querySelector('h1');
                    if (mainTitle) mainTitle.innerHTML = `Bonjour ${currentUserName},<br>Algorithmes et <em>Programmes</em>`;
                }
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

    setTimeout(() => {
        toggleCard('card1');
        generateQuiz();
        updateActiveNavLink();
        addCopyButtons();
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

function sendResultEmail() {
    const emailDest = "votre-email@exemple.com"; // À remplacer
    const time = document.getElementById('timerDigits')?.textContent || "non chronométré";
    // BUG CORRIGÉ : currentUserName est maintenant une variable globale accessible ici
    const subject = `Résultats Quiz MP2I - ${currentUserName}`;
    const body = `Bonjour,\n\nJe suis ${currentUserName}.\nJ'ai terminé le module "Algorithmes et Programmes".\nMon score final est de : ${quizScore} / ${QUIZ_SIZE}.\nTemps utilisé : ${time}.\n\nMerci de me recontacter pour la suite.`;
    window.location.href = `mailto:${emailDest}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Inactivité
let inactivityTimer;
const FOUR_HOURS = 4 * 60 * 60 * 1000;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutUser, FOUR_HOURS);
}

function logoutUser() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    location.reload();
}

['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
    document.addEventListener(name, resetInactivityTimer, true);
});

document.addEventListener('visibilitychange', () => {
    // Visibility API — extension possible
});

// BUG CORRIGÉ : addCopyButtons cible maintenant les toolbars des panneaux textarea
function addCopyButtons() {
    document.querySelectorAll('.code-toolbar').forEach(toolbar => {
        // Eviter les doublons si appelé plusieurs fois
        if (toolbar.querySelector('.btn-copy')) return;

        const panel = toolbar.closest('.code-panel');
        if (!panel) return;
        const ta = panel.querySelector('textarea.code-editor');
        if (!ta) return;

        const btn = document.createElement('button');
        btn.className = 'btn btn-copy';
        btn.innerHTML = '⎘ Copier';
        btn.title = 'Copier le code';

        btn.onclick = () => {
            navigator.clipboard.writeText(ta.value).then(() => {
                btn.innerHTML = '✓ Copié !';
                btn.classList.add('btn-copy-ok');
                setTimeout(() => {
                    btn.innerHTML = '⎘ Copier';
                    btn.classList.remove('btn-copy-ok');
                }, 2000);
            }).catch(() => {
                // Fallback pour les navigateurs sans clipboard API
                ta.select();
                document.execCommand('copy');
                btn.innerHTML = '✓ Copié !';
                setTimeout(() => btn.innerHTML = '⎘ Copier', 2000);
            });
        };

        // Insérer avant le spacer ou en fin de toolbar
        const spacer = toolbar.querySelector('.toolbar-spacer');
        if (spacer) {
            toolbar.insertBefore(btn, spacer.nextSibling);
        } else {
            toolbar.appendChild(btn);
        }
    });
}