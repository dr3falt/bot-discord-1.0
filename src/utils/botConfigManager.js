import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import JsonDatabase from './jsonDatabase.js';;
import path from 'path';;
import config from '../config/botConfig.js';;

class BotConfigManager {
    constructor() {
        // Cache para configurações
        this.cache = new Map();
        this.db = new JsonDatabase(path.join(__dirname, '../database/config.json'));
    }

    /**
     * Obtém ou cria a configuração de um servidor
     */
    async getGuildConfig(guildId) {
        const cacheKey = `guild_config:${guildId}`;
        let guildConfig = this.cache.get(cacheKey);

        if (!guildConfig) {
            const config = await this.db.read();
            guildConfig = config[guildId] || this.createDefaultConfig(guildId);
            this.cache.set(cacheKey, guildConfig);
        }

        return guildConfig;
    }

    /**
     * Atualiza o avatar do bot
     */
    async updateAvatar(guildId, userId, newAvatarUrl) {
        const guildConfig = await this.getGuildConfig(guildId);
        const oldAvatar = guildConfig.avatar;

        guildConfig.avatar = newAvatarUrl;
        await this.addLog(guildId, 'avatar', userId, oldAvatar, newAvatarUrl);
        await this.updateGuildConfig(guildId, guildConfig);

        this.cache.delete(`guild_config:${guildId}`);
        return guildConfig;
    }

    /**
     * Atualiza o nome do bot
     */
    async updateName(guildId, userId, newName) {
        const guildConfig = await this.getGuildConfig(guildId);
        const oldName = guildConfig.name;

        guildConfig.name = newName;
        await this.addLog(guildId, 'name', userId, oldName, newName);
        await this.updateGuildConfig(guildId, guildConfig);

        this.cache.delete(`guild_config:${guildId}`);
        return guildConfig;
    }

    /**
     * Adiciona um emoji
     */
    async addEmoji(guildId, userId, emojiData) {
        const guildConfig = await this.getGuildConfig(guildId);
        
        guildConfig.emojis.push({
            ...emojiData,
            createdBy: userId,
            createdAt: new Date()
        });

        await this.addLog(guildId, 'emoji_add', userId, null, emojiData.name);
        await this.updateGuildConfig(guildId, guildConfig);

        this.cache.delete(`guild_config:${guildId}`);
        return guildConfig;
    }

    /**
     * Remove um emoji
     */
    async removeEmoji(guildId, userId, emojiId) {
        const guildConfig = await this.getGuildConfig(guildId);
        const emojiIndex = guildConfig.emojis.findIndex(e => e.id === emojiId);

        if (emojiIndex === -1) {
            throw new Error('Emoji não encontrado');
        }

        const removedEmoji = guildConfig.emojis.splice(emojiIndex, 1)[0];
        await this.addLog(guildId, 'emoji_remove', userId, removedEmoji.name, null);
        await this.updateGuildConfig(guildId, guildConfig);

        this.cache.delete(`guild_config:${guildId}`);
        return guildConfig;
    }

    /**
     * Atualiza as permissões de um cargo
     */
    async updateRolePermissions(guildId, roleId, allowedCommands, deniedCommands) {
        const guildConfig = await this.getGuildConfig(guildId);
        const roleIndex = guildConfig.permissions.roles.findIndex(r => r.roleId === roleId);

        if (roleIndex === -1) {
            guildConfig.permissions.roles.push({
                roleId,
                allowedCommands,
                deniedCommands
            });
        } else {
            guildConfig.permissions.roles[roleIndex] = {
                roleId,
                allowedCommands,
                deniedCommands
            };
        }

        await this.updateGuildConfig(guildId, guildConfig);
        this.cache.delete(`guild_config:${guildId}`);
        return guildConfig;
    }

    /**
     * Atualiza as permissões de um usuário
     */
    async updateUserPermissions(guildId, userId, allowedCommands, deniedCommands) {
        const guildConfig = await this.getGuildConfig(guildId);
        const userIndex = guildConfig.permissions.users.findIndex(u => u.userId === userId);

        if (userIndex === -1) {
            guildConfig.permissions.users.push({
                userId,
                allowedCommands,
                deniedCommands
            });
        } else {
            guildConfig.permissions.users[userIndex] = {
                userId,
                allowedCommands,
                deniedCommands
            };
        }

        await this.updateGuildConfig(guildId, guildConfig);
        this.cache.delete(`guild_config:${guildId}`);
        return guildConfig;
    }

    /**
     * Verifica as permissões de um usuário
     */
    async checkPermissions(guildId, userId, roleIds, commandName) {
        const guildConfig = await this.getGuildConfig(guildId);
        const perms = await this.getPermissions(guildId, userId, roleIds);

        // Verifica se o comando está explicitamente negado
        if (perms.denied.includes(commandName)) {
            return false;
        }

        // Verifica se o comando está explicitamente permitido
        if (perms.allowed.includes(commandName) || perms.allowed.includes('*')) {
            return true;
        }

        // Verifica o nível padrão do comando
        const commandConfig = config.commands[commandName];
        if (!commandConfig) return false;

        const userHighestRole = Math.max(...roleIds.map(roleId => {
            const rolePerms = guildConfig.permissions.roles.find(r => r.roleId === roleId);
            return rolePerms?.level || 0;
        }));

        return userHighestRole >= commandConfig.defaultLevel;
    }

    /**
     * Registra o uso de um comando
     */
    async logCommandUsage(guildId, commandName) {
        const guildConfig = await this.getGuildConfig(guildId);
        await this.updateCommandStats(guildId, commandName);
        this.cache.delete(`guild_config:${guildId}`);
    }

    /**
     * Obtém estatísticas de uso dos comandos
     */
    async getCommandStats(guildId) {
        const guildConfig = await this.getGuildConfig(guildId);
        return {
            commands: Object.fromEntries(guildConfig.stats.commandsUsed),
            lastUpdated: guildConfig.stats.lastUpdated
        };
    }

    /**
     * Atualiza a configuração de um servidor
     */
    async updateGuildConfig(guildId, updates) {
        const config = await this.db.read();
        if (!config[guildId]) config[guildId] = this.createDefaultConfig(guildId);
        
        Object.assign(config[guildId], updates);
        await this.db.write(config);
        
        return config[guildId];
    }

    /**
     * Verifica as permissões de um usuário
     */
    async getPermissions(guildId, userId, roleIds) {
        const guildConfig = await this.getGuildConfig(guildId);
        const userPerms = guildConfig.permissions.users.find(u => u.userId === userId);
        const rolePerms = roleIds.map(roleId => guildConfig.permissions.roles.find(r => r.roleId === roleId));

        const allowed = [...(userPerms?.allowedCommands || []), ...rolePerms.flatMap(rp => rp?.allowedCommands || [])];
        const denied = [...(userPerms?.deniedCommands || []), ...rolePerms.flatMap(rp => rp?.deniedCommands || [])];

        return { allowed, denied };
    }

    /**
     * Atualiza as estatísticas de uso de comandos
     */
    async updateCommandStats(guildId, commandName) {
        const guildConfig = await this.getGuildConfig(guildId);
        if (!guildConfig.stats.commandsUsed[commandName]) guildConfig.stats.commandsUsed[commandName] = 0;
        guildConfig.stats.commandsUsed[commandName]++;
        guildConfig.stats.lastUpdated = new Date();
        await this.updateGuildConfig(guildId, guildConfig);
    }

    /**
     * Adiciona um log de alteração
     */
    async addLog(guildId, type, userId, oldValue, newValue) {
        const guildConfig = await this.getGuildConfig(guildId);
        guildConfig.logs.push({
            type,
            userId,
            oldValue,
            newValue,
            timestamp: new Date()
        });
        await this.updateGuildConfig(guildId, guildConfig);
    }

    /**
     * Cria uma configuração padrão para um servidor
     */
    createDefaultConfig(guildId) {
        return {
            guildId,
            name: null,
            avatar: null,
            emojis: [],
            stats: {
                commands: {},
                messages: 0,
                members: 0
            },
            logs: [],
            permissions: {
                users: {},
                roles: {}
            },
            settings: {
                autoModeration: {
                    enabled: true,
                    filters: {
                        spam: false,
                        links: false,
                        invites: false
                    }
                },
                welcomeMessage: {
                    enabled: false,
                    channelId: null,
                    message: null
                },
                leaveMessage: {
                    enabled: false,
                    channelId: null,
                    message: null
                }
            }
        };
    }

    /**
     * Limpa o cache de um servidor
     */
    clearGuildCache(guildId) {
        this.cache.delete(`guild_config:${guildId}`);
    }
}

export { BotConfigManager };
export default new BotConfigManager();
