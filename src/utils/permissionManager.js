import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { PermissionsBitField } from 'discord.js';
import JsonDatabase from './jsonDatabase.js';
import NodeCache from 'node-cache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PermissionManager {
    constructor() {
        this.db = new JsonDatabase(path.join(__dirname, '../database/permissions.json'));
        this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
    }

    async initialize() {
        try {
            const data = await this.db.read() || {};
            if (!data.users) data.users = {};
            if (!data.roles) data.roles = {};
            await this.db.write(data);
            return true;
        } catch (error) {
            console.error('Erro ao inicializar sistema de permissões:', error);
            return false;
        }
    }

    async getUserPermissions(userId) {
        const cacheKey = `user_${userId}`;
        let perms = this.cache.get(cacheKey);
        
        if (!perms) {
            const data = await this.db.read();
            perms = data.users[userId] || { commands: [] };
            this.cache.set(cacheKey, perms);
        }
        
        return perms;
    }

    async getRolePermissions(roleId) {
        const cacheKey = `role_${roleId}`;
        let perms = this.cache.get(cacheKey);
        
        if (!perms) {
            const data = await this.db.read();
            perms = data.roles[roleId] || { commands: [] };
            this.cache.set(cacheKey, perms);
        }
        
        return perms;
    }

    async setUserPermissions(userId, commands) {
        const data = await this.db.read();
        if (!data.users[userId]) {
            data.users[userId] = { commands: [] };
        }
        data.users[userId].commands = commands;
        await this.db.write(data);
        this.cache.del(`user_${userId}`);
    }

    async setRolePermissions(roleId, commands) {
        const data = await this.db.read();
        if (!data.roles[roleId]) {
            data.roles[roleId] = { commands: [] };
        }
        data.roles[roleId].commands = commands;
        await this.db.write(data);
        this.cache.del(`role_${roleId}`);
    }

    async removeUserPermissions(userId, commands) {
        const data = await this.db.read();
        if (data.users[userId]) {
            data.users[userId].commands = data.users[userId].commands.filter(cmd => !commands.includes(cmd));
            await this.db.write(data);
            this.cache.del(`user_${userId}`);
        }
    }

    async removeRolePermissions(roleId, commands) {
        const data = await this.db.read();
        if (data.roles[roleId]) {
            data.roles[roleId].commands = data.roles[roleId].commands.filter(cmd => !commands.includes(cmd));
            await this.db.write(data);
            this.cache.del(`role_${roleId}`);
        }
    }

    async hasPermission(member, commandName) {
        // Dono do servidor sempre tem permissão
        if (member.id === member.guild.ownerId) return true;

        // Administradores sempre têm permissão
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

        // Verifica permissões do usuário
        const userPerms = await this.getUserPermissions(member.id);
        if (userPerms.commands.includes('*') || userPerms.commands.includes(commandName)) {
            return true;
        }

        // Verifica permissões dos cargos do usuário
        for (const role of member.roles.cache.values()) {
            const rolePerms = await this.getRolePermissions(role.id);
            if (rolePerms.commands.includes('*') || rolePerms.commands.includes(commandName)) {
                return true;
            }
        }

        return false;
    }

    clearCache() {
        this.cache.flushAll();
    }
}

export { PermissionManager };
export default new PermissionManager();
