(function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const COLS = 8;
    const ROWS = 5;
    const CELL_W = 113;
    const CELL_H = 120;

    const pauseOverlay = document.getElementById('pauseOverlay');

    // Размеры для отрисовки
    const PEASHOOTER_IMG_W = 60;
    const PEASHOOTER_IMG_H = 65;
    const PEASHOOTER_OFFSET_X = 0;
    const PEASHOOTER_OFFSET_Y = 0;
    
    const ICESHOOTER_IMG_W = 80;
    const ICESHOOTER_IMG_H = 85;
    const ICESHOOTER_OFFSET_X = 0;
    const ICESHOOTER_OFFSET_Y = 0;
    
    const SPIKEROCK_IMG_W = 55;
    const SPIKEROCK_IMG_H = 25;
    const SPIKEROCK_OFFSET_X = 0;
    const SPIKEROCK_OFFSET_Y = 40;
    
    const PEA_WIDTH = 22;
    const PEA_HEIGHT = 20;
    const PEA_OFFSET_X = -27;
    const PEA_OFFSET_Y = 19;
    
    const ICE_PEA_WIDTH = 22;
    const ICE_PEA_HEIGHT = 20;
    const ICE_PEA_OFFSET_X = -30;
    const ICE_PEA_OFFSET_Y = 20;

    // Стоимость растений
    const PEASANT_COST = 100;
    const SUNFLOWER_COST = 50;
    const WALNUT_COST = 50;
    const ICESHOOTER_COST = 150;
    const SPIKEROCK_COST = 125;

    // Кулдауны на установку растений
let plantCooldowns = {
    pea: 0,
    sunflower: 0,
    walnut: 0,
    iceshooter: 0,
    spikerock: 0
};

const PLANT_COOLDOWN_TIMES = {
    pea: 300,      // 5 секунд (60 FPS * 5)
    sunflower: 180, // 3 секунды
    walnut: 240,    // 4 секунды
    iceshooter: 420, // 7 секунд
    spikerock: 480   // 8 секунд
};

// Функции для кулдаунов растений
function updatePlantCooldowns() {
    for (let plant in plantCooldowns) {
        if (plantCooldowns[plant] > 0) {
            plantCooldowns[plant]--;
        }
    }
    updateCooldownDisplay();
}

function updateCooldownDisplay() {
    const shopItems = document.querySelectorAll('.shop-item');
    shopItems.forEach(item => {
        const plantType = item.getAttribute('data-plant');
        const cooldown = plantCooldowns[plantType];
        
        // Удаляем старый оверлей если есть
        const oldOverlay = item.querySelector('.cooldown-overlay');
        if (oldOverlay) oldOverlay.remove();
        
        if (cooldown > 0) {
            const seconds = Math.ceil(cooldown / 60);
            const overlay = document.createElement('div');
            overlay.className = 'cooldown-overlay';
            overlay.textContent = seconds;
            item.style.position = 'relative';
            item.appendChild(overlay);
        }
    });
}
    let gameWave = 1;
    let gameKills = 0;
    let gameScore = 0;

    let sunAmount = 1000;
    let score = 0;
    let gameRunning = false;
    let gameActive = false;
    let animationId = null;
    let selectedPlantType = 'pea';

    let plants = [];
    let zombies = [];
    let projectiles = [];
    let fallingSuns = [];
    let iceTrails = [];

    let gridOffsetX = 0;
    let gridOffsetY = 0;

    let paused = false;
    let wavesPaused = false;
    
    let currentWave = 1;
    let zombiesToSpawn = 0;
    let zombiesSpawnedInWave = 0;
    let waveInProgress = false;
    let waveCooldown = false;
    let waveCooldownTimer = 0;
    let nextWaveTimer = 0;
    let waveMessage = '';
    let waveMessageTimer = 0;

    let lastZombieSpawn = 0;
    let lastSunFallSpawn = 0;

    let bucketGuaranteedThisWave = false;
    let zombiesSpawnedInCurrentWave = 0;
    let totalZombiesInCurrentWave = 0;

    let zombieOffsetY = -15;
    let lastFrameTime = 0;

    const ZOMBIE_WIDTH = 85;
    const ZOMBIE_HEIGHT = 95;
    const SPIKEROCK_WIDTH = 70;
    const SPIKEROCK_HEIGHT = 30;
    const ZOMBONI_WIDTH = 100;  // Увеличен размер
    const ZOMBONI_HEIGHT = 95;  // Увеличен размер
    const SUN_FALL_INTERVAL = 20000;
    const SUN_VISUAL_SIZE = 40;
    const SUN_HITBOX_SIZE = 60;  // Увеличен хитбокс солнышек
    const ZOMBIE_SPAWN_DELAY = 5000;

    // Конфигурация анимаций
    const ANIMATION_SPEED = 8;
    
    const PLANT_FRAMES = {
        idle: [0, 1, 2, 1],
        attack: [0, 3, 4, 3]
    };
    
    const ZOMBIE_FRAMES = {
        walk: [0, 1, 2, 1],
        attack: [3, 4, 5, 4]
    };

    const ZOMBIE_TYPES = {
        normal: { health: 190, speed: 0.17, damage: 100, attackDelay: 90, name: 'Зомби', score: 10 },
        bucket: { health: 570, speed: 0.17, damage: 100, attackDelay: 102, name: 'Ведёрный зомби', score: 20 },
        allstar: { health: 850, speed: 0.27, damage: 100, attackDelay: 80, name: 'All-Star Zombie', score: 30 },
        zomboni: { health: 1160, speed: 0.17, damage: 999, attackDelay: 1, name: 'Зомбони', score: 50, explosionRadius: 1, explosionDamage: 40 }
    };

    // Функция отрисовки заглушек
    function drawFallbackSprite(ctx, type, x, y, width, height, isAttacking = false, now = Date.now()) {
        ctx.save();
        ctx.shadowBlur = 0;
        
        switch(type) {
            case 'pea':
                ctx.fillStyle = '#6ec83e';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#4a9e2a';
                ctx.beginPath();
                ctx.ellipse(x + width/2 - 5, y + height/2 - 5, 8, 8, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#8a5a2a';
                ctx.beginPath();
                ctx.ellipse(x + width/2 + 5, y + height/2 - 5, 8, 8, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#2a4a1a';
                ctx.beginPath();
                ctx.rect(x + width/2 - 3, y + height - 15, 6, 15);
                ctx.fill();
                break;
                
            case 'sunflower':
                ctx.fillStyle = '#f7b32b';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#8a5a2a';
                for(let i = 0; i < 12; i++) {
                    let angle = (i * Math.PI * 2) / 12;
                    let px = x + width/2 + Math.cos(angle) * 18;
                    let py = y + height/2 + Math.sin(angle) * 18;
                    ctx.beginPath();
                    ctx.ellipse(px, py, 6, 8, angle, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.fillStyle = '#5a3a1a';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2, 15, 15, 0, 0, Math.PI*2);
                ctx.fill();
                break;
                
            case 'walnut':
                ctx.fillStyle = '#c8a86e';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#a07848';
                ctx.beginPath();
                ctx.ellipse(x + width/2 - 8, y + height/2 - 5, 8, 10, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x + width/2 + 8, y + height/2 - 5, 8, 10, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#786038';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 + 8, 12, 8, 0, 0, Math.PI*2);
                ctx.fill();
                break;
                
            case 'iceshooter':
                ctx.fillStyle = '#88ccff';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#5599cc';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 - 10, 20, 20, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                for(let i = 0; i < 6; i++) {
                    ctx.beginPath();
                    ctx.ellipse(x + width/2 - 5 + i*2, y + height/2 - 12, 2, 2, 0, 0, Math.PI*2);
                    ctx.fill();
                }
                break;
                
            case 'spikerock':
                ctx.fillStyle = '#6a5a2a';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height - 10, width/2, 12, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#8a7a3a';
                for(let i = 0; i < 7; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x + width/2 + (i-3) * 8, y + height - 15);
                    ctx.lineTo(x + width/2 + (i-3) * 5, y + height - 2);
                    ctx.lineTo(x + width/2 + (i-3) * 11, y + height - 8);
                    ctx.fill();
                }
                break;
                
            case 'zombie':
                ctx.fillStyle = '#6f8a4a';
                ctx.fillRect(x + 10, y + 20, width - 20, height - 35);
                ctx.fillStyle = '#5a7a3a';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 - 15, 25, 28, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#3a5a2a';
                ctx.beginPath();
                ctx.ellipse(x + width/2 - 10, y + height/2 - 20, 5, 5, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x + width/2 + 10, y + height/2 - 20, 5, 5, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#8a5a3a';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 - 8, 12, 6, 0, 0, Math.PI*2);
                ctx.fill();
                break;
                
            case 'zomboni':
                ctx.fillStyle = '#557799';
                ctx.fillRect(x + 5, y + 15, width - 10, height - 25);
                ctx.fillStyle = '#7799bb';
                ctx.fillRect(x + 10, y + 10, width - 20, 15);
                ctx.fillStyle = '#334455';
                for(let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.ellipse(x + 15 + i*25, y + height - 10, 8, 6, 0, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.fillStyle = '#aabbcc';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 - 10, 15, 12, 0, 0, Math.PI*2);
                ctx.fill();
                break;
                
            case 'bucket':
                ctx.fillStyle = '#8a8a8a';
                ctx.fillRect(x + 10, y + 20, width - 20, height - 35);
                ctx.fillStyle = '#cccccc';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 - 20, 28, 22, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#aaaaaa';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 - 18, 25, 18, 0, 0, Math.PI*2);
                ctx.fill();
                break;
                
            case 'allstar':
                ctx.fillStyle = '#8a5a3a';
                ctx.fillRect(x + 10, y + 20, width - 20, height - 35);
                ctx.fillStyle = '#cc8833';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 - 15, 22, 25, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#ffcc44';
                ctx.beginPath();
                ctx.ellipse(x + width/2, y + height/2 - 20, 18, 18, 0, 0, Math.PI*2);
                ctx.fill();
                break;
        }
        
        // Полоска здоровья для зомби
        if(['zombie', 'zomboni', 'bucket', 'allstar'].includes(type)) {
            ctx.fillStyle = '#2c2c2c';
            ctx.fillRect(x - 2, y - 14, width - 6, 12);
            ctx.fillStyle = '#8b0000';
            ctx.fillRect(x, y - 12, width - 10, 8);
        }
        
        ctx.restore();
    }

    function getPlantCostByType(plantType) {
        switch (plantType) {
            case 'pea': return PEASANT_COST;
            case 'sunflower': return SUNFLOWER_COST;
            case 'walnut': return WALNUT_COST;
            case 'iceshooter': return ICESHOOTER_COST;
            case 'spikerock': return SPIKEROCK_COST;
            default: return 0;
        }
    }

    function showRefundEffect(row, col, amount) {
        const refundDiv = document.createElement('div');
        refundDiv.textContent = `+${amount}`;
        refundDiv.style.position = 'fixed';
        refundDiv.style.color = '#f7b32b';
        refundDiv.style.fontFamily = "'Press Start 2P', monospace";
        refundDiv.style.fontSize = '1.2rem';
        refundDiv.style.fontWeight = 'bold';
        refundDiv.style.textShadow = '2px 2px 0 #2d1f00';
        refundDiv.style.pointerEvents = 'none';
        refundDiv.style.zIndex = '3000';
        refundDiv.style.animation = 'floatUp 0.8s ease-out forwards';

        const rect = canvas.getBoundingClientRect();
        const cellX = rect.left + (col * CELL_W) + (CELL_W / 2);
        const cellY = rect.top + (row * CELL_H) + (CELL_H / 2);

        refundDiv.style.left = `${cellX - 30}px`;
        refundDiv.style.top = `${cellY - 20}px`;

        document.body.appendChild(refundDiv);

        setTimeout(() => {
            if (refundDiv && refundDiv.remove) refundDiv.remove();
        }, 800);
    }

    function deletePlantByRowCol(row, col) {
        if (!gameRunning || paused) return false;
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;

        let plantIndex = -1;
        let plant = null;

        for (let i = 0; i < plants.length; i++) {
            if (plants[i].row === row && plants[i].col === col) {
                plantIndex = i;
                plant = plants[i];
                break;
            }
        }

        if (plantIndex === -1) return false;

        const plantCost = getPlantCostByType(plant.type);
        const refundAmount = plant.type === 'spikerock' ? 0 : Math.floor(plantCost * 0.3);

        sunAmount += refundAmount;
        plants.splice(plantIndex, 1);
        if (refundAmount > 0) showRefundEffect(row, col, refundAmount);
        updateUI();
        return true;
    }

    function createAllStarZombie(row, x) {
        return {
            row: row, x: x, health: ZOMBIE_TYPES.allstar.health,
            maxHealth: ZOMBIE_TYPES.allstar.health,
            attackCooldown: 0, type: 'allstar', speed: ZOMBIE_TYPES.allstar.speed,
            animOffset: Math.random() * Math.PI * 2,
            animationFrame: 0,
            animationTimer: 0,
            isAttacking: false,
            frameCounter: 0
        };
    }

    function createZomboni(row, x) {
        return {
            row: row, x: x, health: ZOMBIE_TYPES.zomboni.health,
            maxHealth: ZOMBIE_TYPES.zomboni.health,
            attackCooldown: 0, type: 'zomboni', speed: ZOMBIE_TYPES.zomboni.speed,
            animOffset: Math.random() * Math.PI * 2,
            animationFrame: 0,
            animationTimer: 0,
            isAttacking: false,
            frameCounter: 0,
            onSpikerockTimer: 0,
            spikerockRow: null,
            spikerockCol: null,
            lastTrailCol: -1,
            waveIceCreated: false
        };
    }

    function getZomboniChance(wave) {
        if (wave < 5) return 0;
        let chance = 0.1 + (wave - 5) * 0.02;
        return Math.min(chance, 0.4);
    }

    function createSun(x, y, targetY, sunType, value) {
        return { x: x, y: y, value: value, targetY: targetY, type: sunType };
    }

    function getRandomSunType() {
        const random = Math.random();
        if (random < 0.75) return { type: 'normal', value: 25 };
        else if (random < 0.95) return { type: 'gold', value: 35 };
        else return { type: 'blue', value: 50 };
    }

    function getZombiesCountForWave(wave) {
        if (wave <= 5) return 3 + Math.floor(wave / 2);
        if (wave <= 10) return 5 + Math.floor((wave - 5) * 0.8);
        if (wave <= 20) return 8 + Math.floor((wave - 10) * 0.6);
        if (wave <= 50) return 12 + Math.floor((wave - 20) * 0.4);
        return 25 + Math.floor((wave - 50) * 0.3);
    }

    function getBucketChance(wave) {
        let chance = 0.05 + (wave - 1) * 0.005;
        return Math.min(chance, 0.4);
    }

    function getAllStarZombieChance(wave) {
        return wave >= 3 ? 0.3 : 0;
    }

    function startWave() {
        if (!gameRunning) return;
        if (wavesPaused) return;

        waveInProgress = true;
        waveCooldown = false;
        const zombiesCount = getZombiesCountForWave(currentWave);
        zombiesToSpawn = zombiesCount;
        zombiesSpawnedInWave = 0;

        totalZombiesInCurrentWave = zombiesCount;
        zombiesSpawnedInCurrentWave = 0;
        bucketGuaranteedThisWave = false;

        waveMessage = `ВОЛНА ${currentWave} / 100`;
        waveMessageTimer = 90;
        lastZombieSpawn = performance.now() + 500;
    }

    function finishWave() {
    waveInProgress = false;
    waveCooldown = true;
    nextWaveTimer = 0;

    iceTrails = [];

    waveMessage = `ВОЛНА ${currentWave} ПРОЙДЕНА!`;
    waveMessageTimer = 90;
    
    // Сохраняем статистику для текущей волны
    gameWave = currentWave;
    
    currentWave++;

    if (currentWave > 100) {
        gameRunning = false;
        
        // Сохраняем финальную статистику
        if (window.authSystem && window.authSystem.isLoggedIn()) {
            window.authSystem.saveGameStats(gameWave, score, gameKills);
        }
        
        alert("ПОБЕДА! Вы прошли все 100 волн!");
        quitToMenu();
        return;
    }
    nextWaveTimer = 300;
    }   

    function zomboniExplosion(zomboni, row, col, x, y) {
        const radius = ZOMBIE_TYPES.zomboni.explosionRadius;
        const damage = ZOMBIE_TYPES.zomboni.explosionDamage;
        
        for (let i = 0; i < plants.length; i++) {
            const plant = plants[i];
            const rowDiff = Math.abs(plant.row - row);
            const colDiff = Math.abs(plant.col - col);
            
            if (rowDiff <= radius && colDiff <= radius) {
                plant.health -= damage;
                plant.hitFlash = 10;
                if (plant.health <= 0) {
                    plants.splice(i, 1);
                    i--;
                }
            }
        }
        
        const explosionDiv = document.createElement('div');
        explosionDiv.textContent = '💥';
        explosionDiv.style.position = 'fixed';
        explosionDiv.style.fontSize = '40px';
        explosionDiv.style.pointerEvents = 'none';
        explosionDiv.style.zIndex = '3000';
        explosionDiv.style.animation = 'explosionPop 0.3s ease-out forwards';
        
        const rect = canvas.getBoundingClientRect();
        const canvasX = x + ZOMBONI_WIDTH / 2;
        const canvasY = y + ZOMBONI_HEIGHT / 2;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        explosionDiv.style.left = `${rect.left + canvasX / scaleX - 25}px`;
        explosionDiv.style.top = `${rect.top + canvasY / scaleY - 25}px`;
        
        document.body.appendChild(explosionDiv);
        setTimeout(() => explosionDiv.remove(), 300);
    }

    function createIceTrail(row, col) {
        if (iceTrails.some(t => t.row === row && t.col === col)) return;
        
        iceTrails.push({
            row: row,
            col: col,
            duration: 3600,
            active: true
        });
    }

    function updateIceTrails() {
        // Следы теперь живут до конца волны, не удаляем
        for (let i = 0; i < iceTrails.length; i++) {
            iceTrails[i].duration--;
            if (iceTrails[i].duration <= 0) {
                iceTrails.splice(i, 1);
                i--;
            }
        }
    }

    function getZombieSpeedBonus(zombie, row, col) {
        if (zombie.type === 'allstar') return 1.0;
        
        const zombieCol = Math.floor(zombie.x / CELL_W);
        const onIce = iceTrails.some(trail => trail.row === row && trail.col === zombieCol);
        
        if (onIce && !zombie.hasSpeedBonus) {
            zombie.hasSpeedBonus = true;
            zombie.originalSpeed = zombie.speed;
            zombie.speed = zombie.originalSpeed * 1.03;
            return 1.03;
        } else if (!onIce && zombie.hasSpeedBonus) {
            zombie.hasSpeedBonus = false;
            zombie.speed = zombie.originalSpeed;
        }
        return 1.0;
    }

    function trySpawnZombieInWave(now) {
        if (!gameRunning || paused) return false;
        if (!waveInProgress) return false;
        if (zombiesToSpawn <= 0) return false;
        if (wavesPaused) return false;

        if (now - lastZombieSpawn >= ZOMBIE_SPAWN_DELAY) {
            lastZombieSpawn = now;
            const row = Math.floor(Math.random() * ROWS);

            let isBucket = false;
            let isAllStar = false;
            let isZomboni = false;

            isZomboni = Math.random() < getZomboniChance(currentWave);

            if (!isZomboni && currentWave >= 3) {
                isAllStar = Math.random() < getAllStarZombieChance(currentWave);
            }

            if (!isZomboni && !isAllStar) {
                if (currentWave >= 5 && !bucketGuaranteedThisWave) {
                    const remainingZombies = zombiesToSpawn;
                    const totalZombies = totalZombiesInCurrentWave;
                    const spawnedSoFar = totalZombies - remainingZombies;
                    let guaranteeChance = (spawnedSoFar + 1) / totalZombies;
                    if (remainingZombies === 1) guaranteeChance = 1.0;
                    if (Math.random() < guaranteeChance) {
                        isBucket = true;
                        bucketGuaranteedThisWave = true;
                    }
                }
                if (!isBucket) {
                    isBucket = Math.random() < getBucketChance(currentWave);
                }
            }

            let newZombie;
            if (isZomboni) {
                newZombie = createZomboni(row, canvas.width - 30);
            } else if (isAllStar) {
                newZombie = createAllStarZombie(row, canvas.width - 30);
            } else if (isBucket) {
                newZombie = {
                    row: row, x: canvas.width - 30,
                    health: ZOMBIE_TYPES.bucket.health, maxHealth: ZOMBIE_TYPES.bucket.health,
                    attackCooldown: 0, type: 'bucket', speed: ZOMBIE_TYPES.bucket.speed,
                    animOffset: Math.random() * Math.PI * 2,
                    animationFrame: 0,
                    animationTimer: 0,
                    isAttacking: false,
                    frameCounter: 0
                };
            } else {
                newZombie = {
                    row: row, x: canvas.width - 30,
                    health: ZOMBIE_TYPES.normal.health, maxHealth: ZOMBIE_TYPES.normal.health,
                    attackCooldown: 0, type: 'normal', speed: ZOMBIE_TYPES.normal.speed,
                    animOffset: Math.random() * Math.PI * 2,
                    animationFrame: 0,
                    animationTimer: 0,
                    isAttacking: false,
                    frameCounter: 0
                };
            }
            zombies.push(newZombie);

            zombiesToSpawn--;
            zombiesSpawnedInWave++;
            zombiesSpawnedInCurrentWave++;
            return true;
        }
        return false;
    }

    const images = {
        peaShooter: null, sunflower: null, walnut: null, iceShooter: null, spikerock: null,
        zombieNormal: null, zombieBucket: null, zombieAllStar: null, zomboni: null,
        pea: null, icePea: null, sunNormal: null, sunGold: null, sunBlue: null, background: null
    };

    let imagesLoaded = false;
    let imagesToLoad = 0;
    let imagesLoadedCount = 0;

    function loadImages() {
        return new Promise((resolve) => {
            const imageFiles = {
                peaShooter: 'images/pea-shooter.png',
                sunflower: 'images/sunflower.png',
                walnut: 'images/walnut.png',
                iceShooter: 'images/ice-shooter.png',
                spikerock: 'images/spikerock.png',
                zombieNormal: 'images/zombie-normal.png',
                zombieBucket: 'images/zombie-bucket.png',
                zombieAllStar: 'images/All-Star Zombie.png',
                zomboni: 'images/zomboni.png',
                pea: 'images/pea.png',
                icePea: 'images/ice-pea.png',
                sunNormal: 'images/sun.png',
                sunGold: 'images/sun-gold.png',
                sunBlue: 'images/sun-blue.png',
                background: 'images/pvz-bg.jpg'
            };
            imagesToLoad = Object.keys(imageFiles).length;
            imagesLoadedCount = 0;

            for (const [key, path] of Object.entries(imageFiles)) {
                const img = new Image();
                img.onload = () => {
                    imagesLoadedCount++;
                    if (imagesLoadedCount === imagesToLoad) {
                        imagesLoaded = true;
                        resolve();
                    }
                };
                img.onerror = () => {
                    console.warn(`Не удалось загрузить: ${path}`);
                    imagesLoadedCount++;
                    if (imagesLoadedCount === imagesToLoad) {
                        imagesLoaded = true;
                        resolve();
                    }
                };
                img.src = path;
                images[key] = img;
            }
        });
    }

    const startMenu = document.getElementById('startMenu');
    const pauseBtn = document.getElementById('pauseBtn');
    const playBtn = document.getElementById('playBtn');

    function updateUI() {
        document.getElementById('sunAmount').innerText = Math.floor(sunAmount);
        document.getElementById('scoreValue').innerText = score;

        let waveDisplay = document.querySelector('.wave-display');
        if (!waveDisplay) {
            const infoPanel = document.querySelector('.info-panel');
            if (infoPanel) {
                waveDisplay = document.createElement('div');
                waveDisplay.className = 'wave-display';
                waveDisplay.style.background = '#3a2a1a';
                waveDisplay.style.padding = '6px 18px';
                waveDisplay.style.borderRadius = '60px';
                waveDisplay.style.fontFamily = "'Press Start 2P', monospace";
                waveDisplay.style.fontSize = '0.9rem';
                waveDisplay.style.boxShadow = 'inset 0 1px 3px #5a4a2a, 0 4px 0 #1a1a0a';
                infoPanel?.appendChild(waveDisplay);
            }
        }
        if (waveDisplay) {
            waveDisplay.innerHTML = `ВОЛНА ${currentWave}/100`;
        }
    }

    function isCellEmpty(row, col) {
        return !plants.some(p => p.row === row && p.col === col);
    }

function placePlant(row, col, plantType) {
    if (!gameRunning || paused) return false;
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    if (!isCellEmpty(row, col)) return false;
    
    // Проверка кулдауна
    if (plantCooldowns[plantType] > 0) return false;
    
    let cost = 0;
    let plantObj = null;

    if (plantType === 'pea') {
        cost = PEASANT_COST;
        plantObj = { 
            row, col, health: 300, maxHealth: 300, 
            shootCooldown: 0, type: 'pea', 
            animOffset: Math.random() * Math.PI * 2,
            animationFrame: 0,
            animationTimer: 0,
            isAttacking: false,
            frameCounter: 0
        };
    } else if (plantType === 'sunflower') {
        cost = SUNFLOWER_COST;
        plantObj = { 
            row, col, health: 300, maxHealth: 300, 
            type: 'sunflower', 
            lastSunProduce: performance.now(), 
            animOffset: Math.random() * Math.PI * 2,
            animationFrame: 0,
            animationTimer: 0,
            isAttacking: false,
            frameCounter: 0
        };
    } else if (plantType === 'walnut') {
        cost = WALNUT_COST;
        plantObj = { 
            row, col, health: 2000, maxHealth: 2000, 
            type: 'walnut', 
            animOffset: Math.random() * Math.PI * 2,
            animationFrame: 0,
            animationTimer: 0,
            isAttacking: false,
            frameCounter: 0
        };
    } else if (plantType === 'iceshooter') {
        cost = ICESHOOTER_COST;
        plantObj = { 
            row, col, health: 200, maxHealth: 200, 
            shootCooldown: 0, type: 'iceshooter', 
            animOffset: Math.random() * Math.PI * 2,
            animationFrame: 0,
            animationTimer: 0,
            isAttacking: false,
            frameCounter: 0
        };
    } else if (plantType === 'spikerock') {
        cost = SPIKEROCK_COST;
        plantObj = { 
            row, col, health: null, maxHealth: null,
            type: 'spikerock',
            animOffset: Math.random() * Math.PI * 2,
            attackCooldown: 0,
            zombieCounter: 0,
            isZomboniDead: false
        };
    }

    if (sunAmount >= cost && plantObj) {
        plants.push(plantObj);
        sunAmount -= cost;
        // Устанавливаем кулдаун
        plantCooldowns[plantType] = PLANT_COOLDOWN_TIMES[plantType];
        updateCooldownDisplay();
        updateUI();
        return true;
    }
    return false;
}

function updateSpikerockAttack(spikerock) {
    if (spikerock.attackCooldown > 0) {
        spikerock.attackCooldown--;
        return;
    }
    
    const zombiesOnCell = zombies.filter(z => 
        z.row === spikerock.row && 
        z.x >= spikerock.col * CELL_W && 
        z.x <= (spikerock.col + 1) * CELL_W + 40
    );
    
    for (let z of zombiesOnCell) {
        if (z.type === 'zomboni') {
            // Зомбони получает 250 урона, не останавливается
            if (!z.spikerockHits) z.spikerockHits = 0;
            
            z.health -= 250;
            z.spikerockHits++;
            spikerock.attackCooldown = 20; // задержка между ударами
            
            const effectDiv = document.createElement('div');
            effectDiv.textContent = '💢 250!';
            effectDiv.style.position = 'fixed';
            effectDiv.style.fontSize = '20px';
            effectDiv.style.fontWeight = 'bold';
            effectDiv.style.color = '#ff6600';
            effectDiv.style.pointerEvents = 'none';
            effectDiv.style.zIndex = '3000';
            effectDiv.style.animation = 'floatUp 0.5s ease-out forwards';
            const rect = canvas.getBoundingClientRect();
            const cellX = rect.left + (spikerock.col * CELL_W) + CELL_W / 2;
            const cellY = rect.top + (spikerock.row * CELL_H) + CELL_H / 2;
            effectDiv.style.left = `${cellX - 30}px`;
            effectDiv.style.top = `${cellY - 30}px`;
            document.body.appendChild(effectDiv);
            setTimeout(() => effectDiv.remove(), 500);
            
            if (z.health <= 0) {
                const index = zombies.indexOf(z);
                if (index !== -1) {
                    zomboniExplosion(z, z.row, spikerock.col, z.x, z.row * CELL_H + 40);
                    zombies.splice(index, 1);
                    score += ZOMBIE_TYPES.zomboni.score;
                    gameKills++;
                    updateUI();
                }
            }
            return;
        }
    }
    
    // Обычные зомби
    const normalZombies = zombiesOnCell.filter(z => z.type !== 'zomboni');
    if (normalZombies.length > 0) {
        const target = normalZombies[0];
        target.health -= 20;
        spikerock.attackCooldown = 20;
        spikerock.hitFlash = 3;
        
        if (target.health <= 0) {
            const index = zombies.indexOf(target);
            if (index !== -1) {
                zombies.splice(index, 1);
                score += ZOMBIE_TYPES[target.type]?.score || 10;
                gameKills++;
                updateUI();
            }
        }
    }
}

    function checkZombiePassSpikerock() {
        // Колючка бессмертна - ничего не делаем
    }

    function updateSunflowers(now) {
        if (!gameRunning || paused) return;
        for (let p of plants) {
            if (p.type === 'sunflower') {
                if (!p.lastSunProduce) p.lastSunProduce = now;
                if (now - p.lastSunProduce >= 20000) {
                    p.lastSunProduce = now;
                    const plantX = p.col * CELL_W + CELL_W / 2;
                    const plantY = p.row * CELL_H;
                    const { type, value } = getRandomSunType();
                    const leftStripWidth = 30;
                    fallingSuns.push(createSun(
                        plantX - SUN_VISUAL_SIZE / 2 + gridOffsetX + leftStripWidth,
                        plantY + 45,
                        plantY + CELL_H - SUN_VISUAL_SIZE + 45,
                        type, value
                    ));
                    
                    p.isAttacking = true;
                    p.animationTimer = 15;
                }
            }
        }
    }

    function spawnFallingSun(now) {
        if (!gameRunning || paused) return;
        if (now - lastSunFallSpawn >= SUN_FALL_INTERVAL) {
            lastSunFallSpawn = now;
            const randomX = 30 + Math.random() * (canvas.width - SUN_VISUAL_SIZE - 30);
            const { type, value } = getRandomSunType();
            fallingSuns.push(createSun(randomX, -SUN_VISUAL_SIZE, canvas.height - 80 + Math.random() * 40, type, value));
        }
    }

    function updateFallingSuns() {
        if (!gameRunning || paused) return;
        for (let i = 0; i < fallingSuns.length; i++) {
            const sun = fallingSuns[i];
            sun.y += 2;
            if (sun.y >= sun.targetY) sun.y = sun.targetY;
            if (sun.y > canvas.height + 50) {
                fallingSuns.splice(i, 1);
                i--;
            }
        }
    }

    function showSunCollectEffect(x, y, amount, sunType) {
        const effectDiv = document.createElement('div');
        effectDiv.textContent = `+${amount}`;
        effectDiv.style.position = 'fixed';
        effectDiv.style.color = sunType === 'gold' ? '#ffaa33' : (sunType === 'blue' ? '#77ccff' : '#f7b32b');
        effectDiv.style.textShadow = '2px 2px 0 #2d1f00';
        effectDiv.style.fontFamily = "'Press Start 2P', monospace";
        effectDiv.style.fontSize = '1rem';
        effectDiv.style.fontWeight = 'bold';
        effectDiv.style.pointerEvents = 'none';
        effectDiv.style.zIndex = '3000';
        effectDiv.style.animation = 'floatUp 0.5s ease-out forwards';
        effectDiv.style.left = `${x - 20}px`;
        effectDiv.style.top = `${y - 20}px`;
        document.body.appendChild(effectDiv);
        setTimeout(() => { if (effectDiv && effectDiv.remove) effectDiv.remove(); }, 500);
    }

    function tryCollectSun(mouseX, mouseY) {
        if (!gameRunning || paused) return false;
        for (let i = 0; i < fallingSuns.length; i++) {
            const sun = fallingSuns[i];
            let sunSize = sun.type === 'blue' ? 50 : SUN_VISUAL_SIZE;
            const centerX = sun.x + sunSize / 2;
            const centerY = sun.y + sunSize / 2;
            const halfHitbox = SUN_HITBOX_SIZE / 2;
            if (mouseX > centerX - halfHitbox && mouseX < centerX + halfHitbox &&
                mouseY > centerY - halfHitbox && mouseY < centerY + halfHitbox) {
                sunAmount += sun.value;
                fallingSuns.splice(i, 1);
                updateUI();
                showSunCollectEffect(centerX, centerY, sun.value, sun.type);
                return true;
            }
        }
        return false;
    }

function shootPea(plantRow, plantCol, plant) {
    // Получаем позицию растения на канвасе
    const leftStripWidth = 30;
    const plantX = (plantCol * CELL_W) + CELL_W - 15 + leftStripWidth;
    
    // Ищем зомби в той же строке, которые находятся ПРАВЕЕ растения
    const zombiesInFront = zombies.filter(z => {
        if (z.row !== plantRow) return false;
        // Зомби считается видимым, если его позиция правее растения
        // Добавляем небольшой буфер (20px), чтобы зомби был действительно перед растением
        return z.x > plantX - 20;
    });
    
    if (zombiesInFront.length === 0) return false;
    
    const plantCenterY = (plantRow * CELL_H) + CELL_H / 2;
    projectiles.push({ row: plantRow, x: plantX, y: plantCenterY, damage: 20, type: 'pea' });
    
    plant.isAttacking = true;
    plant.animationTimer = 10;
    plant.animationFrame = 0;
    return true;
}

function shootIcePea(plantRow, plantCol, plant) {
    const leftStripWidth = 30;
    const plantX = (plantCol * CELL_W) + CELL_W - 15 + leftStripWidth;
    
    // Ищем зомби в той же строке, которые находятся ПРАВЕЕ растения
    const zombiesInFront = zombies.filter(z => {
        if (z.row !== plantRow) return false;
        return z.x > plantX - 20;
    });
    
    if (zombiesInFront.length === 0) return false;
    
    const plantCenterY = (plantRow * CELL_H) + CELL_H / 2;
    projectiles.push({ row: plantRow, x: plantX, y: plantCenterY, damage: 20, type: 'ice' });
    
    plant.isAttacking = true;
    plant.animationTimer = 10;
    plant.animationFrame = 0;
    return true;
}

    function shootIcePea(plantRow, plantCol, plant) {
        const zombiesInRow = zombies.filter(z => z.row === plantRow);
        if (zombiesInRow.length === 0) return false;
        const leftStripWidth = 30;
        const plantX = (plantCol * CELL_W) + CELL_W - 15 + leftStripWidth;
        const plantCenterY = (plantRow * CELL_H) + CELL_H / 2;
        projectiles.push({ row: plantRow, x: plantX, y: plantCenterY, damage: 20, type: 'ice' });
        
        plant.isAttacking = true;
        plant.animationTimer = 10;
        plant.animationFrame = 0;
        return true;
    }

    function updatePlants() {
        if (!gameRunning || paused) return;
        for (let p of plants) {
            if (p.type === 'pea') {
                if (p.shootCooldown <= 0) {
                    const didShoot = shootPea(p.row, p.col, p);
                    p.shootCooldown = didShoot ? 110 : 8;
                } else {
                    p.shootCooldown--;
                }
            } else if (p.type === 'iceshooter') {
                if (p.shootCooldown <= 0) {
                    const didShoot = shootIcePea(p.row, p.col, p);
                    p.shootCooldown = didShoot ? 130 : 8;
                } else {
                    p.shootCooldown--;
                }
            } else if (p.type === 'spikerock') {
                updateSpikerockAttack(p);
            }
        }
        updatePlantAnimations();
    }

    function updatePlantAnimations() {
        for (let p of plants) {
            if (p.type === 'spikerock') continue;
            
            if (p.animationTimer > 0) {
                p.animationTimer--;
                if (p.animationTimer <= 0) {
                    p.isAttacking = false;
                    p.animationFrame = 0;
                }
            }
            
            if (p.frameCounter === undefined) p.frameCounter = 0;
            p.frameCounter++;
            
            const animSpeed = 6;
            if (p.frameCounter >= animSpeed) {
                p.frameCounter = 0;
                if (p.isAttacking) {
                    p.animationFrame = (p.animationFrame + 1) % PLANT_FRAMES.attack.length;
                } else {
                    p.animationFrame = (p.animationFrame + 1) % PLANT_FRAMES.idle.length;
                }
            }
        }
    }

    function updateProjectiles() {
        if (!gameRunning || paused) return;
        for (let i = 0; i < projectiles.length; i++) {
            const proj = projectiles[i];
            proj.x += 8;
            if (proj.x > canvas.width + 60) {
                projectiles.splice(i, 1);
                i--;
                continue;
            }
            let hit = false;
            for (let j = 0; j < zombies.length; j++) {
                const z = zombies[j];
                if (z.row !== proj.row) continue;
                let peaX, peaWidth;
                if (proj.type === 'ice') {
                    peaX = proj.x + ICE_PEA_OFFSET_X;
                    peaWidth = ICE_PEA_WIDTH;
                } else {
                    peaX = proj.x + PEA_OFFSET_X;
                    peaWidth = PEA_WIDTH;
                }
                const peaRight = peaX + peaWidth;
                let zombieWidth = z.type === 'zomboni' ? ZOMBONI_WIDTH : ZOMBIE_WIDTH;
                const zombieLeft = z.x;
                if (peaRight >= zombieLeft && peaX <= zombieLeft + zombieWidth) {
                if (proj.type === 'ice') {
                    z.health -= proj.damage;
                    // Заморозка может стакаться (обновляем таймер)
                    z.originalSpeed = ZOMBIE_TYPES[z.type]?.speed || z.speed;
                    z.speed = z.originalSpeed * 0.43;
                    z.isFrozen = true;
                    z.frozenTimer = 300;
                    } else {
                    z.health -= proj.damage;
                }
                    hit = true;
                    if (z.health <= 0) {
                        if (z.type === 'zomboni') {
                            const zomboniX = z.x;
                            const zomboniY = z.row * CELL_H + 40;
                            zomboniExplosion(z, z.row, Math.floor((z.x + ZOMBONI_WIDTH / 2) / CELL_W), zomboniX, zomboniY);
                        }
                        score += ZOMBIE_TYPES[z.type]?.score || 10;
                        gameKills++;
                        zombies.splice(j, 1);
                        updateUI();
                    }
                    break;
                }
            }
            if (hit) {
                projectiles.splice(i, 1);
                i--;
            }
        }
    }

    function updateZombies() {
        if (!gameRunning || paused) return;
        const leftStripWidth = 30;
        const leftBoundary = leftStripWidth + gridOffsetX - 10;

        for (let i = 0; i < zombies.length; i++) {
            const z = zombies[i];
            
            if (z.isFrozen && z.frozenTimer > 0) {
                z.frozenTimer--;
                if (z.frozenTimer <= 0) {
                    z.speed = z.originalSpeed;
                    z.isFrozen = false;
                }
            }
            
            if (z.type !== 'zomboni') {
                getZombieSpeedBonus(z, z.row, Math.floor((z.x + ZOMBIE_WIDTH / 2) / CELL_W));
            }
            
            if (z.type === 'zomboni') {
                const currentCol = Math.floor((z.x + ZOMBONI_WIDTH / 2) / CELL_W);
                if (currentCol !== z.lastTrailCol) {
                    z.lastTrailCol = currentCol;
                    if (currentCol >= 0 && currentCol < COLS) {
                        createIceTrail(z.row, currentCol);
                    }
                }
            }
            
            if (z.x + (z.type === 'zomboni' ? ZOMBONI_WIDTH : ZOMBIE_WIDTH) <= leftBoundary) {
                gameRunning = false;
                cancelAnimationFrame(animationId);
                 if (window.authSystem && window.authSystem.isLoggedIn()) {
        window.authSystem.saveGameStats(currentWave - 1, score, gameKills);
    }
                alert(`Зомби ворвались в дом! Игра окончена.\nВы прошли ${currentWave - 1} волн!`);
                quitToMenu();
                return;
            }
            
            let targetPlant = null;
            let targetCol = -1;
            let maxRightEdge = -Infinity;
            for (let p of plants) {
                if (p.row === z.row) {
                    const plantRightEdge = p.col * CELL_W + CELL_W + gridOffsetX;
                    if (plantRightEdge <= z.x + (z.type === 'zomboni' ? ZOMBONI_WIDTH : ZOMBIE_WIDTH)) {
                        if (plantRightEdge > maxRightEdge) {
                            maxRightEdge = plantRightEdge;
                            targetPlant = p;
                            targetCol = p.col;
                        }
                    }
                }
            }
            
            if (targetPlant) {
                const targetX = targetCol * CELL_W + CELL_W + gridOffsetX;
                if (Math.abs(z.x - targetX) > 1) {
                    if (z.x < targetX) z.x += Math.min(z.speed, targetX - z.x);
                    else if (z.x > targetX) z.x -= Math.min(z.speed, z.x - targetX);
                    z.isAttacking = false;
                } else {
                    z.x = targetX;
                    z.isAttacking = true;
                }
                
                const isExactlyAtTarget = Math.abs(z.x - targetX) <= 3;
                if (!z.attackCooldown) z.attackCooldown = 0;
                if (isExactlyAtTarget && z.attackCooldown <= 0) {
                    if (z.type === 'zomboni') {
                        // Зомбони давит только НЕ колючку
                        if (targetPlant.type !== 'spikerock') {
                            const plantIndex = plants.indexOf(targetPlant);
                            if (plantIndex !== -1) plants.splice(plantIndex, 1);
                        } else {
                            z.attackCooldown = 30;
                        }
                    } else {
                        const zombieType = ZOMBIE_TYPES[z.type];
                        targetPlant.health -= zombieType.damage;
                        z.attackCooldown = zombieType.attackDelay;
                        targetPlant.hitFlash = 5;
                        if (targetPlant.health <= 0) {
                            const plantIndex = plants.indexOf(targetPlant);
                            if (plantIndex !== -1) plants.splice(plantIndex, 1);
                            continue;
                        }
                    }
                } else if (z.attackCooldown > 0) {
                    z.attackCooldown--;
                }
            } else {
                z.x -= z.speed;
                z.isAttacking = false;
            }
        }
        
        updateZombieAnimations();
        
        for (let p of plants) {
            if (p.hitFlash && p.hitFlash > 0) p.hitFlash--;
        }
    }

    function updateZombieAnimations() {
        for (let z of zombies) {
            if (z.frameCounter === undefined) z.frameCounter = 0;
            z.frameCounter++;
            
            let animSpeed = z.isAttacking ? 6 : 8;
            if (z.frameCounter >= animSpeed) {
                z.frameCounter = 0;
                if (z.isAttacking) {
                    z.animationFrame = (z.animationFrame + 1) % ZOMBIE_FRAMES.attack.length;
                } else {
                    z.animationFrame = (z.animationFrame + 1) % ZOMBIE_FRAMES.walk.length;
                }
            }
        }
    }

    function checkWaveCompletion() {
        if (!gameRunning || paused) return;
        if (waveInProgress && zombiesToSpawn === 0 && zombies.length === 0) {
            finishWave();
        }
    }

    function drawHealthBar(x, y, currentHealth, maxHealth, width) {
        if (currentHealth === null) return;
        const percent = Math.max(0, currentHealth / maxHealth);
        const barWidth = width - 10;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(x - 2, y - 14, barWidth + 4, 12);
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(x, y - 12, barWidth, 8);
        let gradient;
        if (percent > 0.6) {
            gradient = ctx.createLinearGradient(x, y - 12, x + barWidth * percent, y - 4);
            gradient.addColorStop(0, '#6eff3a');
            gradient.addColorStop(1, '#2ecc2a');
        } else if (percent > 0.3) {
            gradient = ctx.createLinearGradient(x, y - 12, x + barWidth * percent, y - 4);
            gradient.addColorStop(0, '#ffcc33');
            gradient.addColorStop(1, '#e6a800');
        } else {
            gradient = ctx.createLinearGradient(x, y - 12, x + barWidth * percent, y - 4);
            gradient.addColorStop(0, '#ff6644');
            gradient.addColorStop(1, '#cc3300');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y - 12, barWidth * percent, 8);
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y - 12, barWidth, 8);
        ctx.font = "bold 8px 'Quicksand'";
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 2;
        ctx.fillText(`${Math.floor(currentHealth)}/${Math.floor(maxHealth)}`, x + 2, y - 4);
        ctx.shadowBlur = 0;
    }

    function drawWaveMessage() {
        if (waveMessageTimer > 0 && waveMessage) {
            ctx.font = "bold 24px 'Press Start 2P'";
            ctx.fillStyle = '#ffefb0';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'black';
            const textWidth = ctx.measureText(waveMessage).width;
            ctx.fillText(waveMessage, canvas.width / 2 - textWidth / 2, canvas.height / 3);
            ctx.shadowBlur = 0;
            waveMessageTimer--;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const leftStripWidth = 30;  // ← ЭТА СТРОКА БЫЛА ПРОПУЩЕНА!
        const topPanelHeight = 40;   // ← тоже добавим для ясности

        // ========== ВЕРХНЯЯ ПАНЕЛЬ (ПРОСТАЯ) ==========
        ctx.fillStyle = '#5a6a4a';
        ctx.fillRect(0, 0, canvas.width, topPanelHeight);
        
        // Декоративная кайма
        ctx.fillStyle = '#c8b888';
        ctx.fillRect(0, 0, canvas.width, 3);
        ctx.fillStyle = '#e8d8a8';
        ctx.fillRect(0, 1, canvas.width, 1);
        
        ctx.fillStyle = '#3a4a2a';
        ctx.fillRect(0, topPanelHeight - 4, canvas.width, 4);
        ctx.fillStyle = '#2a3a1a';
        ctx.fillRect(0, topPanelHeight - 2, canvas.width, 2);
        
        // Простые заклёпки
        ctx.fillStyle = '#d4a820';
        for (let i = 0; i < 12; i++) {
            ctx.beginPath();
            ctx.arc(20 + i * 85, topPanelHeight / 2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Окантовка
        ctx.strokeStyle = '#d4a820';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(3, 3, canvas.width - 6, topPanelHeight - 6);

        // ========== ЛЕВАЯ ПОЛОСА (БАМБУКОВЫЙ ФОН + КРАСНАЯ ГРАНИЦА) ==========
        // Бамбуковый фон
        ctx.fillStyle = '#5a8a3a';
        ctx.fillRect(0, topPanelHeight, leftStripWidth, canvas.height - topPanelHeight);
        
        // Бамбуковые секции (горизонтальные линии)
        ctx.fillStyle = '#4a7a2a';
        for (let i = 0; i < 12; i++) {
            ctx.fillRect(2, topPanelHeight + 8 + i * 45, leftStripWidth - 4, 3);
            ctx.fillStyle = '#6a9a4a';
            ctx.fillRect(4, topPanelHeight + 10 + i * 45, leftStripWidth - 8, 2);
            ctx.fillStyle = '#4a7a2a';
        }
        
        // Вертикальные линии бамбука
        ctx.fillStyle = '#4a7a2a';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(5 + i * 6, topPanelHeight, 2, canvas.height - topPanelHeight);
        }
        
        // КРАСНАЯ ГРАНИЦА (левая полоса - отделяющая линия)
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(leftStripWidth - 4, topPanelHeight, 4, canvas.height - topPanelHeight);
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(leftStripWidth - 2, topPanelHeight, 2, canvas.height - topPanelHeight);
        
        // Тень от левой полосы
        ctx.fillStyle = '#1a2a0a';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(leftStripWidth, topPanelHeight, 5, canvas.height - topPanelHeight);
        ctx.globalAlpha = 1;
        
        // Клетки поля
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const x = col * CELL_W + leftStripWidth;
                const y = row * CELL_H + topPanelHeight;
                ctx.fillStyle = ((row + col) % 2 === 0) ? '#74b04c' : '#5f9e3a';
                ctx.fillRect(x, y, CELL_W, CELL_H);
                ctx.strokeStyle = '#3e6b24';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, CELL_W, CELL_H);
            }
        }

        // Ледяные следы
        for (let trail of iceTrails) {
            const x = trail.col * CELL_W + leftStripWidth;
            const y = trail.row * CELL_H + topPanelHeight;
            const alpha = Math.min(0.6, trail.duration / 3600);
            ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
            ctx.fillRect(x, y, CELL_W, CELL_H);
            ctx.fillStyle = `rgba(150, 220, 255, ${alpha * 0.7})`;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.ellipse(x + CELL_W / 2 + (i - 2) * 8, y + CELL_H / 2, 3, 8, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Декоративные элементы на клетках
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const x = col * CELL_W + leftStripWidth;
                const y = row * CELL_H + topPanelHeight;
                const variant = ((row * 131 + col * 253) % 12);
                
                ctx.globalAlpha = 0.8;
                
                if (variant < 3) {
                    ctx.fillStyle = '#FFD700';
                    ctx.beginPath();
                    ctx.arc(x + 70, y + 35, 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (variant < 6) {
                    ctx.fillStyle = '#FF6A6A';
                    ctx.beginPath();
                    ctx.arc(x + 85, y + 45, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (variant < 9) {
                    ctx.fillStyle = '#AADDFF';
                    ctx.beginPath();
                    ctx.arc(x + 75, y + 40, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#7AAA4A';
                    ctx.beginPath();
                    ctx.ellipse(x + 85, y + 95, 10, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1;

        const now = Date.now();

        // Отрисовка растений
        for (let p of plants) {
            const x = p.col * CELL_W + gridOffsetX + leftStripWidth;
            const y = p.row * CELL_H + gridOffsetY + topPanelHeight;
            
            if (p.type === 'spikerock') {
                let img = images.spikerock;
                const imgX = x + (CELL_W - SPIKEROCK_IMG_W) / 2 + SPIKEROCK_OFFSET_X;
                const imgY = y + (CELL_H - SPIKEROCK_IMG_H) / 2 + SPIKEROCK_OFFSET_Y;
                
                let imageDrawn = false;
                if (img && img.complete && img.naturalWidth > 0) {
                    try {
                        ctx.drawImage(img, imgX, imgY, SPIKEROCK_IMG_W, SPIKEROCK_IMG_H);
                        imageDrawn = true;
                    } catch(e) {}
                }
                if (!imageDrawn) {
                    drawFallbackSprite(ctx, 'spikerock', imgX, imgY, SPIKEROCK_IMG_W, SPIKEROCK_IMG_H);
                }
                continue;
            }
            
            let img = null;
            let imgW, imgH, offsetX, offsetY;
            let plantTypeForFallback = p.type;
            let sway = Math.sin(now * 0.003 + (p.animOffset || 0)) * 3;
            
            if (p.type === 'iceshooter') {
                img = images.iceShooter;
                imgW = ICESHOOTER_IMG_W;
                imgH = ICESHOOTER_IMG_H;
                offsetX = ICESHOOTER_OFFSET_X;
                offsetY = ICESHOOTER_OFFSET_Y;
                plantTypeForFallback = 'iceshooter';
            } else if (p.type === 'sunflower') {
                img = images.sunflower;
                imgW = 70;
                imgH = 70;
                offsetX = -5;
                offsetY = -2;
                plantTypeForFallback = 'sunflower';
            } else if (p.type === 'walnut') {
                img = images.walnut;
                imgW = 65;
                imgH = 70;
                offsetX = -2;
                offsetY = -5;
                plantTypeForFallback = 'walnut';
            } else {
                img = images.peaShooter;
                imgW = PEASHOOTER_IMG_W;
                imgH = PEASHOOTER_IMG_H;
                offsetX = PEASHOOTER_OFFSET_X;
                offsetY = PEASHOOTER_OFFSET_Y;
                plantTypeForFallback = 'pea';
            }
            
            const imgX = x + (CELL_W - imgW) / 2 + sway * 0.3 + offsetX;
            const imgY = y + (CELL_H - imgH) / 2 + offsetY;
            
            if (p.hitFlash && p.hitFlash > 0) {
                ctx.save();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#ffaa55';
                ctx.beginPath();
                ctx.ellipse(x + CELL_W / 2, y + CELL_H / 2, 35, 40, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.restore();
            }
            
            let imageDrawn = false;
            if (img && img.complete && img.naturalWidth > 0) {
                try {
                    if (p.isAttacking && p.type !== 'sunflower' && p.type !== 'walnut') {
                        ctx.save();
                        ctx.translate(imgX + imgW / 2, imgY + imgH / 2);
                        ctx.scale(1.1, 0.9);
                        ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
                        ctx.restore();
                    } else {
                        ctx.drawImage(img, imgX, imgY, imgW, imgH);
                    }
                    imageDrawn = true;
                } catch(e) {}
            }
            
            if (!imageDrawn) {
                drawFallbackSprite(ctx, plantTypeForFallback, imgX, imgY, imgW, imgH, p.isAttacking, now);
            }
            
            if (p.health !== null) drawHealthBar(x + 5, y + 5, p.health, p.maxHealth, CELL_W);
        }

        // Отрисовка зомби (остаётся без изменений, но используем topPanelHeight вместо 40)
        for (let z of zombies) {
            const y = z.row * CELL_H + gridOffsetY + (CELL_H - (z.type === 'zomboni' ? ZOMBONI_HEIGHT : ZOMBIE_HEIGHT)) / 2 + zombieOffsetY + topPanelHeight;
            let width = z.type === 'zomboni' ? ZOMBONI_WIDTH : ZOMBIE_WIDTH;
            let height = z.type === 'zomboni' ? ZOMBONI_HEIGHT : ZOMBIE_HEIGHT;
            let img = null;
            
            if (z.type === 'bucket') img = images.zombieBucket;
            else if (z.type === 'allstar') img = images.zombieAllStar;
            else if (z.type === 'zomboni') img = images.zomboni;
            else img = images.zombieNormal;
            
            let offset = (z.animOffset || 0);
            let bodySway = Math.sin(now * 0.002 + offset) * 2;
            let headBob = Math.sin(now * 0.003 + offset) * 0.03;
            let yOffset = z.type === 'allstar' ? Math.abs(Math.sin(now * 0.01 + offset)) * 2 : 0;
            
            const xPos = z.x + bodySway;
            const yPos = y + yOffset;
            
            let imageDrawn = false;
            if (img && img.complete && img.naturalWidth > 0) {
                try {
                    ctx.save();
                    ctx.translate(xPos + width/2, yPos + height/2);
                    ctx.rotate(headBob);
                    ctx.drawImage(img, -width/2, -height/2, width, height);
                    ctx.restore();
                    imageDrawn = true;
                } catch(e) { console.warn(e); }
            }
            
            if (!imageDrawn) {
                let fallbackType = 'zombie';
                if (z.type === 'bucket') fallbackType = 'bucket';
                else if (z.type === 'allstar') fallbackType = 'allstar';
                else if (z.type === 'zomboni') fallbackType = 'zomboni';
                drawFallbackSprite(ctx, fallbackType, xPos, yPos, width, height, z.isAttacking, now);
            }
            
            if (z.isFrozen) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#88ccff';
                ctx.fillRect(z.x, y, width, height);
                ctx.globalAlpha = 1;
                ctx.restore();
            }
            drawHealthBar(z.x + 5, y - 5 + yOffset, z.health, z.maxHealth, width);
        }

        // Отрисовка снарядов
        for (let proj of projectiles) {
            let img = null;
            let imgX, imgY, width, height;
            if (proj.type === 'ice') {
                img = images.icePea;
                width = ICE_PEA_WIDTH;
                height = ICE_PEA_HEIGHT;
                imgX = proj.x + ICE_PEA_OFFSET_X;
                imgY = proj.y + ICE_PEA_OFFSET_Y;
            } else {
                img = images.pea;
                width = PEA_WIDTH;
                height = PEA_HEIGHT;
                imgX = proj.x + PEA_OFFSET_X;
                imgY = proj.y + PEA_OFFSET_Y;
            }
            if (img && img.complete && img.naturalWidth) {
                ctx.drawImage(img, imgX, imgY, width, height);
            } else {
                ctx.fillStyle = proj.type === 'ice' ? '#88ccff' : '#d6ff80';
                ctx.beginPath();
                ctx.ellipse(proj.x + width / 2, proj.y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Отрисовка падающего солнца
        for (let sun of fallingSuns) {
            let sunImage = null;
            let sunSize = sun.type === 'blue' ? 50 : SUN_VISUAL_SIZE;
            const twinkle = 0.8 + Math.sin(now * 0.008) * 0.2;
            if (sun.type === 'gold') sunImage = images.sunGold;
            else if (sun.type === 'blue') sunImage = images.sunBlue;
            else sunImage = images.sunNormal;
            if (sunImage && sunImage.complete && sunImage.naturalWidth) {
                ctx.save();
                ctx.globalAlpha = twinkle;
                ctx.drawImage(sunImage, sun.x, sun.y, sunSize, sunSize);
                ctx.restore();
            } else {
                ctx.fillStyle = sun.type === 'gold' ? '#ffaa33' : (sun.type === 'blue' ? '#77ccff' : '#ffdd77');
                ctx.beginPath();
                ctx.ellipse(sun.x + sunSize / 2, sun.y + sunSize / 2, sunSize / 2, sunSize / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Прогресс волны
        if (waveInProgress && getZombiesCountForWave(currentWave) > 0) {
            const totalInWave = getZombiesCountForWave(currentWave);
            const remainingInWave = zombiesToSpawn + zombies.length;
            const progress = (totalInWave - remainingInWave) / totalInWave;
            ctx.fillStyle = '#2c2c2ccc';
            ctx.fillRect(10, canvas.height - 25, 200, 15);
            ctx.fillStyle = '#4a9e2a';
            ctx.fillRect(10, canvas.height - 25, 200 * progress, 15);
            ctx.strokeStyle = '#ffefb0';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, canvas.height - 25, 200, 15);
            ctx.font = "bold 10px 'Press Start 2P'";
            ctx.fillStyle = '#ffefb0';
            ctx.shadowBlur = 2;
            ctx.fillText(`ЗОМБИ: ${remainingInWave}`, 10, canvas.height - 28);
            ctx.shadowBlur = 0;
        }

        // Таймер следующей волны
        if (waveCooldown && nextWaveTimer > 0) {
            ctx.font = "bold 20px 'Press Start 2P'";
            ctx.fillStyle = '#ffdd77';
            ctx.shadowBlur = 3;
            const timerText = `СЛЕДУЮЩАЯ ВОЛНА: ${Math.ceil(nextWaveTimer / 60)}`;
            const textWidth = ctx.measureText(timerText).width;
            ctx.fillText(timerText, canvas.width / 2 - textWidth / 2, canvas.height - 50);
            ctx.shadowBlur = 0;
            nextWaveTimer--;
            if (nextWaveTimer <= 0 && waveCooldown) {
                waveCooldown = false;
                startWave();
            }
        }
        drawWaveMessage();
    }

    let lastAutoSave = 0;
const AUTO_SAVE_INTERVAL = 30000; // раз в 30 секунд

function gameLoop(timestamp) {
    if (!gameActive || !gameRunning) {
        if (animationId) cancelAnimationFrame(animationId);
        return;
    }
    
    if (timestamp - lastAutoSave > AUTO_SAVE_INTERVAL && gameRunning && !paused) {
        lastAutoSave = timestamp;
        if (window.authSystem && window.authSystem.isLoggedIn()) {
            window.authSystem.saveGameStats(currentWave, score, gameKills);
        }
    }
    
    if (!paused) {
        updatePlantCooldowns(); // ← ДОБАВИТЬ ЭТУ СТРОКУ
        trySpawnZombieInWave(timestamp);
        spawnFallingSun(timestamp);
        updateSunflowers(timestamp);
        updateFallingSuns();
        updatePlants();
        updateProjectiles();
        updateZombies();
        updateIceTrails();
        checkZombiePassSpikerock();
        checkWaveCompletion();
    }
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

    async function startGame() {
    // Проверяем авторизацию
    if (!window.authSystem || !window.authSystem.isLoggedIn()) {
        showAuthModal();
        return;
    }
    
    if (!imagesLoaded) {
        const msg = document.createElement('div');
        msg.textContent = 'Загрузка изображений...';
        msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:20px;z-index:3000';
        document.body.appendChild(msg);
        await loadImages();
        msg.remove();
    }
    
    plants = [];
    zombies = [];
    projectiles = [];
    fallingSuns = [];
    iceTrails = [];
    sunAmount = 1000;
    score = 0;
    gameScore = 0;
    gameKills = 0;
    gameWave = 1;
    gameRunning = true;
    paused = false;
    gameActive = true;
    currentWave = 1;
    zombiesToSpawn = 0;
    waveInProgress = false;
    waveCooldown = false;
    waveMessage = '';
    waveMessageTimer = 0;
    nextWaveTimer = 0;
    lastZombieSpawn = performance.now();
    lastSunFallSpawn = performance.now();
    updateUI();
    
    // // Показываем прошлую статистику перед игрой
    // const lastStats = window.authSystem.getLastGameStats();
    // if (lastStats) {
    //     setTimeout(() => {
    //         showStatModal(lastStats);
    //     }, 500);
    // }
    
    setTimeout(() => { if (gameRunning) startWave(); }, 1000);
    startMenu.classList.add('hidden');
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

    function pauseGame() { 
        if (gameActive && gameRunning && !paused) { 
            paused = true; 
            wavesPaused = true;
            if (pauseOverlay) pauseOverlay.classList.remove('hidden');
        } 
    }

    function resumeGame() { 
        if (gameActive && gameRunning && paused) { 
            paused = false; 
            wavesPaused = false;
            if (pauseOverlay) pauseOverlay.classList.add('hidden');
        } 
    }

    function restartGame() {
    if (window.authSystem && window.authSystem.isLoggedIn() && gameRunning) {
        window.authSystem.saveGameStats(currentWave - 1, score, gameKills);
    }
    
    plants = [];
    zombies = [];
    projectiles = [];
    fallingSuns = [];
    iceTrails = [];
    sunAmount = 1000;
    score = 0;
    gameRunning = true;
    paused = false;
    wavesPaused = false;
    currentWave = 1;
    zombiesToSpawn = 0;
    waveInProgress = false;
    waveCooldown = false;
    waveMessage = '';
    updateUI();
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    setTimeout(() => { if (gameRunning) startWave(); }, 1000);
}

    function quitToMenu() { 
    // Сохраняем статистику при выходе в меню
    if (gameActive && gameRunning && window.authSystem && window.authSystem.isLoggedIn()) {
        window.authSystem.saveGameStats(gameWave, score, gameKills);
    }
    
    gameActive = false; 
    gameRunning = false; 
    paused = false; 
    wavesPaused = false;
    if (animationId) cancelAnimationFrame(animationId); 
    startMenu.classList.remove('hidden'); 
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    }

    function getGridFromClick(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let canvasX = (clientX - rect.left) * scaleX;
        let canvasY = (clientY - rect.top) * scaleY;
        const leftStripWidth = 30;
        canvasX -= gridOffsetX;
        canvasX -= leftStripWidth;
        canvasY -= gridOffsetY;
        canvasY -= 40;
        const row = Math.floor(Math.min(Math.max(0, canvasY), canvas.height - 40) / CELL_H);
        const col = Math.floor(Math.min(Math.max(0, canvasX), canvas.width - leftStripWidth) / CELL_W);
        return { row: Math.min(row, ROWS - 1), col: Math.min(col, COLS - 1) };
    }

    function onCanvasClick(e) {
        if (!gameActive || !gameRunning || paused) return;
        let clientX, clientY;
        if (e.touches) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; e.preventDefault(); }
        else { clientX = e.clientX; clientY = e.clientY; }
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let canvasX = (clientX - rect.left) * scaleX;
        let canvasYclick = (clientY - rect.top) * scaleY;
        if (tryCollectSun(canvasX, canvasYclick)) return;
        const { row, col } = getGridFromClick(clientX, clientY);
        if (selectedPlantType === 'delete') {
            deletePlantByRowCol(row, col);
            return;
        }
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS && isCellEmpty(row, col)) {
            placePlant(row, col, selectedPlantType);
        }
    }

    function onCanvasContextMenu(e) {
        e.preventDefault();
        if (!gameActive || !gameRunning || paused) return;
        let clientX, clientY;
        if (e.touches) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        else { clientX = e.clientX; clientY = e.clientY; }
        const { row, col } = getGridFromClick(clientX, clientY);
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            deletePlantByRowCol(row, col);
        }
    }

    document.querySelectorAll('.shop-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.shop-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            const plantType = item.getAttribute('data-plant');
            selectedPlantType = plantType === 'delete' ? 'delete' : plantType;
        });
    });

    playBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', pauseGame);

    const resumeOverlayBtn = document.getElementById('resumeOverlayBtn');
    const restartOverlayBtn = document.getElementById('restartOverlayBtn');
    const quitOverlayBtn = document.getElementById('quitOverlayBtn');

    if (resumeOverlayBtn) resumeOverlayBtn.addEventListener('click', resumeGame);
    if (restartOverlayBtn) restartOverlayBtn.addEventListener('click', restartGame);
    if (quitOverlayBtn) quitOverlayBtn.addEventListener('click', quitToMenu);

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('contextmenu', onCanvasContextMenu);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onCanvasClick(e); });

    document.querySelector('.shop-item[data-plant="pea"]').classList.add('selected');

    startMenu.classList.remove('hidden');
    gameActive = false;
    gameRunning = false;

    // ========== ФУНКЦИИ ДЛЯ АВТОРИЗАЦИИ ==========
function showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'flex';
}

function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function showStatModal(stats) {
    const modal = document.getElementById('statModal');
    if (!modal) return;
    
    document.getElementById('statWave').innerText = stats.wave;
    document.getElementById('statScore').innerText = stats.score;
    document.getElementById('statKills').innerText = stats.kills;
    document.getElementById('statDate').innerText = stats.date;
    
    modal.style.display = 'flex';
}

function hideStatModal() {
    const modal = document.getElementById('statModal');
    if (modal) modal.style.display = 'none';
}

function updateUserPanel() {
    const panel = document.getElementById('userPanel');
    if (!panel) return;
    
    if (window.authSystem && window.authSystem.isLoggedIn()) {
        panel.style.display = 'flex';
        document.getElementById('userNickname').innerText = window.authSystem.currentUser.nickname;
    } else {
        panel.style.display = 'none';
    }
}

// ИНИЦИАЛИЗАЦИЯ АВТОРИЗАЦИИ
function initAuth() {
    updateUserPanel();
    updateStatsPanels();
    
    // Переключение табов
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            
            if (tabName === 'login') {
                if (loginForm) loginForm.classList.add('active');
                if (registerForm) registerForm.classList.remove('active');
            } else {
                if (loginForm) loginForm.classList.remove('active');
                if (registerForm) registerForm.classList.add('active');
            }
            
            // Скрываем окно восстановления
            const resetModal = document.getElementById('resetModal');
            if (resetModal) resetModal.style.display = 'none';
        });
    });
    
    // Кнопка "Забыли пароль?" уже есть в HTML, но добавим обработчик
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (forgotBtn) {
        forgotBtn.onclick = () => showResetModal();
    }
    
    // РЕГИСТРАЦИЯ
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            const email = document.getElementById('regEmail')?.value.trim() || '';
            const nickname = document.getElementById('regNickname')?.value.trim() || '';
            const password = document.getElementById('regPassword')?.value || '';
            const confirm = document.getElementById('regConfirmPassword')?.value || '';
            
            const errorDiv = document.getElementById('registerError');
            
            if (password !== confirm) {
                if (errorDiv) errorDiv.innerText = 'Пароли не совпадают!';
                return;
            }
            
            const result = window.authSystem.register(email, nickname, password);
            if (errorDiv) {
                if (result.success) {
                    errorDiv.style.color = '#6eff3a';
                    errorDiv.innerText = '✅ Успешно! Теперь войдите.';
                    // Переключаем на вход
                    const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
                    if (loginTab) loginTab.click();
                    const loginIdentifier = document.getElementById('loginIdentifier');
                    if (loginIdentifier) loginIdentifier.value = email;
                } else {
                    errorDiv.style.color = '#ff6644';
                    errorDiv.innerText = result.error;
                }
            }
        });
    }
    
    // ВХОД
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const identifier = document.getElementById('loginIdentifier')?.value.trim() || '';
            const password = document.getElementById('loginPassword')?.value || '';
            
            const errorDiv = document.getElementById('loginError');
            
            const result = window.authSystem.login(identifier, password);
            if (result.success) {
                hideAuthModal();
                updateUserPanel();
                updateStatsPanels();
            } else {
                if (errorDiv) errorDiv.innerText = result.error;
            }
        });
    }
    
    // ВЫХОД
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.authSystem.logout();
            updateUserPanel();
            updateStatsPanels();
            if (typeof gameActive !== 'undefined' && gameActive) {
                if (typeof quitToMenu === 'function') quitToMenu();
            }
        });
    }
    
    // Функции восстановления пароля
    function showResetModal() {
        const authModal = document.getElementById('authModal');
        const resetModal = document.getElementById('resetModal');
        if (authModal) authModal.style.display = 'none';
        if (resetModal) resetModal.style.display = 'flex';
        
        const step1 = document.getElementById('resetStep1');
        const step2 = document.getElementById('resetStep2');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        
        const resetError = document.getElementById('resetError');
        const resetStep2Error = document.getElementById('resetStep2Error');
        const resetSuccess = document.getElementById('resetSuccess');
        if (resetError) resetError.innerText = '';
        if (resetStep2Error) resetStep2Error.innerText = '';
        if (resetSuccess) resetSuccess.innerText = '';
    }
    
    const requestResetBtn = document.getElementById('requestResetBtn');
    if (requestResetBtn) {
        requestResetBtn.addEventListener('click', () => {
            const email = document.getElementById('resetEmail')?.value.trim() || '';
            const result = window.authSystem.requestPasswordReset(email);
            
            const resetError = document.getElementById('resetError');
            if (result.success) {
                if (resetError) {
                    resetError.style.color = '#6eff3a';
                    resetError.innerText = result.message;
                    if (result.demoCode) {
                        resetError.innerHTML += `<br>🔑 ДЕМО-КОД: ${result.demoCode}`;
                    }
                }
                const step1 = document.getElementById('resetStep1');
                const step2 = document.getElementById('resetStep2');
                if (step1) step1.style.display = 'none';
                if (step2) step2.style.display = 'block';
            } else {
                if (resetError) {
                    resetError.style.color = '#ff6644';
                    resetError.innerText = result.error;
                }
            }
        });
    }
    
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', () => {
            const email = document.getElementById('resetEmail')?.value.trim() || '';
            const code = document.getElementById('resetCode')?.value.trim() || '';
            const newPassword = document.getElementById('resetNewPassword')?.value || '';
            const confirmPassword = document.getElementById('resetConfirmNewPassword')?.value || '';
            
            const step2Error = document.getElementById('resetStep2Error');
            
            if (newPassword !== confirmPassword) {
                if (step2Error) step2Error.innerText = 'Пароли не совпадают!';
                return;
            }
            
            const result = window.authSystem.resetPassword(email, code, newPassword);
            const resetSuccess = document.getElementById('resetSuccess');
            if (result.success) {
                if (resetSuccess) resetSuccess.innerText = result.message;
                if (step2Error) step2Error.innerText = '';
                setTimeout(() => {
                    const resetModal = document.getElementById('resetModal');
                    const authModal = document.getElementById('authModal');
                    if (resetModal) resetModal.style.display = 'none';
                    if (authModal) authModal.style.display = 'flex';
                    const loginIdentifier = document.getElementById('loginIdentifier');
                    if (loginIdentifier) loginIdentifier.value = email;
                }, 2000);
            } else {
                if (step2Error) step2Error.innerText = result.error;
            }
        });
    }
    
    const backToLogin = document.getElementById('backToLoginFromReset');
    if (backToLogin) {
        backToLogin.addEventListener('click', () => {
            const resetModal = document.getElementById('resetModal');
            const authModal = document.getElementById('authModal');
            if (resetModal) resetModal.style.display = 'none';
            if (authModal) authModal.style.display = 'flex';
        });
    }
    
    const backToStep1 = document.getElementById('backToResetStep1');
    if (backToStep1) {
        backToStep1.addEventListener('click', () => {
            const step1 = document.getElementById('resetStep1');
            const step2 = document.getElementById('resetStep2');
            const resetError = document.getElementById('resetError');
            if (step1) step1.style.display = 'block';
            if (step2) step2.style.display = 'none';
            if (resetError) resetError.innerText = '';
        });
    }
    
    // Если не авторизованы, показываем модальное окно при старте
    if (window.authSystem && !window.authSystem.isLoggedIn()) {
        setTimeout(() => {
            const authModal = document.getElementById('authModal');
            if (authModal) authModal.style.display = 'flex';
        }, 500);
    }
}

// Запускаем инициализацию после загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

// Обновлённые функции для статистики
async function updateLastGameStats() {
    if (!window.authSystem || !window.authSystem.isLoggedIn()) {
        document.getElementById('lastWave').innerText = '-';
        document.getElementById('lastScore').innerText = '-';
        document.getElementById('lastKills').innerText = '-';
        document.getElementById('lastDate').innerText = '-';
        return;
    }
    
    const lastStats = await window.authSystem.getLastGameStats();
    if (lastStats) {
        document.getElementById('lastWave').innerText = lastStats.wave;
        document.getElementById('lastScore').innerText = lastStats.score;
        document.getElementById('lastKills').innerText = lastStats.kills;
        document.getElementById('lastDate').innerText = lastStats.date;
    } else {
        document.getElementById('lastWave').innerText = 'Нет игр';
        document.getElementById('lastScore').innerText = '0';
        document.getElementById('lastKills').innerText = '0';
        document.getElementById('lastDate').innerText = '-';
    }
}

async function updateTopPlayers() {
    if (!window.authSystem) return;
    
    const topPlayers = await window.authSystem.getTopPlayers(20);
    const container = document.getElementById('topPlayersListFull');
    
    if (!container) return;
    
    if (topPlayers.length === 0) {
        container.innerHTML = '<div class="top-row-full">Пока нет игроков :(</div>';
        return;
    }
    
    const currentUserNick = window.authSystem.currentUser?.nickname;
    
    let html = '';
    topPlayers.forEach((player, index) => {
        const place = index + 1;
        let placeClass = '';
        if (place === 1) placeClass = 'top-place-full-1';
        else if (place === 2) placeClass = 'top-place-full-2';
        else if (place === 3) placeClass = 'top-place-full-3';
        
        const isCurrentUser = currentUserNick === player.nickname;
        
        html += `
            <div class="top-row-full ${isCurrentUser ? 'current-user' : ''}">
                <span class="top-place-full ${placeClass}">${place}</span>
                <span class="top-name-full">${escapeHtml(player.nickname)}</span>
                <span class="top-score-full">${player.score}</span>
                <span class="top-wave-full">${player.wave}</span>
                <span class="top-kills-full">${player.kills}</span>
                <span class="top-date-full">${player.date}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function updateStatsPanels() {
    await updateLastGameStats();
    await updateTopPlayers();
}

// Делаем функции глобальными для доступа из auth.js
window.updateStatsPanels = updateStatsPanels;
window.updateTopPlayers = updateTopPlayers;
window.updateLastGameStats = updateLastGameStats;
})();