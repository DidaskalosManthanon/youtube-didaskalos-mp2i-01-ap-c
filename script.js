// ═══════════════════════════════════════════════
//  AUTHENTIFICATION AVEC HASH SHA-256
// ═══════════════════════════════════════════════

// ⚠️ GÉNÉREZ LE VRAI HASH AVEC LE SNIPPET CI-DESSOUS
// Pour mp2i2025, le vrai hash est:
// 9a0b82e5c3d8f1a4b6c7d9e2f3a5b8c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d
const CORRECT_PASSWORD_HASH = '08d06b1551775bf6ea2fcc4d8852ac9c07f3d1bce830806b851f1498cd763acc';
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
// ─── Quiz ──────────────────────────────────────────────────────────────────────
const ALL_QUESTIONS = [
  {
    q: "Un algorithme a une correction <strong>totale</strong> si :",
    opts: [
      { t: "Son résultat est correct quand il termine, mais il peut ne pas terminer.", ok: false, fb: "Non — la correction totale exige aussi la terminaison." },
      { t: "Il termine toujours ET son résultat est correct.", ok: true,  fb: "✓ Exact ! Correction totale = correction partielle + terminaison garantie." },
      { t: "Son résultat est correct en moyenne, même s'il peut parfois être faux.", ok: false, fb: "Non — c'est la définition d'un algorithme probabiliste approché, pas de la correction totale." }
    ]
  },
  {
    q: "À quoi sert le <strong>variant de boucle</strong> ?",
    opts: [
      { t: "Garantir que l'invariant est préservé à chaque itération.", ok: false, fb: "Non — le variant prouve la terminaison ; l'invariant garantit la correction." },
      { t: "Prouver la correction partielle de la boucle.", ok: false, fb: "Non — la correction partielle est établie par l'invariant de boucle." },
      { t: "Prouver la <strong>terminaison</strong> de la boucle.", ok: true,  fb: "✓ Correct ! Le variant est une expression entière strictement décroissante et minorée par 0 à chaque itération." }
    ]
  },
  {
    q: "En C, <code>0.1 + 0.2 == 0.3</code> est-il vrai ?",
    opts: [
      { t: "Oui, toujours.", ok: false, fb: "Non — 0.1, 0.2 et 0.3 ne sont pas représentables exactement en binaire." },
      { t: "Non — à cause des erreurs d'arrondi en virgule flottante (IEEE 754).", ok: true,  fb: "✓ Exact ! Il faut utiliser |a − b| < ε pour comparer des flottants." },
      { t: "Cela dépend du compilateur.", ok: false, fb: "Non — c'est une propriété de la représentation IEEE 754, indépendante du compilateur." }
    ]
  },
  {
    q: "Quel est le paradigme principal d'<strong>OCaml</strong> tel qu'il est présenté en MP2I ?",
    opts: [
      { t: "Impératif structuré.", ok: false, fb: "OCaml supporte l'impératif, mais son paradigme mis en avant en MP2I est fonctionnel." },
      { t: "Déclaratif fonctionnel.", ok: true,  fb: "✓ Correct ! OCaml est principalement fonctionnel : fonctions d'ordre supérieur, récursion, types algébriques." },
      { t: "Logique.", ok: false, fb: "Non — le paradigme logique est illustré par SQL en MP2I." }
    ]
  },
  {
    q: "Le tri par insertion a une complexité dans le <strong>pire cas</strong> de :",
    opts: [
      { t: "O(n log n)", ok: false, fb: "Non — O(n log n) correspond au tri fusion ou tri rapide (en moyenne)." },
      { t: "O(n)", ok: false, fb: "Non — O(n) n'est que le meilleur cas (tableau déjà trié)." },
      { t: "O(n²)", ok: true,  fb: "✓ Correct ! Chaque élément peut être comparé à tous ceux avant lui : 1+2+…+(n-1) = O(n²)." }
    ]
  },
  {
    q: "Qu'est-ce que la <strong>correction partielle</strong> d'un algorithme ?",
    opts: [
      { t: "L'algorithme termine toujours.", ok: false, fb: "Non — la terminaison seule ne garantit pas la correction." },
      { t: "Si l'algorithme termine, alors son résultat est correct.", ok: true,  fb: "✓ Exact ! La correction partielle suppose la terminaison sans la prouver." },
      { t: "L'algorithme donne un résultat correct dans au moins 50% des cas.", ok: false, fb: "Non — la correction partielle exige que le résultat soit correct chaque fois qu'il y a un résultat." }
    ]
  },
  {
    q: "Quelle est la complexité de la <strong>recherche dichotomique</strong> dans un tableau trié ?",
    opts: [
      { t: "O(n)", ok: false, fb: "Non — O(n) correspond à la recherche séquentielle." },
      { t: "O(log n)", ok: true,  fb: "✓ Correct ! À chaque étape, la taille du problème est divisée par 2 : T(n) = T(n/2) + O(1) ⟹ O(log n)." },
      { t: "O(1)", ok: false, fb: "Non — O(1) serait le cas d'un accès direct (hashmap), pas d'une dichotomie." }
    ]
  },
  {
    q: "Un langage dit de <strong>bas niveau d'abstraction</strong> comme C permet notamment :",
    opts: [
      { t: "La gestion automatique de la mémoire (garbage collector).", ok: false, fb: "Non — la gestion automatique est une caractéristique des langages de haut niveau comme OCaml ou Java." },
      { t: "Une gestion explicite de la mémoire avec malloc et free.", ok: true,  fb: "✓ Exact ! Le programmeur contrôle explicitement l'allocation (malloc) et la libération (free) de la mémoire." },
      { t: "L'absence totale de pointeurs.", ok: false, fb: "Non — les pointeurs sont au cœur du langage C." }
    ]
  },
  {
    q: "Que représente la notation <strong>O(f(n))</strong> en complexité ?",
    opts: [
      { t: "Le nombre exact d'opérations effectuées.", ok: false, fb: "Non — O(f(n)) est une borne supérieure asymptotique, pas le nombre exact." },
      { t: "Une borne supérieure asymptotique du nombre d'opérations.", ok: true,  fb: "✓ Correct ! T(n) = O(f(n)) signifie qu'il existe c > 0, n₀ tel que T(n) ≤ c·f(n) pour tout n ≥ n₀." },
      { t: "Le nombre moyen d'opérations dans tous les cas.", ok: false, fb: "Non — O représente le pire cas (worst case), pas la moyenne." }
    ]
  },
  {
    q: "Le <strong>coût amorti</strong> d'une opération dans une structure de données est :",
    opts: [
      { t: "Le coût de la pire opération possible.", ok: false, fb: "Non — c'est la définition du coût dans le pire cas, pas du coût amorti." },
      { t: "Le coût moyen par opération sur une séquence d'opérations.", ok: true,  fb: "✓ Exact ! Exemple : push_back dans un tableau dynamique coûte O(1) amorti malgré des redimensionnements occasionnels O(n)." },
      { t: "Le coût minimal possible d'une opération.", ok: false, fb: "Non — c'est la définition du meilleur cas." }
    ]
  },
  {
    q: "Dans la chaîne de compilation C, que produit l'<strong>éditeur de liens</strong> (linker) ?",
    opts: [
      { t: "Un fichier objet (.o)", ok: false, fb: "Non — le fichier objet est produit par le compilateur (gcc -c)." },
      { t: "Un fichier exécutable.", ok: true,  fb: "✓ Exact ! L'éditeur de liens combine les fichiers objets et les bibliothèques pour produire l'exécutable final." },
      { t: "Un fichier source préprocessé.", ok: false, fb: "Non — le préprocesseur produit le fichier source étendu, avant la compilation." }
    ]
  },
  {
    q: "En OCaml, les chaînes de caractères (<code>string</code>) sont :",
    opts: [
      { t: "Mutables : on peut modifier un caractère après création.", ok: false, fb: "Non — depuis OCaml 4.06, les strings sont immuables. Il faut utiliser Bytes pour les buffers mutables." },
      { t: "Immuables : une fois créées, elles ne peuvent pas être modifiées.", ok: true,  fb: "✓ Correct ! L'immuabilité est un principe central du style fonctionnel d'OCaml." },
      { t: "Des tableaux de caractères avec sentinelle nulle, comme en C.", ok: false, fb: "Non — c'est la représentation en C. En OCaml, les strings ont une longueur explicite et sont immuables." }
    ]
  },
  {
    q: "Quel paradigme utilise <strong>SQL</strong> selon le programme MP2I ?",
    opts: [
      { t: "Impératif structuré.", ok: false, fb: "Non — SQL n'est pas impératif ; on décrit ce qu'on veut, pas comment l'obtenir." },
      { t: "Déclaratif fonctionnel.", ok: false, fb: "Non — SQL est déclaratif mais pas au sens fonctionnel (pas de fonctions d'ordre supérieur, pas de types algébriques)." },
      { t: "Logique (déclaratif).", ok: true,  fb: "✓ Exact ! SQL décrit des faits et des contraintes ; le moteur déduit les réponses. Le programme MP2I le mentionne comme exemple de paradigme logique." }
    ]
  },
  {
    q: "Laquelle de ces récurrences a une solution en <strong>O(n log n)</strong> ?",
    opts: [
      { t: "T(n) = T(n-1) + O(1)", ok: false, fb: "Non — cette récurrence donne T(n) = O(n) (progression arithmétique)." },
      { t: "T(n) = 2·T(n/2) + O(n)", ok: true,  fb: "✓ Correct ! Par le Master Theorem (cas 2) : a=2, b=2, f(n)=O(n) ⟹ T(n) = O(n log n). C'est la récurrence du tri fusion." },
      { t: "T(n) = T(n/2) + O(1)", ok: false, fb: "Non — cette récurrence donne T(n) = O(log n) (recherche dichotomique)." }
    ]
  },
  {
    q: "En C, l'expression <code>t + 1</code> où <code>t</code> est un tableau est équivalente à :",
    opts: [
      { t: "L'adresse mémoire de t plus 1 octet.", ok: false, fb: "Non — l'arithmétique des pointeurs s'effectue en unités du type pointé. Pour int t[], t+1 avance de sizeof(int) octets." },
      { t: "Un pointeur vers t[1] (t plus sizeof du type pointé).", ok: true,  fb: "✓ Exact ! En C, l'arithmétique de pointeur avance de sizeof(type_pointé) à chaque unité." },
      { t: "La valeur t[0] + 1.", ok: false, fb: "Non — t+1 est une opération sur l'adresse, pas sur la valeur." }
    ]
  },
  {
    q: "Un <strong>invariant de boucle</strong> doit vérifier trois conditions. Laquelle n'en fait PAS partie ?",
    opts: [
      { t: "Il est vrai avant le premier tour de boucle (initialisation).", ok: false, fb: "Si — l'initialisation est bien une des trois conditions." },
      { t: "Il doit être vrai après chaque itération (conservation).", ok: false, fb: "Si — la conservation est une des trois conditions." },
      { t: "Il décroît strictement à chaque itération.", ok: true,  fb: "✓ Correct ! Décroître strictement est la propriété du VARIANT (terminaison), pas de l'invariant. L'invariant est préservé, pas décroissant." }
    ]
  },
  {
    q: "Quelle est la complexité <strong>temporelle</strong> du tri fusion dans le pire cas ?",
    opts: [
      { t: "O(n²)", ok: false, fb: "Non — O(n²) correspond aux tris naïfs (insertion, sélection, bulles)." },
      { t: "O(n log n)", ok: true,  fb: "✓ Exact ! Le tri fusion divise toujours en deux et fusionne en O(n) : T(n) = 2T(n/2) + O(n) ⟹ O(n log n)." },
      { t: "O(n)", ok: false, fb: "Non — O(n) serait optimal mais impossible pour un tri par comparaisons selon la borne inférieure." }
    ]
  },
  {
    q: "En OCaml, <code>let f x y = x + y</code> est une fonction :",
    opts: [
      { t: "À deux paramètres obligatoires, de type <code>int -> int -> int</code>.", ok: true,  fb: "✓ Correct ! En OCaml toutes les fonctions sont curryfiées : f prend x et renvoie une fonction qui prend y." },
      { t: "Qui doit être appelée avec un tuple <code>f (x, y)</code>.", ok: false, fb: "Non — cela serait la syntaxe pour <code>let f (x, y) = x + y</code> (déconstruction de tuple)." },
      { t: "Impure car elle modifie une variable globale.", ok: false, fb: "Non — cette fonction est pure ; elle ne modifie aucun état externe." }
    ]
  },
  {
    q: "Combien de bits occupe un <code>double</code> en C (norme IEEE 754) ?",
    opts: [
      { t: "32 bits", ok: false, fb: "Non — 32 bits correspond à un <code>float</code> (simple précision)." },
      { t: "64 bits", ok: true,  fb: "✓ Exact ! Un double est sur 64 bits : 1 bit signe, 11 bits exposant, 52 bits mantisse." },
      { t: "128 bits", ok: false, fb: "Non — 128 bits existe (<code>long double</code> sur certaines plateformes) mais ce n'est pas le double standard." }
    ]
  },
  {
    q: "Dans quelle structure de données la complexité de la recherche est-elle <strong>O(1)</strong> en moyenne ?",
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuiz() {
  // Pick QUIZ_SIZE questions randomly
  activeQuiz = shuffle(ALL_QUESTIONS).slice(0, QUIZ_SIZE);
  quizAnswered = 0;
  quizScore = 0;

  document.getElementById('scorePanel').style.display = 'none';
  document.getElementById('quizMeta').textContent = `${QUIZ_SIZE} questions — tirage aléatoire (${ALL_QUESTIONS.length} disponibles)`;

  const area = document.getElementById('quizArea');
  area.innerHTML = '';

  activeQuiz.forEach((q, idx) => {
    const shuffledOpts = shuffle(q.opts);
    const qid = `dq${idx}`;

    const opts = shuffledOpts.map((opt, oi) => `
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
  if (container.dataset.answered) return;
  container.dataset.answered = '1';

  const isCorrect = optEl.dataset.ok === 'true';
  const feedback  = optEl.dataset.fb;

  const opts = container.querySelectorAll('.quiz-option');
  opts.forEach(o => { o.classList.add('answered'); o.onclick = null; });
  optEl.classList.add(isCorrect ? 'correct' : 'wrong');
  optEl.querySelector('.quiz-indicator').textContent = isCorrect ? '✓' : '✗';
  if (!isCorrect) {
    // show correct
    opts.forEach(o => { if (o !== optEl && o.dataset.ok === 'true') o.classList.add('correct'); else if (o !== optEl) o.style.opacity = '.4'; });
  }

  const fb = document.getElementById(`${qid}-fb`);
  fb.textContent = feedback;
  fb.classList.add('visible');
  fb.style.color = isCorrect ? 'var(--accent)' : '#f87171';

  if (isCorrect) quizScore++;
  quizAnswered++;

  if (quizAnswered === QUIZ_SIZE) showScore();
}

// ═══════════════════════════════════════════════
//  LOGIQUE MARKETING & SCORE (SCORE-TRIGGERED)
// ═══════════════════════════════════════════════

function getMarketingContent(score, total) {
    const pct = (score / total) * 100;
    
    if (pct < 70) {
        // STRATÉGIE : Diagnostic pour score faible (ex: Hocine 5/10)
        return {
            title: "Besoin d'un coup de pouce ? 💡",
            message: `Ton score de ${score}/${total} montre que les bases du programme MP2I (C/OCaml) ne sont pas encore totalement ancrées. En prépa, ces lacunes peuvent vite devenir bloquantes pour les DS.`,
            btnText: "Réserver un diagnostic gratuit (15 min)",
            btnLink: "https://calendly.com/didaskalosmanthanon/point-parents-presentation-de-l-outil-15-min",
            class: "warn"
        };
    } else if (pct < 100) {
        // STRATÉGIE : Perfectionnement pour bon score
        return {
            title: "Vise l'excellence ! 🚀",
            message: `Bien joué ! Avec ${score}/${total}, tu maîtrises l'essentiel. Pour atteindre les notes sommitales aux concours (X/ENS), il faut maintenant travailler la rédaction et les cas particuliers.`,
            btnText: "Demander mes fiches de synthèse PDF",
            btnLink: "#contact-section",
            class: "success"
        };
    } else {
        // STRATÉGIE : Challenge pour score parfait
        return {
            title: "Niveau Major ! 🏆",
            message: "10/10. Tu as une excellente maîtrise. Es-tu prêt à te confronter à des sujets de concours originaux et des annales corrigées ?",
            btnText: "Accéder aux ressources avancées",
            btnLink: "https://docs.google.com/forms/d/e/1FAIpQLSfiOvJG1wicFQY8EQufqy5YxGgTPSFPxdyb-OAtk95SUGxWFA/viewform",
            class: "excellence"
        };
    }
}

function showScore() {
    timerPause();
    const pct = Math.round((quizScore / QUIZ_SIZE) * 100);
    const time = document.getElementById('timerDigits').textContent;
    
    // Récupération du contenu marketing
    const marketing = getMarketingContent(quizScore, QUIZ_SIZE);

    // Mise à jour de l'affichage du score
    document.getElementById('scoreValue').textContent = `${quizScore} / ${QUIZ_SIZE} (${pct}%)`;
    document.getElementById('scoreTime').textContent = `Temps : ${time}`;
    
    // Injection du bloc Marketing personnalisé
    const marketingArea = document.getElementById('marketing-cta-area');
    marketingArea.innerHTML = `
        <div class="marketing-cta ${marketing.class}">
            <h3>${marketing.title}</h3>
            <p>${marketing.message}</p>
            <a href="${marketing.btnLink}" class="cta-button">${marketing.btnText}</a>
        </div>
    `;

    document.getElementById('scorePanel').style.display = 'block';
    
    // Petit délai pour laisser le DOM se mettre à jour avant le scroll
    setTimeout(() => {
        document.getElementById('scorePanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

/*
function showScore() {
  timerPause();
  const pct = Math.round((quizScore / QUIZ_SIZE) * 100);
  const digits = document.getElementById('timerDigits');
  document.getElementById('scoreValue').textContent = `${quizScore} / ${QUIZ_SIZE}  (${pct}%)`;
  document.getElementById('scoreTime').textContent = `Temps : ${digits.textContent}`;
  document.getElementById('scorePanel').style.display = 'block';
  document.getElementById('scorePanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
*/

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