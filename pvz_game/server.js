const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = 'database.json';

// Инициализация базы данных
function initDB() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            users: [],
            stats: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

initDB();

// РЕГИСТРАЦИЯ с проверкой уникальности email
app.post('/api/register', (req, res) => {
    const { email, nickname, password } = req.body;
    
    if (!email || !nickname || !password) {
        return res.status(400).json({ success: false, error: 'Заполните все поля!' });
    }
    
    const db = initDB();
    
    // Проверка уникальности email
    const emailExists = db.users.some(user => user.email === email);
    if (emailExists) {
        return res.status(400).json({ success: false, error: 'Этот email уже зарегистрирован!' });
    }
    
    // Проверка уникальности ника
    const nicknameExists = db.users.some(user => user.nickname === nickname);
    if (nicknameExists) {
        return res.status(400).json({ success: false, error: 'Этот ник уже занят!' });
    }
    
    // Создаём пользователя
    const newUser = {
        id: Date.now(),
        email: email,
        nickname: nickname,
        password: password, // В реальном проекте хешируйте!
        createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    saveDB(db);
    
    res.json({ success: true, user: { id: newUser.id, email: newUser.email, nickname: newUser.nickname } });
});

// ВХОД
app.post('/api/login', (req, res) => {
    const { identifier, password } = req.body;
    const db = initDB();
    
    const user = db.users.find(u => 
        (u.email === identifier || u.nickname === identifier) && 
        u.password === password
    );
    
    if (!user) {
        return res.status(400).json({ success: false, error: 'Неверный email/ник или пароль!' });
    }
    
    res.json({ 
        success: true, 
        user: { id: user.id, email: user.email, nickname: user.nickname } 
    });
});

// ПОЛУЧИТЬ СТАТИСТИКУ пользователя
app.post('/api/get-stats', (req, res) => {
    const { userId } = req.body;
    const db = initDB();
    
    const userStats = db.stats.filter(s => s.userId === userId);
    const bestStat = userStats.sort((a, b) => b.score - a.score)[0] || null;
    
    res.json({ success: true, stats: userStats, bestStat: bestStat });
});

// СОХРАНИТЬ РЕЗУЛЬТАТ
app.post('/api/save-stats', (req, res) => {
    const { userId, wave, score, kills } = req.body;
    const db = initDB();
    
    // Проверяем, есть ли уже рекорд
    const existingStats = db.stats.filter(s => s.userId === userId);
    let bestScore = 0;
    existingStats.forEach(s => {
        if (s.score > bestScore) bestScore = s.score;
    });
    
    if (score > bestScore) {
        // Удаляем старые записи этого пользователя и сохраняем новый рекорд
        const filteredStats = db.stats.filter(s => s.userId !== userId);
        const newStat = {
            userId: userId,
            wave: wave,
            score: score,
            kills: kills,
            date: new Date().toISOString()
        };
        filteredStats.push(newStat);
        db.stats = filteredStats;
        saveDB(db);
        res.json({ success: true, isNewRecord: true });
    } else {
        res.json({ success: true, isNewRecord: false, bestScore: bestScore });
    }
});

// ПОЛУЧИТЬ ТОП ИГРОКОВ
app.get('/api/top-players', (req, res) => {
    const db = initDB();
    
    // Создаём карту пользователей
    const userMap = {};
    db.users.forEach(user => {
        userMap[user.id] = user.nickname;
    });
    
    // Берём лучший результат каждого пользователя
    const bestStats = {};
    db.stats.forEach(stat => {
        if (!bestStats[stat.userId] || stat.score > bestStats[stat.userId].score) {
            bestStats[stat.userId] = {
                userId: stat.userId,
                score: stat.score,
                wave: stat.wave,
                kills: stat.kills,
                date: stat.date
            };
        }
    });
    
    // Сортируем и добавляем ники
    let topList = Object.values(bestStats);
    topList.sort((a, b) => b.score - a.score);
    topList = topList.slice(0, 20);
    
    const result = topList.map(stat => ({
        nickname: userMap[stat.userId] || 'Неизвестный',
        score: stat.score,
        wave: stat.wave,
        kills: stat.kills,
        date: new Date(stat.date).toLocaleDateString('ru-RU')
    }));
    
    res.json({ success: true, topPlayers: result });
});

// ЗАПРОС НА СБРОС ПАРОЛЯ
app.post('/api/request-reset', (req, res) => {
    const { email } = req.body;
    const db = initDB();
    
    const user = db.users.find(u => u.email === email);
    if (!user) {
        return res.status(400).json({ success: false, error: 'Пользователь с таким email не найден!' });
    }
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Сохраняем код в отдельный файл (временный)
    let resets = {};
    if (fs.existsSync('resets.json')) {
        resets = JSON.parse(fs.readFileSync('resets.json', 'utf8'));
    }
    resets[email] = {
        code: resetCode,
        expiresAt: Date.now() + 3600000
    };
    fs.writeFileSync('resets.json', JSON.stringify(resets, null, 2));
    
    console.log(`🔑 Код для ${email}: ${resetCode}`);
    
    res.json({ 
        success: true, 
        message: `Код отправлен на ${email}`,
        demoCode: resetCode
    });
});

// СБРОС ПАРОЛЯ
app.post('/api/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body;
    
    if (!fs.existsSync('resets.json')) {
        return res.status(400).json({ success: false, error: 'Нет активных запросов на сброс!' });
    }
    
    const resets = JSON.parse(fs.readFileSync('resets.json', 'utf8'));
    const resetRequest = resets[email];
    
    if (!resetRequest || resetRequest.code !== code) {
        return res.status(400).json({ success: false, error: 'Неверный код!' });
    }
    
    if (Date.now() > resetRequest.expiresAt) {
        delete resets[email];
        fs.writeFileSync('resets.json', JSON.stringify(resets, null, 2));
        return res.status(400).json({ success: false, error: 'Код истёк!' });
    }
    
    // Обновляем пароль
    const db = initDB();
    const userIndex = db.users.findIndex(u => u.email === email);
    if (userIndex === -1) {
        return res.status(400).json({ success: false, error: 'Пользователь не найден!' });
    }
    
    db.users[userIndex].password = newPassword;
    saveDB(db);
    
    // Удаляем код
    delete resets[email];
    fs.writeFileSync('resets.json', JSON.stringify(resets, null, 2));
    
    res.json({ success: true, message: 'Пароль успешно изменён!' });
});

app.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
    console.log('Данные сохраняются в database.json');
});