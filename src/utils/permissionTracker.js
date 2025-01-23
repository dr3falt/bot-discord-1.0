import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PermissionTracker {
    constructor() {
        this.permissionsPath = path.join(__dirname, '../data/permissionChanges.json');
        this.changes = {};
        this.loadChanges();
    }

    async loadChanges() {
        try {
            const data = await fs.readFile(this.permissionsPath, 'utf8');
            this.changes = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Se o arquivo não existir, cria um novo
                await this.saveChanges();
            } else {
                console.error('Erro ao carregar mudanças de permissões:', error);
            }
        }
    }

    async saveChanges() {
        try {
            // Garante que o diretório existe
            await fs.mkdir(path.dirname(this.permissionsPath), { recursive: true });
            await fs.writeFile(this.permissionsPath, JSON.stringify(this.changes, null, 2));
        } catch (error) {
            console.error('Erro ao salvar mudanças de permissões:', error);
        }
    }

    async trackChange(guildId, userId, change) {
        if (!this.changes[guildId]) {
            this.changes[guildId] = {};
        }
        if (!this.changes[guildId][userId]) {
            this.changes[guildId][userId] = [];
        }

        this.changes[guildId][userId].push({
            ...change,
            timestamp: new Date().toISOString()
        });

        // Limita o histórico a 100 mudanças por usuário
        if (this.changes[guildId][userId].length > 100) {
            this.changes[guildId][userId].shift();
        }

        await this.saveChanges();
    }

    async getChanges(guildId, userId, limit = 10) {
        return (this.changes[guildId]?.[userId] || []).slice(-limit);
    }

    async clearChanges(guildId, userId) {
        if (this.changes[guildId] && this.changes[guildId][userId]) {
            this.changes[guildId][userId] = [];
            await this.saveChanges();
            return true;
        }
        return false;
    }

    async getChangeCount(guildId, userId) {
        return this.changes[guildId]?.[userId]?.length || 0;
    }
}

export default new PermissionTracker();
