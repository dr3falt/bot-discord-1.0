import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WarningManager {
    constructor() {
        this.warningsPath = path.join(__dirname, '../data/warnings.json');
        this.warnings = {};
        this.loadWarnings();
    }

    async loadWarnings() {
        try {
            const data = await fs.readFile(this.warningsPath, 'utf8');
            this.warnings = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Se o arquivo não existir, cria um novo
                await this.saveWarnings();
            } else {
                console.error('Erro ao carregar warnings:', error);
            }
        }
    }

    async saveWarnings() {
        try {
            // Garante que o diretório existe
            await fs.mkdir(path.dirname(this.warningsPath), { recursive: true });
            await fs.writeFile(this.warningsPath, JSON.stringify(this.warnings, null, 2));
        } catch (error) {
            console.error('Erro ao salvar warnings:', error);
        }
    }

    async addWarning(guildId, userId, warning) {
        if (!this.warnings[guildId]) {
            this.warnings[guildId] = {};
        }
        if (!this.warnings[guildId][userId]) {
            this.warnings[guildId][userId] = [];
        }
        this.warnings[guildId][userId].push(warning);
        await this.saveWarnings();
    }

    async removeWarning(guildId, userId) {
        if (!this.warnings[guildId]?.[userId]?.length) {
            return false;
        }
        this.warnings[guildId][userId].pop();
        await this.saveWarnings();
        return true;
    }

    async clearWarnings(guildId, userId) {
        if (this.warnings[guildId] && this.warnings[guildId][userId]) {
            this.warnings[guildId][userId] = [];
            await this.saveWarnings();
            return true;
        }
        return false;
    }

    async getWarnings(guildId, userId) {
        return this.warnings[guildId]?.[userId] || [];
    }

    async getWarningCount(guildId, userId) {
        return this.warnings[guildId]?.[userId]?.length || 0;
    }
}

export default new WarningManager();
