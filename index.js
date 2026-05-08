let WORDS = [];
const GIST_URL = "https://gist.githubusercontent.com/daemondevin/df09befaf533c380743bc2c378863f0c/raw/b79b0628e79766326cdd61cc52a7222b8e5ad49a/5-letter-words.txt";

function initGame() {
    let targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    let currentGuess = "";
    let score = 0;
    let isGameOver = false;
    let timeLeft = 300;
    let timerInterval = null;

    let knownGreens = Array(5).fill(null);
    let knownYellows = new Set();
    let forbiddenGrays = new Set();

    function startTimer() {
        if (timerInterval || isGameOver) return;
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) endGame("TIME EXPIRED");
        }, 1000);
    }

    function updateTimerDisplay() {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        const el = document.getElementById('timer');
        el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        if (timeLeft <= 30) el.classList.add('pressure-text');
    }

    function validateHardMode(guess) {
        for (let i = 0; i < 5; i++) {
            if (knownGreens[i] && guess[i] !== knownGreens[i]) return `Position ${i + 1} must be ${knownGreens[i]}`;
        }
        for (let char of knownYellows) {
            if (!guess.includes(char)) return `Must include the letter '${char}'`;
        }
        for (let char of guess) {
            if (forbiddenGrays.has(char)) return `'${char}' is already ruled out`;
        }
        return null;
    }

    async function submitGuess() {
        if (currentGuess.length !== 5 || isGameOver) return;
        startTimer();

        const error = validateHardMode(currentGuess);
        if (error) {
            showToast(error);
            return;
        }

        const guess = currentGuess;
        const statuses = getStatuses(guess, targetWord);
        const row = document.createElement('div');
        row.className = 'flex gap-2 justify-center';

        for (let i = 0; i < 5; i++) {
            const tile = document.createElement('div');
            tile.className = `tile ${statuses[i]}`;
            tile.textContent = guess[i];
            row.appendChild(tile);

            if (statuses[i] === 'correct') knownGreens[i] = guess[i];
            if (statuses[i] === 'present') knownYellows.add(guess[i]);

            if (statuses[i] === 'absent' && !targetWord.includes(guess[i])) {
                forbiddenGrays.add(guess[i]);
            }

            updateKeyColor(guess[i], statuses[i]);
        }

        document.getElementById('grid').appendChild(row);
        const scroll = document.getElementById('grid-scroll');
        scroll.scrollTop = scroll.scrollHeight;

        currentGuess = "";
        updateInputRow();
        score++;
        document.getElementById('score').textContent = score;

        if (guess === targetWord) endGame("TARGET HIT");
    }

    function getStatuses(guess, target) {
        const tArr = target.split('');
        const gArr = guess.split('');
        const res = Array(5).fill('absent');

        gArr.forEach((c, i) => {
            if (c === tArr[i]) {
                res[i] = 'correct';
                tArr[i] = null;
            }
        });

        gArr.forEach((c, i) => {
            if (res[i] !== 'correct' && tArr.includes(c)) {
                res[i] = 'present';
                tArr[tArr.indexOf(c)] = null;
            }
        });
        return res;
    }

    function updateKeyColor(letter, status) {
        const key = document.querySelector(`.key[data-key="${letter}"]`);
        if (!key) return;

        if (status === 'correct') {
            key.className = 'key correct';
            key.classList.remove('absent');
        } else if (status === 'present' && !key.classList.contains('correct')) {
            key.className = 'key present';
            key.classList.remove('absent');
        } else if (status === 'absent' && !targetWord.includes(letter)) {
            key.classList.add('absent');
        }
    }

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 2500);
        const row = document.getElementById('input-row');
        row.classList.add('shake');
        setTimeout(() => row.classList.remove('shake'), 500);
    }

    function updateInputRow() {
        for (let i = 0; i < 5; i++) {
            const tile = document.getElementById(`t-${i}`);
            tile.textContent = currentGuess[i] || "";
            tile.classList.toggle('active', !!currentGuess[i]);
        }
    }

    function endGame(reason) {
        isGameOver = true;
        clearInterval(timerInterval);
        document.getElementById('end-modal').classList.remove('hidden');
        document.getElementById('target-reveal').textContent = targetWord;
        document.getElementById('final-score').textContent = score;
        const used = 300 - timeLeft;
        document.getElementById('final-time').textContent = `${Math.floor(used / 60)}:${(used % 60).toString().padStart(2, '0')}`;

        const statusEl = document.getElementById('end-status');
        if (reason === "TIME EXPIRED") {
            statusEl.textContent = "OUT OF TIME";
        } else {
            statusEl.textContent = "ELIMINATED";
        }
    }

    window.addEventListener('keydown', (e) => {
        if (isGameOver) return;

        // Fixed logic to handle standard browser key names
        const key = e.key.toUpperCase();

        if (key === 'ENTER') {
            e.preventDefault();
            submitGuess();
        } else if (key === 'BACKSPACE') {
            e.preventDefault();
            currentGuess = currentGuess.slice(0, -1);
            updateInputRow();
        } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
            currentGuess += key;
            updateInputRow();
        }
    });

    document.getElementById('keyboard').addEventListener('click', (e) => {
        const btn = e.target.closest('.key');
        if (!btn || isGameOver) return;
        const key = btn.dataset.key;
        if (key === 'ENTER') submitGuess();
        else if (key === 'BACKSPACE') { currentGuess = currentGuess.slice(0, -1); updateInputRow(); }
        else if (currentGuess.length < 5) { currentGuess += key; updateInputRow(); }
    });
}

async function loadWords() {
    try {
        const response = await fetch(GIST_URL);
        const text = await response.text();
        
        // Split by newline and clean up the strings
        WORDS = text.split('\n')
                    .map(word => word.trim().toUpperCase())
                    .filter(word => word.length === 5);

        if (WORDS.length === 0) throw new Error("Word list is empty");
        
        console.log(`Loaded ${WORDS.length} words!`);
        
        // START YOUR GAME INITIALIZATION HERE
        initGame(); 
        
    } catch (err) {
        console.error("Failed to load words, using backup list:", err);
        WORDS = ["APPLE", "BRAIN", "CLOCK", "DREAM", "EARTH"]; // Emergency backup
        initGame();
    }
}

// Call this at the very bottom of your script
loadWords();