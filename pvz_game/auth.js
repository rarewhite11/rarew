// auth.js - обновлённая версия с сервером

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.loadSession();
        this.apiUrl = 'http://localhost:3000/api';
    }
    
    async register(email, nickname, password) {
        if (!email || !nickname || !password) {
            return { success: false, error: 'Заполните все поля!' };
        }
        
        if (nickname.length < 3 || nickname.length > 16) {
            return { success: false, error: 'Ник должен быть от 3 до 16 символов!' };
        }
        
        if (password.length < 4) {
            return { success: false, error: 'Пароль должен быть не менее 4 символов!' };
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, nickname, password })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, error: 'Ошибка соединения с сервером!' };
        }
    }
    
    async login(identifier, password) {
        if (!identifier || !password) {
            return { success: false, error: 'Заполните все поля!' };
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.saveSession();
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка входа:', error);
            return { success: false, error: 'Ошибка соединения с сервером!' };
        }
    }
    
    async saveGameStats(wave, score, kills) {
        if (!this.currentUser) {
            console.log('Нет текущего пользователя');
            return false;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/save-stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    wave: wave,
                    score: score,
                    kills: kills
                })
            });
            
            const data = await response.json();
            console.log(data.isNewRecord ? 'НОВЫЙ РЕКОРД!' : 'Рекорд не побит');
            
            if (typeof window.updateStatsPanels === 'function') {
                setTimeout(() => window.updateStatsPanels(), 100);
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            return false;
        }
    }
    
    async getLastGameStats() {
        if (!this.currentUser) return null;
        
        try {
            const response = await fetch(`${this.apiUrl}/get-stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUser.id })
            });
            
            const data = await response.json();
            
            if (data.bestStat) {
                return {
                    wave: data.bestStat.wave,
                    score: data.bestStat.score,
                    kills: data.bestStat.kills,
                    date: new Date(data.bestStat.date).toLocaleString('ru-RU')
                };
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            return null;
        }
    }
    
    async getTopPlayers(limit = 20) {
        try {
            const response = await fetch(`${this.apiUrl}/top-players`);
            const data = await response.json();
            
            if (data.success) {
                return data.topPlayers.slice(0, limit);
            }
            return [];
        } catch (error) {
            console.error('Ошибка получения топа:', error);
            return [];
        }
    }
    
    async requestPasswordReset(email) {
        try {
            const response = await fetch(`${this.apiUrl}/request-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка:', error);
            return { success: false, error: 'Ошибка соединения!' };
        }
    }
    
    async resetPassword(email, code, newPassword) {
        if (newPassword.length < 4) {
            return { success: false, error: 'Пароль должен быть не менее 4 символов!' };
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка:', error);
            return { success: false, error: 'Ошибка соединения!' };
        }
    }
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('pvz_current_user');
    }
    
    saveSession() {
        if (this.currentUser) {
            localStorage.setItem('pvz_current_user', JSON.stringify(this.currentUser));
        }
    }
    
    loadSession() {
        const saved = localStorage.getItem('pvz_current_user');
        if (saved) {
            this.currentUser = JSON.parse(saved);
        }
    }
    
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

window.authSystem = new AuthSystem();