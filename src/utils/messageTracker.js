import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MessageTracker {
    constructor() {
        this.messagesPath = path.join(__dirname, '../data/deletedMessages.json');
        this.messages = {};
        this.loadMessages();
    }

    async loadMessages() {
        try {
            const data = await fs.readFile(this.messagesPath, 'utf8');
            this.messages = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Se o arquivo não existir, cria um novo
                await this.saveMessages();
            } else {
                console.error('Erro ao carregar mensagens deletadas:', error);
            }
        }
    }

    async saveMessages() {
        try {
            // Garante que o diretório existe
            await fs.mkdir(path.dirname(this.messagesPath), { recursive: true });
            await fs.writeFile(this.messagesPath, JSON.stringify(this.messages, null, 2));
        } catch (error) {
            console.error('Erro ao salvar mensagens deletadas:', error);
        }
    }

    async trackDeletedMessage(guildId, userId, message) {
        if (!this.messages[guildId]) {
            this.messages[guildId] = {};
        }
        if (!this.messages[guildId][userId]) {
            this.messages[guildId][userId] = [];
        }

        const deletedMessage = {
            content: message.content,
            channelId: message.channelId,
            timestamp: new Date().toISOString(),
            attachments: message.attachments.map(att => ({
                name: att.name,
                url: att.url,
                size: att.size
            }))
        };

        this.messages[guildId][userId].push(deletedMessage);

        // Limita o histórico a 100 mensagens por usuário
        if (this.messages[guildId][userId].length > 100) {
            this.messages[guildId][userId].shift();
        }

        await this.saveMessages();
    }

    async getDeletedMessages(guildId, userId, limit = 10) {
        return (this.messages[guildId]?.[userId] || []).slice(-limit);
    }

    async clearDeletedMessages(guildId, userId) {
        if (this.messages[guildId] && this.messages[guildId][userId]) {
            this.messages[guildId][userId] = [];
            await this.saveMessages();
            return true;
        }
        return false;
    }

    async getDeletedMessageCount(guildId, userId) {
        return this.messages[guildId]?.[userId]?.length || 0;
    }
}

export default new MessageTracker();
