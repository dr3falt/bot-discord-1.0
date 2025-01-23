import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { EmbedBuilder  } from 'discord.js';;
import JsonDatabase from './jsonDatabase.js';;
import path from 'path';;

class ReminderManager {
    constructor() {
        this.db = new JsonDatabase(path.join(__dirname, '../database/reminders.json'));
        this.checkInterval = 5 * 60 * 1000; // 5 minutos
        this.reminders = new Map();
        this.initialize();
    }

    async initialize() {
        try {
            const data = await this.db.read() || {};
            Object.entries(data).forEach(([guildId, guildReminders]) => {
                this.reminders.set(guildId, guildReminders);
            });

            // Inicia o loop de verificação
            setInterval(() => this.checkReminders(), this.checkInterval);
        } catch (error) {
            console.error('Erro ao inicializar ReminderManager:', error);
        }
    }

    async addReminder(guildId, channelId, type, message, dueDate) {
        try {
            if (!this.reminders.has(guildId)) {
                this.reminders.set(guildId, []);
            }

            const reminder = {
                id: Date.now().toString(),
                channelId,
                type,
                message,
                dueDate: new Date(dueDate).getTime(),
                createdAt: Date.now(),
                completed: false
            };

            this.reminders.get(guildId).push(reminder);
            await this.save();

            return reminder;
        } catch (error) {
            console.error('Erro ao adicionar lembrete:', error);
            throw error;
        }
    }

    async completeReminder(guildId, reminderId) {
        try {
            const guildReminders = this.reminders.get(guildId);
            if (!guildReminders) return false;

            const reminder = guildReminders.find(r => r.id === reminderId);
            if (!reminder) return false;

            reminder.completed = true;
            await this.save();

            return true;
        } catch (error) {
            console.error('Erro ao completar lembrete:', error);
            throw error;
        }
    }

    async getGuildReminders(guildId) {
        return this.reminders.get(guildId) || [];
    }

    async getPendingReminders(guildId) {
        const reminders = this.reminders.get(guildId) || [];
        return reminders.filter(r => !r.completed);
    }

    async checkReminders() {
        try {
            const now = Date.now();

            for (const [guildId, guildReminders] of this.reminders) {
                const pendingReminders = guildReminders.filter(r => !r.completed && r.dueDate <= now);

                for (const reminder of pendingReminders) {
                    try {
                        const guild = client.guilds.cache.get(guildId);
                        if (!guild) continue;

                        const channel = guild.channels.cache.get(reminder.channelId);
                        if (!channel) continue;

                        const embed = new EmbedBuilder()
                            .setTitle('⏰ Lembrete Pendente')
                            .setColor('#ff9900')
                            .setDescription(reminder.message)
                            .addFields(
                                { name: 'Tipo', value: reminder.type, inline: true },
                                { name: 'Criado em', value: `<t:${Math.floor(reminder.createdAt / 1000)}:R>`, inline: true }
                            )
                            .setFooter({ text: `ID: ${reminder.id}` });

                        await channel.send({ embeds: [embed] });
                    } catch (error) {
                        console.error(`Erro ao enviar lembrete ${reminder.id}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao verificar lembretes:', error);
        }
    }

    async save() {
        try {
            const data = {};
            for (const [guildId, guildReminders] of this.reminders) {
                data[guildId] = guildReminders;
            }
            await this.db.write(data);
        } catch (error) {
            console.error('Erro ao salvar lembretes:', error);
            throw error;
        }
    }

    // Adiciona lembretes específicos para cada tipo de configuração
    async addWelcomeReminder(guild, channel) {
        return this.addReminder(
            guild.id,
            channel.id,
            'welcome',
            'Não se esqueça de configurar a mensagem de boas-vindas! Use `/welcome mensagem` para personalizar.',
            Date.now() + 24 * 60 * 60 * 1000 // 24 horas
        );
    }

    async addAutoroleReminder(guild, channel) {
        return this.addReminder(
            guild.id,
            channel.id,
            'autorole',
            'Lembre-se de configurar os cargos automáticos! Use `/autorole adicionar` para definir os cargos.',
            Date.now() + 24 * 60 * 60 * 1000
        );
    }

    async addLogsReminder(guild, channel) {
        return this.addReminder(
            guild.id,
            channel.id,
            'logs',
            'Configure quais eventos você quer registrar usando `/logs eventos`.',
            Date.now() + 24 * 60 * 60 * 1000
        );
    }

    async addAntiraidReminder(guild, channel) {
        return this.addReminder(
            guild.id,
            channel.id,
            'antiraid',
            'Configure os limites do sistema anti-raid usando `/antiraid joinlimit` e `/antiraid action`.',
            Date.now() + 24 * 60 * 60 * 1000
        );
    }
}

export default new ReminderManager();
