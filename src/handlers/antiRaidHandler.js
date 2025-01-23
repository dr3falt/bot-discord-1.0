import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pkg from 'wio.db';
const { JsonDB } = pkg;
import { Collection } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new JsonDB({
    databasePath: path.join(__dirname, '../database/antiraid.json')
});

class AntiRaidHandler {
    constructor() {
        this.joinedUsers = new Collection();
        this.settings = new Collection();
        this.actions = ['kick', 'ban', 'timeout', 'verify'];
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

    async handleJoin(member) {
        const settings = this.settings.get(member.guild.id);
        if (!settings?.enabled) return;

        // Verifica whitelist
        if (await this.isWhitelisted(member)) return;

        // Registra entrada
        const now = Date.now();
        const recentJoins = this.joinedUsers.get(member.guild.id) || [];
        recentJoins.push({
            userId: member.id,
            timestamp: now
        });

        // Remove entradas antigas
        const timeWindow = settings.timeWindow || 10000; // 10 segundos padrão
        const validJoins = recentJoins.filter(join => now - join.timestamp < timeWindow);
        this.joinedUsers.set(member.guild.id, validJoins);

        // Verifica se passou do limite
        const joinLimit = settings.joinLimit || 5;
        if (validJoins.length >= joinLimit) {
            await this.takeAction(member, settings.action || 'kick');
            return true;
        }

        return false;
    }

    async isWhitelisted(member) {
        const settings = this.settings.get(member.guild.id);
        if (!settings?.whitelist) return false;

        // Verifica roles na whitelist
        return member.roles.cache.some(role => 
            settings.whitelist.includes(role.id)
        );
    }

    async takeAction(member, action) {
        const reason = 'Detectado em raid';

        try {
            switch (action) {
                case 'kick':
                    await member.kick(reason);
                    break;
                case 'ban':
                    await member.ban({ reason });
                    break;
                case 'timeout':
                    await member.timeout(3600000, reason); // 1 hora
                    break;
                case 'verify':
                    // Adiciona cargo de verificação
                    const settings = this.settings.get(member.guild.id);
                    if (settings.verifyRole) {
                        await member.roles.add(settings.verifyRole);
                    }
                    break;
            }
        } catch (error) {
            console.error(`Erro ao executar ação anti-raid: ${error}`);
        }
    }

    async updateSettings(guildId, settings) {
        // Valida configurações
        if (settings.action && !this.actions.includes(settings.action)) {
            throw new Error('Ação inválida');
        }

        // Atualiza cache e database
        this.settings.set(guildId, settings);
        
        const data = await db.read();
        data[guildId] = settings;
        await db.write(data);
    }

    async getSettings(guildId) {
        return this.settings.get(guildId) || {
            enabled: false,
            joinLimit: 5,
            timeWindow: 10000,
            action: 'kick',
            whitelist: [],
            verifyRole: null
        };
    }
}

export default new AntiRaidHandler();
