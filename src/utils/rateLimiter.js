import NodeCache from 'node-cache';
import { logWarn } from './logger.js';

class RateLimiter {
    constructor() {
        // Cache para armazenar os limites
        this.cache = new NodeCache({
            stdTTL: 60, // Tempo padrão de expiração em segundos
            checkperiod: 120, // Período de verificação de itens expirados
            useClones: false
        });

        // Configurações padrão de limites
        this.defaultLimits = {
            commands: { points: 5, duration: 60 }, // 5 comandos por minuto
            buttons: { points: 10, duration: 60 }, // 10 cliques por minuto
            modals: { points: 3, duration: 60 }, // 3 modais por minuto
            menus: { points: 5, duration: 60 } // 5 seleções por minuto
        };
    }

    /**
     * Verifica e aplica o rate limit
     * @param {string} userId - ID do usuário
     * @param {string} type - Tipo de ação (commands, buttons, modals, menus)
     * @returns {boolean} - true se permitido, false se limitado
     */
    checkLimit(userId, type) {
        const key = `${userId}-${type}`;
        const limit = this.defaultLimits[type] || this.defaultLimits.commands;
        
        let userLimit = this.cache.get(key);
        
        if (!userLimit) {
            userLimit = {
                points: limit.points,
                lastReset: Date.now()
            };
        }

        // Verifica se precisa resetar os pontos
        const now = Date.now();
        const timePassed = (now - userLimit.lastReset) / 1000;
        
        if (timePassed >= limit.duration) {
            userLimit = {
                points: limit.points,
                lastReset: now
            };
        }

        // Verifica se ainda tem pontos disponíveis
        if (userLimit.points <= 0) {
            logWarn(`Rate limit excedido para usuário ${userId} em ${type}`);
            return false;
        }

        // Decrementa um ponto e atualiza o cache
        userLimit.points--;
        this.cache.set(key, userLimit);
        
        return true;
    }

    /**
     * Reseta os limites de um usuário
     * @param {string} userId - ID do usuário
     * @param {string} type - Tipo de ação (opcional, se não fornecido reseta todos)
     */
    resetLimits(userId, type = null) {
        if (type) {
            const key = `${userId}-${type}`;
            this.cache.del(key);
        } else {
            const userKeys = this.cache.keys().filter(key => key.startsWith(userId));
            userKeys.forEach(key => this.cache.del(key));
        }
    }

    /**
     * Adiciona pontos extras para um usuário
     * @param {string} userId - ID do usuário
     * @param {string} type - Tipo de ação
     * @param {number} points - Quantidade de pontos a adicionar
     */
    addPoints(userId, type, points) {
        const key = `${userId}-${type}`;
        let userLimit = this.cache.get(key);
        
        if (userLimit) {
            userLimit.points += points;
            this.cache.set(key, userLimit);
        }
    }
}

// Exporta a classe RateLimiter
export { RateLimiter };
