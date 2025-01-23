import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pkg from 'wio.db';
const { JsonDB } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new JsonDB({
    databasePath: path.join(__dirname, '../database/antilink.json')
});

class AntiLinkHandler {
    constructor() {
        this.settings = new Map();
        this.urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    }

    async initialize() {
        const data = await db.read();
        if (!data) {
            await db.write({});
        }
        
        // Carregar configurações
        for (const [guildId, settings] of Object.entries(data)) {
            this.settings.set(guildId, settings);
        }
    }

    async handleMessage(message) {
        if (message.author.bot) return false;

        const settings = this.settings.get(message.guild.id);
        if (!settings?.enabled) return false;

        // Verifica se a mensagem contém links
        const hasLinks = this.urlRegex.test(message.content);
        if (!hasLinks) return false;

        // Verifica permissões
        if (await this.canPostLinks(message)) return false;

        // Deleta mensagem e avisa
        try {
            await message.delete();
            const warning = await message.channel.send(
                `⚠️ ${message.author}, links não são permitidos neste canal!`
            );
            setTimeout(() => warning.delete(), 5000);
            return true;
        } catch (error) {
            console.error(`Erro ao deletar mensagem com link: ${error}`);
            return false;
        }
    }

    async canPostLinks(message) {
        const settings = this.settings.get(message.guild.id);
        if (!settings) return true;

        // Verifica whitelist de canais
        if (settings.whitelistedChannels?.includes(message.channel.id)) {
            return true;
        }

        // Verifica whitelist de usuários
        if (settings.whitelistedUsers?.includes(message.author.id)) {
            return true;
        }

        // Verifica whitelist de cargos
        return message.member.roles.cache.some(role => 
            settings.whitelistedRoles?.includes(role.id)
        );
    }

    async updateSettings(guildId, settings) {
        // Atualiza cache e database
        this.settings.set(guildId, settings);
        
        const data = await db.read();
        data[guildId] = settings;
        await db.write(data);
    }

    async getSettings(guildId) {
        return this.settings.get(guildId) || {
            enabled: false,
            whitelistedChannels: [],
            whitelistedUsers: [],
            whitelistedRoles: [],
            logChannel: null
        };
    }

    async addToWhitelist(guildId, type, id) {
        const settings = await this.getSettings(guildId);
        
        switch (type) {
            case 'channel':
                if (!settings.whitelistedChannels) settings.whitelistedChannels = [];
                if (!settings.whitelistedChannels.includes(id)) {
                    settings.whitelistedChannels.push(id);
                }
                break;
            case 'user':
                if (!settings.whitelistedUsers) settings.whitelistedUsers = [];
                if (!settings.whitelistedUsers.includes(id)) {
                    settings.whitelistedUsers.push(id);
                }
                break;
            case 'role':
                if (!settings.whitelistedRoles) settings.whitelistedRoles = [];
                if (!settings.whitelistedRoles.includes(id)) {
                    settings.whitelistedRoles.push(id);
                }
                break;
            default:
                throw new Error('Tipo de whitelist inválido');
        }

        await this.updateSettings(guildId, settings);
    }

    async removeFromWhitelist(guildId, type, id) {
        const settings = await this.getSettings(guildId);
        
        switch (type) {
            case 'channel':
                settings.whitelistedChannels = settings.whitelistedChannels?.filter(
                    channelId => channelId !== id
                );
                break;
            case 'user':
                settings.whitelistedUsers = settings.whitelistedUsers?.filter(
                    userId => userId !== id
                );
                break;
            case 'role':
                settings.whitelistedRoles = settings.whitelistedRoles?.filter(
                    roleId => roleId !== id
                );
                break;
            default:
                throw new Error('Tipo de whitelist inválido');
        }

        await this.updateSettings(guildId, settings);
    }
}

export default new AntiLinkHandler();
