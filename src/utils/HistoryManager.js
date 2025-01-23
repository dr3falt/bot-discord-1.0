import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import JsonDatabase from './jsonDatabase.js';;
import path from 'path';;

class HistoryManager {
    constructor() {
        this.db = new JsonDatabase(path.join(__dirname, '../database/history.json'));
        this.cache = new Map();
        this.initialize();
    }

    async initialize() {
        try {
            const data = await this.db.read() || {};
            Object.entries(data).forEach(([guildId, guildHistory]) => {
                this.cache.set(guildId, guildHistory);
            });
        } catch (error) {
            console.error('Erro ao inicializar HistoryManager:', error);
        }
    }

    async addEntry(guildId, data) {
        try {
            if (!this.cache.has(guildId)) {
                this.cache.set(guildId, {
                    commands: [],
                    interactions: [],
                    configurations: [],
                    moderation: []
                });
            }

            const guildHistory = this.cache.get(guildId);
            const entry = {
                ...data,
                timestamp: Date.now()
            };

            // Adiciona a entrada na categoria apropriada
            if (guildHistory[data.category]) {
                guildHistory[data.category].unshift(entry);
                
                // Mantém apenas os últimos 100 registros por categoria
                if (guildHistory[data.category].length > 100) {
                    guildHistory[data.category] = guildHistory[data.category].slice(0, 100);
                }
            }

            await this.save();
            return entry;
        } catch (error) {
            console.error('Erro ao adicionar entrada no histórico:', error);
            throw error;
        }
    }

    async getGuildHistory(guildId, category = null, limit = 50) {
        const guildHistory = this.cache.get(guildId);
        if (!guildHistory) return [];

        if (category && guildHistory[category]) {
            return guildHistory[category].slice(0, limit);
        }

        // Se não especificar categoria, retorna um objeto com todas as categorias
        const history = {};
        for (const [cat, entries] of Object.entries(guildHistory)) {
            history[cat] = entries.slice(0, limit);
        }
        return history;
    }

    // Métodos específicos para diferentes tipos de eventos
    async logCommand(guildId, userId, commandName, options = {}) {
        return this.addEntry(guildId, {
            category: 'commands',
            type: 'command_used',
            userId,
            commandName,
            options,
        });
    }

    async logInteraction(guildId, userId, type, data = {}) {
        return this.addEntry(guildId, {
            category: 'interactions',
            type,
            userId,
            ...data
        });
    }

    async logConfig(guildId, userId, configType, changes = {}) {
        return this.addEntry(guildId, {
            category: 'configurations',
            type: configType,
            userId,
            changes
        });
    }

    async logModeration(guildId, userId, actionType, targetId, reason = '') {
        return this.addEntry(guildId, {
            category: 'moderation',
            type: actionType,
            userId,
            targetId,
            reason
        });
    }

    async save() {
        try {
            const data = {};
            for (const [guildId, guildHistory] of this.cache) {
                data[guildId] = guildHistory;
            }
            await this.db.write(data);
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
            throw error;
        }
    }
}

export default new HistoryManager();
