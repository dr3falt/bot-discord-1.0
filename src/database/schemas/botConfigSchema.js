const JsonDatabase = require('../../utils/jsonDatabase');
const path = require('path');

class BotConfigSchema {
    constructor() {
        this.db = new JsonDatabase(path.join(__dirname, '../config.json'));
    }

    async getGuildConfig(guildId) {
        const config = await this.db.read();
        return config[guildId] || this.createDefaultConfig(guildId);
    }

    async updateCommandStats(guildId, commandName) {
        const config = await this.db.read();
        if (!config[guildId]) config[guildId] = this.createDefaultConfig(guildId);
        if (!config[guildId].stats) config[guildId].stats = {};
        if (!config[guildId].stats.commands) config[guildId].stats.commands = {};
        
        const commandStats = config[guildId].stats.commands;
        commandStats[commandName] = (commandStats[commandName] || 0) + 1;
        
        await this.db.write(config);
        return commandStats[commandName];
    }

    async addLog(guildId, type, userId, oldValue, newValue) {
        const config = await this.db.read();
        if (!config[guildId]) config[guildId] = this.createDefaultConfig(guildId);
        if (!config[guildId].logs) config[guildId].logs = [];

        const log = {
            type,
            userId,
            oldValue,
            newValue,
            timestamp: new Date().toISOString()
        };

        config[guildId].logs.push(log);
        if (config[guildId].logs.length > 100) config[guildId].logs.shift();
        
        await this.db.write(config);
        return log;
    }

    async getPermissions(guildId, userId, roleIds) {
        const config = await this.db.read();
        if (!config[guildId]) return { commands: [], roles: [] };

        const guildConfig = config[guildId];
        const userPerms = guildConfig.permissions?.users?.[userId] || { commands: [], roles: [] };
        const rolePerms = (roleIds || []).reduce((acc, roleId) => {
            const rolePermissions = guildConfig.permissions?.roles?.[roleId] || { commands: [], roles: [] };
            return {
                commands: [...acc.commands, ...rolePermissions.commands],
                roles: [...acc.roles, ...rolePermissions.roles]
            };
        }, { commands: [], roles: [] });

        return {
            commands: [...new Set([...userPerms.commands, ...rolePerms.commands])],
            roles: [...new Set([...userPerms.roles, ...rolePerms.roles])]
        };
    }

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
            }
        };
    }
}

module.exports = new BotConfigSchema();
