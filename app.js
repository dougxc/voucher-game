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
    const giftLanguageSelect = document.getElementById('gift-language');
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
    // TRANSLATIONS & LOCALIZATION
    // ==========================================================================
    const TRANSLATIONS = {
        en: {
            hudStore: "STORE / GIFT",
            hudScore: "SCORE",
            hudBricks: "BRICKS LEFT",
            hudLives: "LIVES",
            giftFrom: "A Gift From",
            howToPlay: "How to Play:",
            instMove: "or Mouse / Touch to move the paddle",
            instLaunch: "or Click to launch ball / shoot lasers",
            instPowerupsPrefix: "Catch falling items for glowing",
            instPowerupsHighlight: "Power-Ups",
            instPowerupsSuffix: "!",
            btnStart: "Start Game",
            trayTitle: "YOUR VOUCHER CODE",
            trayTip: "Break glowing letters in the grid to reveal code digits!",
            btnBack: "Back to Setup",
            gameOverBadge: "GAME OVER",
            gameOverTitle: "Almost Had It!",
            gameOverText: "Don't worry, you can try again! Or, since this is a gift, you can choose to reveal the voucher code directly.",
            revealedProgressLabel: "Revealed so far:",
            btnReveal: "Just Reveal Code",
            btnRetry: "Try Again",
            victoryBadge: "CONGRATULATIONS!",
            victoryTitle: "Voucher Unlocked",
            voucherCodeLabel: "VOUCHER CODE",
            btnCopy: "Copy Code",
            btnPlayAgain: "Play Again",
            launchPrompt: "PRESS SPACE / TAP TO LAUNCH",
            charactersRevealed: "{count} / 12 characters revealed",
            defaultMessage: "Break the bricks to unlock your voucher code!",
            defaultSender: "Someone",
            defaultSenderVictory: "A Special Gift For You",
            defaultMessageVictory: "Enjoy your gift!",
            copiedText: "Copied!",
            copiedCodeBtn: "Copied!"
        },
        de: {
            hudStore: "GESCHÄFT / GESCHENK",
            hudScore: "PUNKTESTAND",
            hudBricks: "STEINE ÜBRIG",
            hudLives: "LEBEN",
            giftFrom: "Ein Geschenk von",
            howToPlay: "Spielanleitung:",
            instMove: "oder Maus / Touch, um das Paddel zu bewegen",
            instLaunch: "oder Klick, um den Ball zu starten / Laser zu schießen",
            instPowerupsPrefix: "Fange fallende Gegenstände für leuchtende",
            instPowerupsHighlight: "Power-Ups",
            instPowerupsSuffix: "!",
            btnStart: "Spiel starten",
            trayTitle: "DEIN GUTSCHEINCODE",
            trayTip: "Brich leuchtende Buchstaben im Gitter, um Codestellen zu enthüllen!",
            btnBack: "Zurück zum Setup",
            gameOverBadge: "SPIEL VORBEI",
            gameOverTitle: "Fast geschafft!",
            gameOverText: "Keine Sorge, du kannst es noch einmal versuchen! Oder da dies ein Geschenk ist, kannst du den Gutscheincode direkt enthüllen.",
            revealedProgressLabel: "Bisher enthüllt:",
            btnReveal: "Code direkt enthüllen",
            btnRetry: "Nochmal versuchen",
            victoryBadge: "HERZLICHEN GLÜCKWUNSCH!",
            victoryTitle: "Gutschein freigeschaltet",
            voucherCodeLabel: "GUTSCHEINCODE",
            btnCopy: "Code kopieren",
            btnPlayAgain: "Nochmal spielen",
            launchPrompt: "LEERTASTE DRÜCKEN / TIPPEN ZUM STARTEN",
            charactersRevealed: "{count} von 12 Zeichen enthüllt",
            defaultMessage: "Brich die Steine, um deinen Gutscheincode freizuschalten!",
            defaultSender: "Jemand",
            defaultSenderVictory: "Ein besonderes Geschenk für dich",
            defaultMessageVictory: "Viel Spaß mit deinem Geschenk!",
            copiedText: "Kopiert!",
            copiedCodeBtn: "Kopiert!"
        },
        ru: {
            hudStore: "МАГАЗИН / ПОДАРОК",
            hudScore: "СЧЕТ",
            hudBricks: "ОСТАЛОСЬ КИРПИЧЕЙ",
            hudLives: "ЖИЗНИ",
            giftFrom: "Подарок от",
            howToPlay: "Как играть:",
            instMove: "или мышь / касание для перемещения платформы",
            instLaunch: "или клик для запуска шара / стрельбы лазером",
            instPowerupsPrefix: "Лови падающие предметы для супер-способностей",
            instPowerupsHighlight: "Power-Ups",
            instPowerupsSuffix: "!",
            btnStart: "Начать игру",
            trayTitle: "ТВОЙ КОД ВАУЧЕРА",
            trayTip: "Разбивай светящиеся буквы, чтобы открыть символы кода!",
            btnBack: "Назад к настройкам",
            gameOverBadge: "ИГРА ОКОНЧЕНА",
            gameOverTitle: "Почти получилось!",
            gameOverText: "Не волнуйся, ты можешь попробовать снова! Или, так как это подарок, ты можешь открыть код ваучера сразу.",
            revealedProgressLabel: "Открыто символов:",
            btnReveal: "Просто открыть код",
            btnRetry: "Попробовать снова",
            victoryBadge: "ПОЗДРАВЛЯЕМ!",
            victoryTitle: "Ваучер разблокирован",
            voucherCodeLabel: "КОД ВАУЧЕРА",
            btnCopy: "Копировать код",
            btnPlayAgain: "Играть снова",
            launchPrompt: "НАЖМИ ПРОБЕЛ ИЛИ КАСАНИЕ ДЛЯ ЗАПУСКА",
            charactersRevealed: "Открыто {count} из 12 символов",
            defaultMessage: "Разбей кирпичи, чтобы получить код ваучера!",
            defaultSender: "Кто-то",
            defaultSenderVictory: "Особый подарок для тебя",
            defaultMessageVictory: "Наслаждайся своим подарком!",
            copiedText: "Скопировано!",
            copiedCodeBtn: "Скопировано!"
        }
    };

    let currentLanguage = 'en';

    function setLanguage(lang) {
        if (!TRANSLATIONS[lang]) lang = 'en';
        currentLanguage = lang;
        
        // Update elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = TRANSLATIONS[lang][key];
            if (val) {
                el.textContent = val;
            }
        });
        
        // Update language buttons active class
        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.getAttribute('data-lang') === lang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update start overlay text placeholders if not custom
        if (currentPayload) {
            const isCustomMsg = currentPayload.m && currentPayload.m.trim().length > 0;
            overlayGiftMessage.textContent = isCustomMsg ? `"${currentPayload.m}"` : `"${TRANSLATIONS[lang].defaultMessage}"`;
            
            const isCustomSender = currentPayload.n && currentPayload.n.trim().length > 0;
            giftFromUser.textContent = isCustomSender ? currentPayload.n : TRANSLATIONS[lang].defaultSender;
            overlayGiftTitle.textContent = currentPayload.s;
        }
        
        // Update game if active
        if (game) {
            game.setLanguage(lang);
        }
    }
    
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
                    gameOverProgress.textContent = TRANSLATIONS[currentLanguage].charactersRevealed.replace('{count}', revealedCount);
                    showModal(gameOverModal);
                },
                onWin: () => {
                    // Reveal all characters in victory screen
                    victorySender.textContent = currentPayload.n ? `${TRANSLATIONS[currentLanguage].giftFrom} ${currentPayload.n}` : TRANSLATIONS[currentLanguage].defaultSenderVictory;
                    victoryTitle.textContent = currentPayload.s;
                    victoryMessage.textContent = currentPayload.m ? `"${currentPayload.m}"` : `"${TRANSLATIONS[currentLanguage].defaultMessageVictory}"`;
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
        
        // Sync active language to engine
        game.setLanguage(currentLanguage);
        
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
        
        // Set language
        setLanguage(payload.l || 'en');
        
        // Show start screen overlay
        gameStartOverlay.classList.remove('hidden');
        
        // Prep level
        const sanitizedCode = payload.c.replace(/[^A-Za-z0-9]/g, '');
        initGameEngine(sanitizedCode);
    }
    
    // Automatically clean voucher code input (remove spaces, cap at 12 characters)
    giftCodeInput.addEventListener('input', () => {
        const cursorPosition = giftCodeInput.selectionStart;
        const originalValue = giftCodeInput.value;
        
        // Remove all whitespace
        const cleanedValue = originalValue.replace(/\s+/g, '');
        
        // Limit to 12 characters
        const truncatedValue = cleanedValue.slice(0, 12);
        
        if (originalValue !== truncatedValue) {
            giftCodeInput.value = truncatedValue;
            
            // Adjust cursor position: count how many spaces were removed up to the cursor position
            const spacesBeforeCursor = (originalValue.slice(0, cursorPosition).match(/\s/g) || []).length;
            const newCursorPosition = Math.min(truncatedValue.length, Math.max(0, cursorPosition - spacesBeforeCursor));
            giftCodeInput.setSelectionRange(newCursorPosition, newCursorPosition);
        }
    });

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
            m: giftMessageInput.value.trim(),
            l: giftLanguageSelect.value
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
        copyTextToClipboard(currentPayload.c, btnCopyFinal, TRANSLATIONS[currentLanguage].btnCopy, TRANSLATIONS[currentLanguage].copiedCodeBtn);
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

    // Language buttons click event listeners
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
        });
    });
});
