import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import JsonDatabase from '../utils/jsonDatabase.js';
import { EmbedBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class LogHandler {
    constructor() {
        this.db = new JsonDatabase(path.join(__dirname, '../database/logs.json'));
        this.logChannels = new Map();
        this.logTypes = {
            MOD: '#FF0000',      // Vermelho para ações de moderação
            ADMIN: '#FFA500',    // Laranja para ações administrativas
            MEMBER: '#00FF00',   // Verde para ações de membros
            SERVER: '#0000FF',   // Azul para eventos do servidor
            VOICE: '#800080',    // Roxo para eventos de voz
            MESSAGE: '#FFD700'   // Dourado para eventos de mensagem
        };
        this.initialize().catch(console.error);
    }

    async initialize() {
        try {
            const data = await this.db.read() || {};
            
            // Inicializa o banco de dados se estiver vazio
            if (Object.keys(data).length === 0) {
                await this.db.write({});
                console.log('✅ Banco de dados de logs inicializado');
            }

            // Carregar canais de log
            for (const [guildId, channels] of Object.entries(data)) {
                this.logChannels.set(guildId, channels);
            }
            
            console.log(`✅ Carregados ${this.logChannels.size} configurações de logs`);
        } catch (error) {
            console.error('❌ Erro ao inicializar logs:', error);
        }
    }

    async log(guildId, type, options) {
        if (!guildId || !type || !options) {
            console.error('❌ Parâmetros inválidos para log:', { guildId, type, options });
            return;
        }

        const channels = this.logChannels.get(guildId);
        if (!channels?.[type.toLowerCase()]) {
            return;
        }

        try {
            const channel = await this.getChannel(channels[type.toLowerCase()]);
            if (!channel) {
                console.error(`❌ Canal de log não encontrado para ${guildId}/${type}`);
                return;
            }

            const embed = this.createEmbed(type, options);
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`❌ Erro ao enviar log: ${error}`);
        }
    }

    createEmbed(type, options) {
        const {
            title,
            description,
            fields = [],
            author,
            footer,
            timestamp = true
        } = options;

        const embed = new EmbedBuilder()
            .setColor(this.logTypes[type] || '#808080')
            .setTitle(title)
            .setDescription(description);

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        if (author) {
            embed.setAuthor(author);
        }

        if (footer) {
            embed.setFooter(footer);
        }

        if (timestamp) {
            embed.setTimestamp();
        }

        return embed;
    }

    async setLogChannel(guildId, type, channelId) {
        let channels = this.logChannels.get(guildId) || {};
        channels[type.toLowerCase()] = channelId;
        this.logChannels.set(guildId, channels);

        const data = await this.db.read();
        data[guildId] = channels;
        await this.db.write(data);
    }

    async removeLogChannel(guildId, type) {
        let channels = this.logChannels.get(guildId);
        if (!channels) return;

        delete channels[type.toLowerCase()];
        if (Object.keys(channels).length === 0) {
            this.logChannels.delete(guildId);
            const data = await this.db.read();
            delete data[guildId];
            await this.db.write(data);
        } else {
            this.logChannels.set(guildId, channels);
            const data = await this.db.read();
            data[guildId] = channels;
            await this.db.write(data);
        }
    }

    async getLogChannels(guildId) {
        return this.logChannels.get(guildId) || {};
    }

    async getChannel(channelId) {
        try {
            return await this.client?.channels.fetch(channelId);
        } catch {
            return null;
        }
    }

    // Métodos de log específicos
    async logModeração(guildId, options) {
        return this.log(guildId, 'MOD', options);
    }

    async logAdmin(guildId, options) {
        return this.log(guildId, 'ADMIN', options);
    }

    async logMembro(guildId, options) {
        return this.log(guildId, 'MEMBER', options);
    }

    async logServidor(guildId, options) {
        return this.log(guildId, 'SERVER', options);
    }

    async logVoz(guildId, options) {
        return this.log(guildId, 'VOICE', options);
    }

    async logMensagem(guildId, options) {
        return this.log(guildId, 'MESSAGE', options);
    }
}

export default new LogHandler();
