import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { PermissionsBitField } from 'discord.js';
import pkg from 'wio.db';
const { JsonDB } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new JsonDB({
    databasePath: path.join(__dirname, '../database/permissions.json')
});

class PermissionHandler {
    constructor() {
        this.permLevels = {
            OWNER: 4,
            ADMIN: 3,
            MOD: 2,
            HELPER: 1,
            MEMBER: 0
        };
    }

    async initialize() {
        const data = await db.get('permissions');
        if (!data) {
            await db.set('permissions', {});
        }
    }

    async getPermissionLevel(userId, guildId) {
        const data = await db.get('permissions');
        const guildPerms = data[guildId] || {};

        // Verifica se é owner do bot
        if (process.env.OWNER_ID === userId) return this.permLevels.OWNER;

        // Verifica permissões do usuário
        const userPerms = guildPerms.users?.[userId];
        if (userPerms) return this.permLevels[userPerms];

        // Verifica permissões dos cargos do usuário
        const member = await this.getMember(userId, guildId);
        if (!member) return this.permLevels.MEMBER;

        const rolePerms = guildPerms.roles || {};
        let highestLevel = this.permLevels.MEMBER;

        for (const role of member.roles.cache.values()) {
            const roleLevel = rolePerms[role.id];
            if (roleLevel && this.permLevels[roleLevel] > highestLevel) {
                highestLevel = this.permLevels[roleLevel];
            }
        }

        return highestLevel;
    }

    async setPermission(guildId, targetType, targetId, level) {
        if (!this.permLevels[level]) throw new Error('Nível de permissão inválido');

        const data = await db.get('permissions');
        if (!data[guildId]) data[guildId] = { users: {}, roles: {} };

        if (targetType === 'user') {
            data[guildId].users[targetId] = level;
        } else if (targetType === 'role') {
            data[guildId].roles[targetId] = level;
        } else {
            throw new Error('Tipo de alvo inválido');
        }

        await db.set('permissions', data);
    }

    async removePermission(guildId, targetType, targetId) {
        const data = await db.get('permissions');
        if (!data[guildId]) return;

        if (targetType === 'user') {
            delete data[guildId].users[targetId];
        } else if (targetType === 'role') {
            delete data[guildId].roles[targetId];
        } else {
            throw new Error('Tipo de alvo inválido');
        }

        await db.set('permissions', data);
    }

    async checkPermission(userId, guildId, requiredLevel) {
        const userLevel = await this.getPermissionLevel(userId, guildId);
        return userLevel >= this.permLevels[requiredLevel];
    }

    async getMember(userId, guildId) {
        const guild = await this.client?.guilds.fetch(guildId);
        if (!guild) return null;
        
        try {
            return await guild.members.fetch(userId);
        } catch {
            return null;
        }
    }

    async listPermissions(guildId) {
        const data = await db.get('permissions');
        return data[guildId] || { users: {}, roles: {} };
    }
}

export default new PermissionHandler();
