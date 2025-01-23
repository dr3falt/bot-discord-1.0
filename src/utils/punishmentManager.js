import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { EmbedBuilder  } from 'discord.js';;
import JsonDatabase from './jsonDatabase.js';;
import path from 'path';;

const db = new JsonDatabase(path.join(__dirname, '../database/protection.json'));

class PunishmentManager {
    static async addWarning(userId, guildId, reason) {
        const protection = await db.read();
        if (!protection.punishments.warnings[guildId]) {
            protection.punishments.warnings[guildId] = {};
        }
        if (!protection.punishments.warnings[guildId][userId]) {
            protection.punishments.warnings[guildId][userId] = [];
        }

        const warning = {
            reason,
            timestamp: Date.now()
        };

        protection.punishments.warnings[guildId][userId].push(warning);
        await db.write(protection);

        return protection.punishments.warnings[guildId][userId].length;
    }

    static async getWarnings(userId, guildId) {
        const protection = await db.read();
        return protection.punishments.warnings[guildId]?.[userId] || [];
    }

    static async clearWarnings(userId, guildId) {
        const protection = await db.read();
        if (protection.punishments.warnings[guildId]) {
            delete protection.punishments.warnings[guildId][userId];
            await db.write(protection);
        }
    }

    static async muteUser(member, duration, reason) {
        try {
            await member.timeout(duration, reason);
            
            const protection = await db.read();
            if (!protection.punishments.mutes[member.guild.id]) {
                protection.punishments.mutes[member.guild.id] = {};
            }

            protection.punishments.mutes[member.guild.id][member.id] = {
                endTime: Date.now() + duration,
                reason
            };

            await db.write(protection);
            return true;
        } catch (error) {
            console.error('Erro ao mutar usuário:', error);
            return false;
        }
    }

    static async checkMute(member) {
        const protection = await db.read();
        const mute = protection.punishments.mutes[member.guild.id]?.[member.id];
        
        if (!mute) return false;
        
        if (Date.now() >= mute.endTime) {
            delete protection.punishments.mutes[member.guild.id][member.id];
            await db.write(protection);
            return false;
        }

        return true;
    }

    static async createPunishmentEmbed(type, user, reason, duration = null) {
        const embed = new EmbedBuilder()
            .setColor(type === 'warn' ? 0xFFFF00 : 0xFF0000)
            .setTitle(`⚠️ ${type === 'warn' ? 'Aviso' : 'Punição'}`)
            .setDescription(`${user} recebeu uma punição.`)
            .addFields(
                { name: 'Usuário', value: user.tag, inline: true },
                { name: 'ID', value: user.id, inline: true },
                { name: 'Tipo', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
                { name: 'Motivo', value: reason }
            )
            .setTimestamp();

        if (duration) {
            embed.addFields({ 
                name: 'Duração', 
                value: `${Math.floor(duration / 1000 / 60)} minutos` 
            });
        }

        return embed;
    }

    static async shouldPunish(userId, guildId, type) {
        const protection = await db.read();
        const lastPunishment = protection.punishments.lastPunishment[guildId]?.[userId];

        if (!lastPunishment) return true;

        // Evita spam de punições (mínimo 5 segundos entre punições)
        if (Date.now() - lastPunishment < 5000) return false;

        protection.punishments.lastPunishment[guildId] = {
            ...protection.punishments.lastPunishment[guildId],
            [userId]: Date.now()
        };
        await db.write(protection);

        return true;
    }
}

export default PunishmentManager;
