/**
 * Voucher Breaker - Core Game Engine
 * Handles breakout physics, canvas rendering, particles, powerups, and sound synth.
 */

class GameEngine {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Game configuration
        this.baseBallSpeed = 4.5;
        this.paddleWidthNormal = 100;
        this.paddleWidthWide = 160;
        this.paddleHeight = 14;
        this.brickRows = 5;
        this.brickCols = 10;
        this.brickPadding = 8;
        this.brickHeight = 22;
        this.brickOffsetTop = 50;
        this.brickOffsetLeft = 12;
        
        // Audio state
        this.audioCtx = null;
        this.isMuted = false;
        
        // Game states
        this.code = ""; // 12-char alphanumeric voucher code
        this.state = 'idle'; // idle, playing, paused, gameover, won
        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;
        
        // Entities
        this.balls = [];
        this.paddle = {
            x: 0,
            y: 0,
            width: this.paddleWidthNormal,
            height: this.paddleHeight,
            speed: 8,
            isLaser: false,
            isWide: false
        };
        this.bricks = [];
        this.particles = [];
        this.powerups = [];
        this.lasers = [];
        this.floatingLetters = []; // Letters traveling to the bottom tray
        
        // Input tracking
        this.keys = {};
        this.pointerX = null;
        
        // Powerup durations (ms)
        this.powerupDuration = {
            wide: 10000,
            slow: 10000,
            laser: 8000,
            shield: 0 // consumed on bounce
        };
        
        this.activePowerups = {
            wide: 0, // end timestamp
            slow: 0,
            laser: 0,
            shield: false
        };
        
        // Callbacks
        this.onScoreChange = options.onScoreChange || (() => {});
        this.onLivesChange = options.onLivesChange || (() => {});
        this.onBricksChange = options.onBricksChange || (() => {});
        this.onLetterCollect = options.onLetterCollect || (() => {});
        this.onGameOver = options.onGameOver || (() => {});
        this.onWin = options.onWin || (() => {});
        
        // Bind event listeners
        this.initEventListeners();
    }
    
    // ==========================================================================
    // AUDIO SYNTHESIZER (Web Audio API)
    // ==========================================================================
    initAudio() {
        if (this.audioCtx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
    }
    
    playSynth(freqs, duration, type = 'sine', gainStart = 0.1, sweepFreq = null) {
        if (this.isMuted) return;
        this.initAudio();
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        const now = this.audioCtx.currentTime;
        const gainNode = this.audioCtx.createGain();
        gainNode.connect(this.audioCtx.destination);
        gainNode.gain.setValueAtTime(gainStart, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        
        const oscs = (Array.isArray(freqs) ? freqs : [freqs]).map(f => {
            const osc = this.audioCtx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(f, now);
            if (sweepFreq) {
                osc.frequency.exponentialRampToValueAtTime(sweepFreq, now + duration);
            }
            osc.connect(gainNode);
            osc.start(now);
            osc.stop(now + duration);
            return osc;
        });
    }

    playBounceSound() {
        // High quality short sine sweep
        this.playSynth(220, 0.08, 'sine', 0.12, 440);
    }
    
    playBrickSound() {
        // High quality crunch noise (triangle wave + quick decay)
        this.playSynth(180, 0.1, 'triangle', 0.15, 80);
    }
    
    playVoucherSound() {
        // Triumphant chime: C5 & E5 harmonic blend, slow decay
        this.playSynth([523.25, 659.25, 783.99], 0.6, 'sine', 0.15);
    }
    
    playCollectSound() {
        // Beautiful fast arpeggio sweep
        if (this.isMuted) return;
        this.initAudio();
        const now = this.audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const delay = idx * 0.06;
            const gain = this.audioCtx.createGain();
            gain.connect(this.audioCtx.destination);
            gain.gain.setValueAtTime(0.08, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.3);
            
            const osc = this.audioCtx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + delay);
            osc.connect(gain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.3);
        });
    }
    
    playLaserSound() {
        // Retro laser descending sweep
        this.playSynth(880, 0.12, 'sawtooth', 0.08, 110);
    }
    
    playPowerUpSound() {
        // Beautiful rising synth arpeggio
        this.playSynth([440, 554.37, 659.25, 880], 0.4, 'sine', 0.1);
    }
    
    playWinSound() {
        if (this.isMuted) return;
        this.initAudio();
        const now = this.audioCtx.currentTime;
        const chords = [
            [261.63, 329.63, 392.00], // C4 major
            [349.23, 440.00, 523.25], // F4 major
            [392.00, 493.88, 587.33], // G4 major
            [523.25, 659.25, 783.99, 1046.50] // C5 major arpeggio finish
        ];
        
        chords.forEach((chord, chordIdx) => {
            const delay = chordIdx * 0.25;
            const dur = chordIdx === 3 ? 1.0 : 0.22;
            const gain = this.audioCtx.createGain();
            gain.connect(this.audioCtx.destination);
            gain.gain.setValueAtTime(0.1, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
            
            chord.forEach(freq => {
                const osc = this.audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + delay);
                osc.connect(gain);
                osc.start(now + delay);
                osc.stop(now + delay + dur);
            });
        });
    }
    
    playLoseSound() {
        // Diminished chords falling down
        this.playSynth([293.66, 349.23, 415.30], 0.5, 'sawtooth', 0.1, 146.83);
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    // ==========================================================================
    // INITIALIZATION & SETUP
    // ==========================================================================
    initEventListeners() {
        // Keyboard controls
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if (e.key === ' ' || e.key === 'ArrowUp') {
                e.preventDefault(); // prevent scroll
                this.handleActionKey();
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key] = false;
        });
        
        // Mouse/Touch controls
        const updatePointer = e => {
            if (this.state !== 'playing') return;
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            this.pointerX = (clientX - rect.left) * (this.canvas.width / rect.width);
        };
        
        this.canvas.addEventListener('mousemove', updatePointer);
        this.canvas.addEventListener('touchmove', e => {
            updatePointer(e);
            e.preventDefault(); // prevent swipe-to-scroll while playing
        }, { passive: false });
        
        this.canvas.addEventListener('click', () => {
            this.handleActionKey();
        });
    }
    
    handleActionKey() {
        if (this.state === 'playing') {
            // Launch ball if not launched
            let launchedAny = false;
            this.balls.forEach(ball => {
                if (!ball.launched) {
                    ball.launched = true;
                    ball.dy = -ball.speed;
                    ball.dx = (Math.random() * 2 - 1) * 2; // Random initial horizontal trajectory
                    launchedAny = true;
                }
            });
            
            // Shoot lasers if active
            const now = Date.now();
            if (this.activePowerups.laser > now && !launchedAny) {
                this.shootLasers();
            }
        }
    }
    
    setupLevel(code) {
        this.code = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); // sanitize code
        this.score = 0;
        this.lives = this.maxLives;
        this.balls = [];
        this.particles = [];
        this.powerups = [];
        this.lasers = [];
        this.floatingLetters = [];
        
        this.activePowerups.wide = 0;
        this.activePowerups.slow = 0;
        this.activePowerups.laser = 0;
        this.activePowerups.shield = false;
        
        // Reset paddle
        this.paddle.width = this.paddleWidthNormal;
        this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
        this.paddle.y = this.canvas.height - 35;
        
        // Spawn initial ball
        this.spawnBall(true);
        
        // Build brick grid
        this.buildBricks();
        
        // Sync display
        this.onScoreChange(this.score);
        this.onLivesChange(this.lives);
        this.onBricksChange(this.getActiveBricksCount());
        
        this.state = 'idle';
    }
    
    spawnBall(onPaddle = false) {
        const ballSpeed = this.activePowerups.slow > Date.now() ? this.baseBallSpeed * 0.7 : this.baseBallSpeed;
        const newBall = {
            x: this.paddle.x + this.paddle.width / 2,
            y: this.paddle.y - 8,
            dx: 0,
            dy: 0,
            radius: 7,
            speed: ballSpeed,
            launched: !onPaddle,
            trail: [] // trail particle history
        };
        
        if (!onPaddle) {
            // launch with upward velocity
            const angle = -Math.PI / 3 - Math.random() * (Math.PI / 3); // between -60 and -120 deg
            newBall.dx = Math.cos(angle) * ballSpeed;
            newBall.dy = Math.sin(angle) * ballSpeed;
        }
        
        this.balls.push(newBall);
    }
    
    buildBricks() {
        this.bricks = [];
        const totalBricksCount = this.brickRows * this.brickCols;
        
        // Distribute the 12 characters inside the brick grid
        // Designate exactly 12 voucher bricks at random indices
        const indices = Array.from({ length: totalBricksCount }, (_, idx) => idx);
        // Shuffle indices using Fisher-Yates
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        const voucherIndices = new Set(indices.slice(0, Math.min(12, this.code.length)));
        
        // Convert set to a sorted list to distribute characters sequentially in the grid from top-left to bottom-right
        const voucherIndicesList = Array.from(voucherIndices).sort((a, b) => a - b);
        const brickVoucherMap = {};
        voucherIndicesList.forEach((brickIdx, charIdx) => {
            brickVoucherMap[brickIdx] = {
                char: this.code[charIdx],
                charIndex: charIdx
            };
        });
        
        // Set up brick properties
        const colorPalette = [
            '#bf55ec', // Purple row
            '#00f0ff', // Cyan row
            '#ff007f', // Pink row
            '#ff9f1c', // Orange row
            '#39ff14'  // Green row
        ];
        
        for (let r = 0; r < this.brickRows; r++) {
            const brickWidth = (this.canvas.width - (this.brickOffsetLeft * 2) - ((this.brickCols - 1) * this.brickPadding)) / this.brickCols;
            for (let c = 0; c < this.brickCols; c++) {
                const idx = r * this.brickCols + c;
                const bx = c * (brickWidth + this.brickPadding) + this.brickOffsetLeft;
                const by = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                
                const isVoucher = brickVoucherMap[idx] !== undefined;
                const voucherData = brickVoucherMap[idx] || {};
                
                this.bricks.push({
                    x: bx,
                    y: by,
                    width: brickWidth,
                    height: this.brickHeight,
                    status: 1, // 1 = active
                    color: colorPalette[r % colorPalette.length],
                    isVoucher: isVoucher,
                    char: voucherData.char || null,
                    charIndex: voucherData.charIndex !== undefined ? voucherData.charIndex : -1,
                    points: isVoucher ? 250 : 100
                });
            }
        }
    }
    
    getActiveBricksCount() {
        return this.bricks.filter(b => b.status === 1).length;
    }
    
    start() {
        if (this.state === 'playing') return;
        this.state = 'playing';
        this.loop();
    }
    
    stopGame(victory = false) {
        this.state = victory ? 'won' : 'gameover';
        if (victory) {
            this.playWinSound();
            this.onWin();
        } else {
            this.playLoseSound();
            this.onGameOver();
        }
    }
    
    triggerScreenShake() {
        const wrapper = this.canvas.parentElement;
        wrapper.classList.remove('shake');
        void wrapper.offsetWidth; // force reflow
        wrapper.classList.add('shake');
        setTimeout(() => wrapper.classList.remove('shake'), 300);
    }
    
    // ==========================================================================
    // GAME UPDATES & PHYSICS
    // ==========================================================================
    update() {
        const now = Date.now();
        
        // 1. Update powerup modifiers
        this.paddle.width = (this.activePowerups.wide > now) ? this.paddleWidthWide : this.paddleWidthNormal;
        
        // 2. Update paddle position
        if (this.pointerX !== null) {
            // Mouse/Touch control
            this.paddle.x = this.pointerX - this.paddle.width / 2;
        } else {
            // Keyboard control
            if (this.keys['ArrowLeft'] || this.keys['a']) {
                this.paddle.x -= this.paddle.speed;
            }
            if (this.keys['ArrowRight'] || this.keys['d']) {
                this.paddle.x += this.paddle.speed;
            }
        }
        
        // Keep paddle in bounds
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x + this.paddle.width > this.canvas.width) {
            this.paddle.x = this.canvas.width - this.paddle.width;
        }
        
        // 3. Update active balls
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            
            if (!ball.launched) {
                // Ball snaps to paddle center
                ball.x = this.paddle.x + this.paddle.width / 2;
                ball.y = this.paddle.y - ball.radius;
                continue;
            }
            
            // Adjust speed dynamically depending on slow-mo power-up
            const targetSpeed = this.activePowerups.slow > now ? this.baseBallSpeed * 0.7 : this.baseBallSpeed;
            // Normalize direction vector and multiply by current target speed
            const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.05) {
                ball.dx = (ball.dx / currentSpeed) * targetSpeed;
                ball.dy = (ball.dy / currentSpeed) * targetSpeed;
            }
            
            // Move ball
            ball.x += ball.dx;
            ball.y += ball.dy;
            
            // Add trail particles
            if (Math.random() < 0.3) {
                this.particles.push({
                    x: ball.x,
                    y: ball.y,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 3 + 1,
                    color: this.activePowerups.slow > now ? varNeonOrange() : 'rgba(255,255,255,0.7)',
                    alpha: 0.6,
                    decay: 0.02
                });
            }
            
            // Wall collisions (left/right)
            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius;
                ball.dx = -ball.dx;
                this.playBounceSound();
            } else if (ball.x + ball.radius > this.canvas.width) {
                ball.x = this.canvas.width - ball.radius;
                ball.dx = -ball.dx;
                this.playBounceSound();
            }
            
            // Ceiling collision
            if (ball.y - ball.radius < 0) {
                ball.y = ball.radius;
                ball.dy = -ball.dy;
                this.playBounceSound();
            }
            
            // Bottom wall (Loss / Shield)
            if (ball.y + ball.radius > this.canvas.height) {
                if (this.activePowerups.shield) {
                    // Shield saves the ball!
                    ball.y = this.canvas.height - ball.radius - 6;
                    ball.dy = -Math.abs(ball.dy);
                    this.activePowerups.shield = false; // consume shield
                    this.playBounceSound();
                    this.triggerScreenShake();
                    this.spawnShieldBreakParticles();
                } else {
                    // Remove ball
                    this.balls.splice(i, 1);
                    continue;
                }
            }
            
            // Paddle collision
            if (ball.y + ball.radius >= this.paddle.y && 
                ball.y - ball.radius <= this.paddle.y + this.paddle.height &&
                ball.x + ball.radius >= this.paddle.x && 
                ball.x - ball.radius <= this.paddle.x + this.paddle.width) {
                
                // Only bounce if falling down
                if (ball.dy > 0) {
                    this.playBounceSound();
                    
                    // Deflection angle based on hit location
                    const relativeHit = (ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
                    const maxAngle = Math.PI / 3; // 60 deg max angle
                    const angle = relativeHit * maxAngle;
                    
                    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                    ball.dx = speed * Math.sin(angle);
                    ball.dy = -speed * Math.cos(angle);
                    
                    // Prevent ball from bouncing too flatly
                    if (Math.abs(ball.dy) < 1) {
                        ball.dy = ball.dy < 0 ? -1.5 : 1.5;
                    }
                    
                    // Paddle hit particles
                    this.spawnBrickParticles(ball.x, this.paddle.y, '#ffffff', 6);
                }
            }
            
            // Brick collision
            for (let j = 0; j < this.bricks.length; j++) {
                const brick = this.bricks[j];
                if (brick.status === 0) continue;
                
                // Simple AABB collision check with ball radius
                if (ball.x + ball.radius >= brick.x && 
                    ball.x - ball.radius <= brick.x + brick.width &&
                    ball.y + ball.radius >= brick.y && 
                    ball.y - ball.radius <= brick.y + brick.height) {
                    
                    this.destroyBrick(brick);
                    
                    // Determine which side of brick was hit to deflect ball
                    const prevBallX = ball.x - ball.dx;
                    const prevBallY = ball.y - ball.dy;
                    
                    if (prevBallY + ball.radius <= brick.y) {
                        // hit top
                        ball.dy = -Math.abs(ball.dy);
                    } else if (prevBallY - ball.radius >= brick.y + brick.height) {
                        // hit bottom
                        ball.dy = Math.abs(ball.dy);
                    }
                    
                    if (prevBallX + ball.radius <= brick.x) {
                        // hit left
                        ball.dx = -Math.abs(ball.dx);
                    } else if (prevBallX - ball.radius >= brick.x + brick.width) {
                        // hit right
                        ball.dx = Math.abs(ball.dx);
                    }
                    
                    break; // break brick loop, process one brick collision per ball frame
                }
            }
        }
        
        // 4. Handle Empty Ball List (Loss of life)
        if (this.balls.length === 0 && this.state === 'playing') {
            this.lives--;
            this.onLivesChange(this.lives);
            this.triggerScreenShake();
            this.activePowerups.laser = 0; // lose weapon
            this.activePowerups.wide = 0;
            this.activePowerups.slow = 0;
            this.activePowerups.shield = false;
            
            if (this.lives <= 0) {
                this.stopGame(false);
            } else {
                this.spawnBall(true); // reset ball on paddle
            }
        }
        
        // 5. Update dropping powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.y += p.speed;
            
            // Check paddle overlap
            if (p.y + p.height >= this.paddle.y && 
                p.y <= this.paddle.y + this.paddle.height &&
                p.x + p.width >= this.paddle.x && 
                p.x <= this.paddle.x + this.paddle.width) {
                
                this.activatePowerup(p.type);
                this.powerups.splice(i, 1);
                continue;
            }
            
            // Check out of bounds
            if (p.y > this.canvas.height) {
                this.powerups.splice(i, 1);
            }
        }
        
        // 6. Update Lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.y -= laser.speed;
            
            // Check brick hits
            let hit = false;
            for (let j = 0; j < this.bricks.length; j++) {
                const brick = this.bricks[j];
                if (brick.status === 0) continue;
                
                if (laser.x >= brick.x && laser.x <= brick.x + brick.width &&
                    laser.y >= brick.y && laser.y <= brick.y + brick.height) {
                    
                    this.destroyBrick(brick);
                    hit = true;
                    break;
                }
            }
            
            if (hit || laser.y < 0) {
                this.lasers.splice(i, 1);
            }
        }
        
        // 7. Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // 8. Update Floating letters (Voucher chime trajectories)
        for (let i = this.floatingLetters.length - 1; i >= 0; i--) {
            const fl = this.floatingLetters[i];
            fl.t += fl.speed;
            
            if (fl.t >= 1) {
                // Completed trajectory! Snap to DOM slot
                this.onLetterCollect(fl.char, fl.charIndex);
                this.playCollectSound();
                this.floatingLetters.splice(i, 1);
                
                // Check Win condition: If all letters are collected
                if (this.floatingLetters.length === 0 && this.getActiveBricksCount() === 0) {
                    // Double check if all 12 characters are unlocked or no active bricks left
                    // Actually, winning breakout is usually clearing the bricks. If all bricks are gone:
                    this.stopGame(true);
                }
                continue;
            }
            
            // Recalculate dynamic target coordinates (in case of screen resize/scroll)
            const coords = this.getSlotCanvasCoords(fl.charIndex);
            if (coords) {
                fl.targetX = coords.x;
                fl.targetY = coords.y;
            }
            
            // Bezier curve interpolation: control point bulges upwards
            const u = 1 - fl.t;
            const tt = fl.t * fl.t;
            const uu = u * u;
            
            // Quadratic Bezier: P = uu*P0 + 2*u*t*P1 + tt*P2
            fl.x = uu * fl.startX + 2 * u * fl.t * fl.ctrlX + tt * fl.targetX;
            fl.y = uu * fl.startY + 2 * u * fl.t * fl.ctrlY + tt * fl.targetY;
            
            // Add sparkles following the letter
            if (Math.random() < 0.4) {
                this.particles.push({
                    x: fl.x,
                    y: fl.y,
                    vx: (Math.random() - 0.5) * 1.0,
                    vy: (Math.random() - 0.5) * 1.0,
                    size: Math.random() * 4 + 1.5,
                    color: 'rgba(0, 240, 255, 0.8)',
                    alpha: 0.8,
                    decay: 0.03
                });
            }
        }
        
        // Fail-safe check: If all bricks are broken but letter is still mid-air, wait for letters to land.
        // If all bricks are broken AND all floating letters have landed, declare victory!
        if (this.getActiveBricksCount() === 0 && this.floatingLetters.length === 0 && this.state === 'playing') {
            this.stopGame(true);
        }
    }
    
    destroyBrick(brick) {
        brick.status = 0;
        this.score += brick.points;
        this.onScoreChange(this.score);
        this.onBricksChange(this.getActiveBricksCount());
        
        // Sound and screen shake
        if (brick.isVoucher) {
            this.playVoucherSound();
            this.triggerScreenShake();
            this.spawnVoucherFloat(brick);
        } else {
            this.playBrickSound();
        }
        
        // Particle explosion
        this.spawnBrickParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 12);
        
        // Powerup drop chance
        const dropChance = brick.isVoucher ? 0.4 : 0.12; // voucher bricks have higher item drop rate
        if (Math.random() < dropChance) {
            this.spawnPowerup(brick.x + brick.width / 2, brick.y + brick.height);
        }
    }
    
    spawnBrickParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 1,
                color: color,
                alpha: 1.0,
                decay: Math.random() * 0.03 + 0.015
            });
        }
    }
    
    spawnShieldBreakParticles() {
        const y = this.canvas.height - 6;
        for (let x = 0; x < this.canvas.width; x += 15) {
            if (Math.random() < 0.6) {
                this.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: -Math.random() * 3,
                    size: Math.random() * 4 + 1.5,
                    color: '#39ff14',
                    alpha: 1.0,
                    decay: 0.02
                });
            }
        }
    }
    
    spawnVoucherFloat(brick) {
        // Find screen coordinates of the destination slot
        const targetCoords = this.getSlotCanvasCoords(brick.charIndex) || { x: this.canvas.width / 2, y: this.canvas.height };
        
        // Control point for curve (bows upward and to the side)
        const startX = brick.x + brick.width / 2;
        const startY = brick.y + brick.height / 2;
        
        // Draw Bezier curving upwards and inwards
        const ctrlX = (startX + targetCoords.x) / 2 + (Math.random() * 100 - 50);
        const ctrlY = Math.min(startY, targetCoords.y) - 150; // bow upward by 150px
        
        this.floatingLetters.push({
            char: brick.char,
            charIndex: brick.charIndex,
            x: startX,
            y: startY,
            startX: startX,
            startY: startY,
            ctrlX: ctrlX,
            ctrlY: ctrlY,
            targetX: targetCoords.x,
            targetY: targetCoords.y,
            t: 0,
            speed: 0.018 // travel speed
        });
    }
    
    getSlotCanvasCoords(charIndex) {
        const slotElements = document.querySelectorAll('.code-slot');
        if (!slotElements || slotElements.length <= charIndex) return null;
        
        const slotElement = slotElements[charIndex];
        const slotRect = slotElement.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        return {
            x: (slotRect.left + slotRect.width / 2 - canvasRect.left) * (this.canvas.width / canvasRect.width),
            y: (slotRect.top + slotRect.height / 2 - canvasRect.top) * (this.canvas.height / canvasRect.height)
        };
    }
    
    spawnPowerup(x, y) {
        const types = ['wide', 'slow', 'laser', 'multiball', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Define items metadata
        const details = {
            wide: { color: '#00f0ff', label: 'W' },       // Wide paddle
            slow: { color: '#ff9f1c', label: 'S' },       // Slow ball
            laser: { color: '#ff007f', label: 'L' },      // Laser paddle
            multiball: { color: '#9d4edd', label: 'M' },  // Extra ball
            shield: { color: '#39ff14', label: '🛡️' }     // Bottom floor shield
        };
        
        this.powerups.push({
            x: x - 10,
            y: y,
            width: 22,
            height: 22,
            speed: 2.0,
            type: type,
            color: details[type].color,
            label: details[type].label
        });
    }
    
    activatePowerup(type) {
        this.playPowerUpSound();
        const now = Date.now();
        
        switch (type) {
            case 'wide':
                this.activePowerups.wide = now + this.powerupDuration.wide;
                this.updateTimerBar('wide', this.powerupDuration.wide);
                break;
            case 'slow':
                this.activePowerups.slow = now + this.powerupDuration.slow;
                this.updateTimerBar('slow', this.powerupDuration.slow);
                break;
            case 'laser':
                this.activePowerups.laser = now + this.powerupDuration.laser;
                this.updateTimerBar('laser', this.powerupDuration.laser);
                break;
            case 'multiball':
                // spawn two new balls
                this.spawnBall(false);
                this.spawnBall(false);
                break;
            case 'shield':
                this.activePowerups.shield = true;
                this.updateTimerBar('shield', 0); // infinite display until broken
                break;
        }
    }
    
    updateTimerBar(type, duration) {
        const container = document.getElementById('powerup-timers');
        if (!container) return;
        
        // Remove existing indicator if any
        const existing = document.getElementById(`timer-${type}`);
        if (existing) existing.remove();
        
        const names = {
            wide: 'WIDE PADDLE',
            slow: 'SLOW MOTION',
            laser: 'LASER BLASTER',
            shield: 'SHIELD BARRIER'
        };
        
        const bar = document.createElement('div');
        bar.id = `timer-${type}`;
        bar.className = `powerup-timer-bar ${type}`;
        
        bar.innerHTML = `
            <span>${names[type]}</span>
            ${duration > 0 ? `
            <div class="timer-fill-wrapper">
                <div class="timer-fill" style="transform: scaleX(1)"></div>
            </div>` : ''}
        `;
        
        container.appendChild(bar);
        
        if (duration > 0) {
            const fill = bar.querySelector('.timer-fill');
            const start = Date.now();
            
            const runTimer = () => {
                const elapsed = Date.now() - start;
                const remainingRatio = Math.max(0, 1 - elapsed / duration);
                fill.style.transform = `scaleX(${remainingRatio})`;
                
                if (remainingRatio > 0 && this.state === 'playing') {
                    requestAnimationFrame(runTimer);
                } else {
                    bar.remove();
                }
            };
            requestAnimationFrame(runTimer);
        } else {
            // Infinite shield. Check periodically or remove when shield active state is false
            const checkShield = () => {
                if (!this.activePowerups.shield || this.state !== 'playing') {
                    bar.remove();
                } else {
                    requestAnimationFrame(checkShield);
                }
            };
            requestAnimationFrame(checkShield);
        }
    }
    
    shootLasers() {
        this.playLaserSound();
        const laserSpeed = 8;
        // Shoot two lasers from the sides of the paddle
        this.lasers.push({
            x: this.paddle.x + 5,
            y: this.paddle.y,
            width: 4,
            height: 12,
            speed: laserSpeed
        });
        this.lasers.push({
            x: this.paddle.x + this.paddle.width - 9,
            y: this.paddle.y,
            width: 4,
            height: 12,
            speed: laserSpeed
        });
    }
    
    // Helper to get hex colors in JS strings
    getHexColor(variableName) {
        return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    }
    
    // ==========================================================================
    // CANVAS RENDERING
    // ==========================================================================
    draw() {
        // Clear canvas with a very soft transparent trail to make moving objects feel fluid
        this.ctx.fillStyle = 'rgba(7, 5, 15, 0.25)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw shield if active
        if (this.activePowerups.shield) {
            const grad = this.ctx.createLinearGradient(0, this.canvas.height - 4, this.canvas.width, this.canvas.height);
            grad.addColorStop(0, 'rgba(57, 255, 20, 0.1)');
            grad.addColorStop(0.5, '#39ff14');
            grad.addColorStop(1, 'rgba(57, 255, 20, 0.1)');
            
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.canvas.height - 4);
            this.ctx.lineTo(this.canvas.width, this.canvas.height - 4);
            this.ctx.stroke();
            
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#39ff14';
            this.ctx.stroke();
            this.ctx.shadowBlur = 0; // reset
        }
        
        // Draw bricks
        this.bricks.forEach(brick => {
            if (brick.status === 0) return;
            
            const gradient = this.ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
            if (brick.isVoucher) {
                // Voucher Bricks glow golden/cyan
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, '#00f0ff');
                gradient.addColorStop(1, '#8a2be2');
                
                // Add outer glow for special brick
                this.ctx.shadowBlur = 12;
                this.ctx.shadowColor = '#00f0ff';
            } else {
                gradient.addColorStop(0, brick.color);
                gradient.addColorStop(1, this.blendHex(brick.color, '#000000', 0.5));
            }
            
            this.ctx.fillStyle = gradient;
            
            // Rounded corners on bricks for modern feel
            const radius = 5;
            this.ctx.beginPath();
            this.ctx.moveTo(brick.x + radius, brick.y);
            this.ctx.lineTo(brick.x + brick.width - radius, brick.y);
            this.ctx.quadraticCurveTo(brick.x + brick.width, brick.y, brick.x + brick.width, brick.y + radius);
            this.ctx.lineTo(brick.x + brick.width, brick.y + brick.height - radius);
            this.ctx.quadraticCurveTo(brick.x + brick.width, brick.y + brick.height, brick.x + brick.width - radius, brick.y + brick.height);
            this.ctx.lineTo(brick.x + radius, brick.y + brick.height - radius);
            this.ctx.quadraticCurveTo(brick.x, brick.y + brick.height, brick.x, brick.y + brick.height - radius);
            this.ctx.lineTo(brick.x, brick.y + radius);
            this.ctx.quadraticCurveTo(brick.x, brick.y, brick.x + radius, brick.y);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Subtle top highlight border
            this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            this.ctx.shadowBlur = 0; // reset
            
            // Draw a subtle placeholder letter icon inside voucher bricks
            if (brick.isVoucher) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 10px Orbitron';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('🔑', brick.x + brick.width / 2, brick.y + brick.height / 2);
            }
        });
        
        // Draw dropping powerups
        this.powerups.forEach(p => {
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = p.color;
            
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            // Hexagon or circle item shape
            this.ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0; // reset
            
            // Label letter
            this.ctx.fillStyle = '#07050f';
            this.ctx.font = 'bold 10px Orbitron';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(p.label, p.x + p.width / 2, p.y + p.height / 2);
        });
        
        // Draw lasers
        this.lasers.forEach(laser => {
            this.ctx.fillStyle = '#ff007f';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#ff007f';
            this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
            this.ctx.shadowBlur = 0;
        });
        
        // Draw particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0; // reset
        
        // Draw paddle
        const padGrad = this.ctx.createLinearGradient(this.paddle.x, this.paddle.y, this.paddle.x + this.paddle.width, this.paddle.y);
        
        const now = Date.now();
        const laserActive = this.activePowerups.laser > now;
        const wideActive = this.activePowerups.wide > now;
        
        if (laserActive) {
            padGrad.addColorStop(0, '#ff007f');
            padGrad.addColorStop(0.5, '#bd00ff');
            padGrad.addColorStop(1, '#ff007f');
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#ff007f';
        } else if (wideActive) {
            padGrad.addColorStop(0, '#00f0ff');
            padGrad.addColorStop(0.5, '#6f00f7');
            padGrad.addColorStop(1, '#00f0ff');
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00f0ff';
        } else {
            padGrad.addColorStop(0, '#9d4edd');
            padGrad.addColorStop(0.5, '#6f00f7');
            padGrad.addColorStop(1, '#9d4edd');
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#9d4edd';
        }
        
        this.ctx.fillStyle = padGrad;
        
        // Draw rounded paddle
        const r = this.paddle.height / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.paddle.x + r, this.paddle.y);
        this.ctx.lineTo(this.paddle.x + this.paddle.width - r, this.paddle.y);
        this.ctx.quadraticCurveTo(this.paddle.x + this.paddle.width, this.paddle.y, this.paddle.x + this.paddle.width, this.paddle.y + r);
        this.ctx.quadraticCurveTo(this.paddle.x + this.paddle.width, this.paddle.y + this.paddle.height, this.paddle.x + this.paddle.width - r, this.paddle.y + this.paddle.height);
        this.ctx.lineTo(this.paddle.x + r, this.paddle.y + this.paddle.height);
        this.ctx.quadraticCurveTo(this.paddle.x, this.paddle.y + this.paddle.height, this.paddle.x, this.paddle.y + r);
        this.ctx.quadraticCurveTo(this.paddle.x, this.paddle.y, this.paddle.x + r, this.paddle.y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // reset
        
        // If laser is active, draw visual blaster barrels on the edges
        if (laserActive) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(this.paddle.x + 4, this.paddle.y - 4, 6, 4);
            this.ctx.fillRect(this.paddle.x + this.paddle.width - 10, this.paddle.y - 4, 6, 4);
        }
        
        // Draw balls
        this.balls.forEach(ball => {
            const ballGrad = this.ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.radius);
            ballGrad.addColorStop(0, '#ffffff');
            
            if (this.activePowerups.slow > now) {
                ballGrad.addColorStop(1, '#ff9f1c');
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#ff9f1c';
            } else {
                ballGrad.addColorStop(1, '#00f0ff');
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = '#00f0ff';
            }
            
            this.ctx.fillStyle = ballGrad;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // reset
            
            // Draw launch prompt if ball is held on paddle
            if (!ball.launched) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.font = 'bold 10px Orbitron';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('PRESS SPACE / TAP TO LAUNCH', this.canvas.width / 2, this.paddle.y - 25);
            }
        });
        
        // Draw floating letters traveling to the tray
        this.floatingLetters.forEach(fl => {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00f0ff';
            
            // Circle backboard for the letter
            this.ctx.fillStyle = 'rgba(4, 3, 10, 0.9)';
            this.ctx.strokeStyle = '#00f0ff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(fl.x, fl.y, 16, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Text character
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '900 16px Orbitron';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(fl.char, fl.x, fl.y + 1);
            
            this.ctx.shadowBlur = 0; // reset
        });
    }
    
    // Core game loop
    loop() {
        if (this.state !== 'playing') return;
        
        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.loop());
    }
    
    // ==========================================================================
    // HELPERS
    // ==========================================================================
    blendHex(c1, c2, weight) {
        // Quick helper to blend two hex colors
        const p = parseFloat(weight);
        const w = p * 2 - 1;
        const a = 0; // alpha differences ignored
        
        const w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
        const w2 = 1.0 - w1;
        
        const rgb1 = this.hexToRgb(c1);
        const rgb2 = this.hexToRgb(c2);
        
        const r = Math.round(rgb1.r * w1 + rgb2.r * w2);
        const g = Math.round(rgb1.g * w1 + rgb2.g * w2);
        const b = Math.round(rgb1.b * w1 + rgb2.b * w2);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
}

// Helpers for color constants outside class
function varNeonOrange() {
    return '#ff9f1c';
}
