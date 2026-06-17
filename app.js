/**
 * Voucher Breaker - Application Controller
 * Handles URL parsing, View transitions, Form validation, and DOM integration.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const setupView = document.getElementById('setup-view');
    const gameView = document.getElementById('game-view');
    const setupForm = document.getElementById('setup-form');
    
    // Inputs
    const giftCodeInput = document.getElementById('gift-code');
    const giftStoreInput = document.getElementById('gift-store');
    const giftSenderInput = document.getElementById('gift-sender');
    const giftMessageInput = document.getElementById('gift-message');
    
    // Share elements
    const shareCard = document.getElementById('share-card');
    const shareUrlInput = document.getElementById('share-url');
    const btnCopy = document.getElementById('btn-copy');
    const btnTestPlay = document.getElementById('btn-test-play');
    
    // HUD
    const hudGiftTitle = document.getElementById('hud-gift-title');
    const hudScore = document.getElementById('hud-score');
    const hudBricks = document.getElementById('hud-bricks');
    const hudLives = document.getElementById('hud-lives');
    
    // Game Over Overlay
    const gameStartOverlay = document.getElementById('game-start-overlay');
    const giftFromUser = document.getElementById('gift-from-user');
    const overlayGiftTitle = document.getElementById('overlay-gift-title');
    const overlayGiftMessage = document.getElementById('overlay-gift-message');
    const btnStartGame = document.getElementById('btn-start-game');
    
    // Game Control Buttons
    const btnBackSetup = document.getElementById('btn-back-setup');
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    const soundOnIcon = document.getElementById('sound-on-icon');
    const soundOffIcon = document.getElementById('sound-off-icon');
    
    // Modals
    const gameOverModal = document.getElementById('game-over-modal');
    const gameOverProgress = document.getElementById('game-over-progress');
    const btnRevealAnyway = document.getElementById('btn-reveal-anyway');
    const btnRetryGame = document.getElementById('btn-retry-game');
    
    const victoryModal = document.getElementById('victory-modal');
    const victorySender = document.getElementById('victory-sender');
    const victoryTitle = document.getElementById('victory-title');
    const victoryMessage = document.getElementById('victory-message');
    const finalCodeValue = document.getElementById('final-code-value');
    const btnCopyFinal = document.getElementById('btn-copy-final');
    const btnPlayAgain = document.getElementById('btn-play-again');
    
    const voucherCodeDisplay = document.getElementById('voucher-code-display');

    // State Variables
    let currentPayload = null; // Decoded URL configuration
    let game = null;
    let revealedCount = 0;
    
    // ==========================================================================
    // INITIALIZATION & ROUTING
    // ==========================================================================
    function checkRoute() {
        const hash = window.location.hash;
        if (hash.startsWith('#play=')) {
            const encoded = hash.substring(6);
            const decoded = decodePayload(encoded);
            
            if (decoded && validatePayload(decoded)) {
                currentPayload = decoded;
                launchGameMode(decoded);
            } else {
                alert("Invalid or expired game link! Redirecting to creator page.");
                window.location.hash = '';
                showSetupMode();
            }
        } else {
            showSetupMode();
        }
    }
    
    // Listen for hash change (e.g. going back or loading link)
    window.addEventListener('hashchange', checkRoute);
    
    // Initial load check
    checkRoute();
    
    // Initialize Game Engine if playing
    function initGameEngine(sanitizedCode) {
        if (!game) {
            game = new GameEngine('game-canvas', {
                onScoreChange: (score) => {
                    hudScore.textContent = String(score).padStart(4, '0');
                },
                onLivesChange: (lives) => {
                    renderLivesHud(lives);
                },
                onBricksChange: (bricksLeft) => {
                    hudBricks.textContent = bricksLeft;
                },
                onLetterCollect: (char, charIndex) => {
                    unlockVoucherSlot(char, charIndex);
                },
                onGameOver: () => {
                    gameOverProgress.textContent = `${revealedCount} / 12 characters revealed`;
                    showModal(gameOverModal);
                },
                onWin: () => {
                    // Reveal all characters in victory screen
                    victorySender.textContent = currentPayload.n ? `A Gift From ${currentPayload.n}` : 'A Special Gift For You';
                    victoryTitle.textContent = currentPayload.s;
                    victoryMessage.textContent = currentPayload.m ? `"${currentPayload.m}"` : '"Enjoy your gift!"';
                    finalCodeValue.textContent = currentPayload.c; // display fully formatted code
                    
                    showModal(victoryModal);
                    triggerConfetti();
                }
            });
        }
        
        // Reset local revealed count
        revealedCount = 0;
        
        // Generate blank/locked DOM slots for the code
        buildVoucherTrayDOM();
        
        // Start level inside engine
        game.setupLevel(sanitizedCode);
    }
    
    // ==========================================================================
    // DECODING / ENCODING HELPERS
    // ==========================================================================
    function encodePayload(payload) {
        const jsonStr = JSON.stringify(payload);
        return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    }
    
    function decodePayload(base64Str) {
        try {
            const raw = atob(base64Str);
            const decoded = decodeURIComponent(Array.prototype.map.call(raw, c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(decoded);
        } catch (e) {
            console.error("Base64 Decode Error:", e);
            return null;
        }
    }
    
    function validatePayload(payload) {
        if (!payload || typeof payload !== 'object') return false;
        // code and store must exist
        if (!payload.c || !payload.s) return false;
        // Sanitized code must be exactly 12 alphanumeric characters
        const sanitized = payload.c.replace(/[^A-Za-z0-9]/g, '');
        return sanitized.length === 12;
    }
    
    // ==========================================================================
    // VIEW SWITCHERS
    // ==========================================================================
    function showSetupMode() {
        setupView.classList.add('active');
        gameView.classList.remove('active');
        closeAllModals();
        if (game) {
            game.state = 'idle';
        }
    }
    
    function launchGameMode(payload) {
        setupView.classList.remove('active');
        gameView.classList.add('active');
        closeAllModals();
        
        // Reset HUD displays
        hudGiftTitle.textContent = payload.s;
        
        // Start overlay text
        giftFromUser.textContent = payload.n || "A Friend";
        overlayGiftTitle.textContent = payload.s;
        overlayGiftMessage.textContent = payload.m ? `"${payload.m}"` : `"Break the bricks to unlock your voucher code!"`;
        
        // Show start screen overlay
        gameStartOverlay.classList.remove('hidden');
        
        // Prep level
        const sanitizedCode = payload.c.replace(/[^A-Za-z0-9]/g, '');
        initGameEngine(sanitizedCode);
    }
    
    // ==========================================================================
    // SETUP VIEW FORM & COPIER
    // ==========================================================================
    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const rawCode = giftCodeInput.value.trim();
        const sanitized = rawCode.replace(/[^A-Za-z0-9]/g, '');
        
        if (sanitized.length !== 12) {
            alert(`Your voucher code contains ${sanitized.length} alphanumeric characters. It must contain exactly 12 alphanumeric characters.`);
            giftCodeInput.focus();
            return;
        }
        
        const payload = {
            c: rawCode,
            s: giftStoreInput.value.trim(),
            n: giftSenderInput.value.trim(),
            m: giftMessageInput.value.trim()
        };
        
        const encoded = encodePayload(payload);
        const shareUrl = `${window.location.origin}${window.location.pathname}#play=${encoded}`;
        
        shareUrlInput.value = shareUrl;
        shareCard.classList.remove('hidden');
        
        // Scroll to success card
        shareCard.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Copy URL link
    btnCopy.addEventListener('click', () => {
        copyTextToClipboard(shareUrlInput.value, btnCopy, "Copy Link", "Copied!");
    });
    
    // Play test immediately
    btnTestPlay.addEventListener('click', () => {
        const hash = shareUrlInput.value.split('#')[1];
        window.location.hash = hash; // triggers routing
    });
    
    // ==========================================================================
    // GAME VIEW CONTROLS & HUD
    // ==========================================================================
    btnStartGame.addEventListener('click', () => {
        gameStartOverlay.classList.add('hidden');
        game.start();
        // Play small click sweep
        game.playSynth(300, 0.05);
    });
    
    btnBackSetup.addEventListener('click', () => {
        if (confirm("Are you sure you want to exit the game? Your current progress will be lost.")) {
            window.location.hash = '';
            showSetupMode();
        }
    });
    
    btnToggleSound.addEventListener('click', () => {
        if (game) {
            const muted = game.toggleMute();
            if (muted) {
                soundOnIcon.classList.add('hidden');
                soundOffIcon.classList.remove('hidden');
            } else {
                soundOnIcon.classList.remove('hidden');
                soundOffIcon.classList.add('hidden');
                // test chirp
                game.playBounceSound();
            }
        }
    });
    
    function renderLivesHud(lives) {
        hudLives.innerHTML = '';
        for (let i = 0; i < game.maxLives; i++) {
            const heart = document.createElement('span');
            heart.className = `live-heart ${i >= lives ? 'lost' : ''}`;
            heart.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
            hudLives.appendChild(heart);
        }
    }
    
    function buildVoucherTrayDOM() {
        voucherCodeDisplay.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const slot = document.createElement('div');
            slot.className = 'code-slot locked';
            slot.textContent = '?';
            voucherCodeDisplay.appendChild(slot);
        }
    }
    
    function unlockVoucherSlot(char, charIndex) {
        const slots = voucherCodeDisplay.querySelectorAll('.code-slot');
        if (slots[charIndex]) {
            const slot = slots[charIndex];
            slot.textContent = char;
            slot.classList.remove('locked');
            slot.classList.add('unlocked');
            revealedCount++;
        }
    }
    
    // ==========================================================================
    // MODALS HANDLING
    // ==========================================================================
    function showModal(modalElement) {
        modalElement.classList.add('active');
    }
    
    function closeModal(modalElement) {
        modalElement.classList.remove('active');
    }
    
    function closeAllModals() {
        closeModal(gameOverModal);
        closeModal(victoryModal);
    }
    
    btnRetryGame.addEventListener('click', () => {
        closeModal(gameOverModal);
        gameStartOverlay.classList.remove('hidden');
        const sanitizedCode = currentPayload.c.replace(/[^A-Za-z0-9]/g, '');
        initGameEngine(sanitizedCode);
    });
    
    btnRevealAnyway.addEventListener('click', () => {
        closeModal(gameOverModal);
        
        // Beautiful sequence: unlock all remaining letters with sound chimes in sequence, then go to victory modal
        const slots = voucherCodeDisplay.querySelectorAll('.code-slot');
        const sanitizedCode = currentPayload.c.replace(/[^A-Za-z0-9]/g, '');
        
        let delay = 0;
        slots.forEach((slot, idx) => {
            if (slot.classList.contains('locked')) {
                setTimeout(() => {
                    unlockVoucherSlot(sanitizedCode[idx], idx);
                    if (game) {
                        game.playCollectSound();
                    }
                }, delay);
                delay += 120;
            }
        });
        
        setTimeout(() => {
            if (game) {
                game.stopGame(true);
            }
        }, delay + 300);
    });
    
    btnPlayAgain.addEventListener('click', () => {
        closeModal(victoryModal);
        gameStartOverlay.classList.remove('hidden');
        const sanitizedCode = currentPayload.c.replace(/[^A-Za-z0-9]/g, '');
        initGameEngine(sanitizedCode);
    });
    
    btnCopyFinal.addEventListener('click', () => {
        copyTextToClipboard(currentPayload.c, btnCopyFinal, "Copy Code", "Copied!");
    });
    
    // ==========================================================================
    // COPY TO CLIPBOARD HELPER
    // ==========================================================================
    function copyTextToClipboard(text, btnElement, normalText, successText) {
        const textSpan = btnElement.querySelector('.btn-text');
        
        function updateLabel() {
            if (textSpan) {
                textSpan.textContent = successText;
                setTimeout(() => {
                    textSpan.textContent = normalText;
                }, 2000);
            }
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(updateLabel)
                .catch(err => {
                    console.error("Clipboard copy failed:", err);
                    fallbackCopy(text, updateLabel);
                });
        } else {
            fallbackCopy(text, updateLabel);
        }
    }
    
    function fallbackCopy(text, callback) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; // prevent scroll
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            callback();
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    }
    
    // ==========================================================================
    // CONFETTI EFFECT (Victory screen decoration)
    // ==========================================================================
    function triggerConfetti() {
        const container = document.querySelector('.modal-confetti-anchor');
        if (!container) return;
        
        container.innerHTML = '';
        const colors = ['#00f0ff', '#ff007f', '#39ff14', '#9d4edd', '#ff9f1c'];
        const confettiCount = 80;
        
        for (let i = 0; i < confettiCount; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            
            // Random styling
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const size = Math.random() * 8 + 5;
            const delay = Math.random() * 2;
            const duration = Math.random() * 2.5 + 1.5;
            
            piece.style.cssText = `
                position: absolute;
                left: ${left}%;
                top: -20px;
                width: ${size}px;
                height: ${size * (Math.random() > 0.5 ? 1.5 : 1)}px;
                background-color: ${color};
                opacity: ${Math.random() * 0.7 + 0.3};
                transform: rotate(${Math.random() * 360}deg);
                pointer-events: none;
                border-radius: ${Math.random() > 0.7 ? '50%' : '2px'};
                animation: confettiFall ${duration}s linear ${delay}s infinite;
            `;
            
            container.appendChild(piece);
        }
    }
    
    // Append Confetti Keyframes dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        .modal-confetti-anchor {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
            z-index: 10;
        }
        @keyframes confettiFall {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(450px) rotate(720deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});
