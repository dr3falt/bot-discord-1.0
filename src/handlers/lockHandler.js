import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pkg from 'wio.db';
const { JsonDB } = pkg;
import { PermissionsBitField, EmbedBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new JsonDB({
    databasePath: path.join(__dirname, '../database/locks.json')
});

class LockHandler {
    constructor() {
        this.locks = new Map();
        this.schedules = new Map();
    }

    async initialize() {
        const data = await db.read();
        if (!data) {
            await db.write({
                locks: {},
                schedules: {}
            });
        } else {
            // Carregar locks ativos
            for (const [channelId, lockData] of Object.entries(data.locks)) {
                this.locks.set(channelId, lockData);
            }

            // Carregar agendamentos
            for (const [channelId, schedule] of Object.entries(data.schedules)) {
                this.schedules.set(channelId, schedule);
                this.setupSchedule(channelId, schedule);
            }
        }
    }

    async lockChannel(channel, options = {}) {
        try {
            const {
                reason = 'Canal bloqueado',
                bypassRoles = [],
                silent = false
            } = options;

            // Salvar permissões originais
            const originalPerms = channel.permissionOverwrites.cache.clone();
            
            // Configurar novas permissões
            await channel.permissionOverwrites.set([
                {
                    id: channel.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.SendMessages]
                },
                ...bypassRoles.map(roleId => ({
                    id: roleId,
                    allow: [PermissionsBitField.Flags.SendMessages]
                }))
            ]);

            // Salvar informações do lock
            this.locks.set(channel.id, {
                reason,
                bypassRoles,
                originalPerms: originalPerms.toJSON(),
                lockedAt: Date.now()
            });

            // Salvar no database
            const data = await db.read();
            data.locks[channel.id] = this.locks.get(channel.id);
            await db.write(data);

            // Enviar mensagem de aviso
            if (!silent) {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🔒 Canal Bloqueado')
                    .setDescription(reason)
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            }

            return true;
        } catch (error) {
            console.error(`Erro ao bloquear canal: ${error}`);
            return false;
        }
    }

    async unlockChannel(channel, options = {}) {
        try {
            const { silent = false } = options;
            const lockData = this.locks.get(channel.id);
            if (!lockData) return false;

            // Restaurar permissões originais
            await channel.permissionOverwrites.set(lockData.originalPerms);

            // Remover lock
            this.locks.delete(channel.id);

            // Atualizar database
            const data = await db.read();
            delete data.locks[channel.id];
            await db.write(data);

            // Enviar mensagem de aviso
            if (!silent) {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🔓 Canal Desbloqueado')
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            }

            return true;
        } catch (error) {
            console.error(`Erro ao desbloquear canal: ${error}`);
            return false;
        }
    }

    async scheduleAutoLock(channel, schedule) {
        try {
            this.schedules.set(channel.id, schedule);
            
            // Salvar no database
            const data = await db.read();
            data.schedules[channel.id] = schedule;
            await db.write(data);

            // Configurar cronograma
            this.setupSchedule(channel.id, schedule);

            return true;
        } catch (error) {
            console.error(`Erro ao agendar lock: ${error}`);
            return false;
        }
    }

    setupSchedule(channelId, schedule) {
        const { lockTime, unlockTime } = schedule;

        // Converter horários para minutos desde meia-noite
        const lockMinutes = this.timeToMinutes(lockTime);
        const unlockMinutes = this.timeToMinutes(unlockTime);

        // Agendar próximos locks/unlocks
        setInterval(() => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            if (currentMinutes === lockMinutes) {
                this.executeScheduledLock(channelId);
            } else if (currentMinutes === unlockMinutes) {
                this.executeScheduledUnlock(channelId);
            }
        }, 60000); // Verifica a cada minuto
    }

    async executeScheduledLock(channelId) {
        const channel = await this.getChannel(channelId);
        if (channel) {
            await this.lockChannel(channel, {
                reason: 'Bloqueio automático agendado',
                silent: true
            });
        }
    }

    async executeScheduledUnlock(channelId) {
        const channel = await this.getChannel(channelId);
        if (channel) {
            await this.unlockChannel(channel, { silent: true });
        }
    }

    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    async getChannel(channelId) {
        try {
            return await this.client?.channels.fetch(channelId);
        } catch {
            return null;
        }
    }

    isLocked(channelId) {
        return this.locks.has(channelId);
    }

    getLockData(channelId) {
        return this.locks.get(channelId);
    }

    getSchedule(channelId) {
        return this.schedules.get(channelId);
    }
}

export default new LockHandler();
