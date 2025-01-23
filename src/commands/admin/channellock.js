import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';

const db = new JsonDatabase(path.join(__dirname, '../../data/protection.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('channellock')
        .setDescription('Configura bloqueio automático de canais')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adiciona um novo horário de bloqueio')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('O canal para bloquear')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('horario_bloqueio')
                        .setDescription('Horário para bloquear (HH:MM)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('horario_liberacao')
                        .setDescription('Horário para liberar (HH:MM)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove um horário de bloqueio')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('O canal para remover o bloqueio')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista todos os horários de bloqueio')),

    async execute(interaction) {
        if (!(await checkPermissions(interaction.user.id, interaction.guild.id, 'admin'))) {
            return await interaction.reply({
                content: 'Você precisa ser um administrador para usar este comando.',
                ephemeral: true
            });
        }

        const protection = await db.read();
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const channel = interaction.options.getChannel('canal');
            const lockTime = interaction.options.getString('horario_bloqueio');
            const unlockTime = interaction.options.getString('horario_liberacao');

            // Validar formato do horário (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(lockTime) || !timeRegex.test(unlockTime)) {
                return await interaction.reply({
                    content: 'Formato de horário inválido. Use HH:MM (exemplo: 23:00).',
                    ephemeral: true
                });
            }

            const schedule = {
                channelId: channel.id,
                lockTime,
                unlockTime
            };

            if (!protection.channelLock.schedules) {
                protection.channelLock.schedules = [];
            }

            // Remove agendamento existente para o mesmo canal
            protection.channelLock.schedules = protection.channelLock.schedules.filter(s => s.channelId !== channel.id);
            protection.channelLock.schedules.push(schedule);
            await db.write(protection);

            return await interaction.reply({
                content: `Canal ${channel} será bloqueado às ${lockTime} e liberado às ${unlockTime}.`,
                ephemeral: true
            });
        }

        if (subcommand === 'remove') {
            const channel = interaction.options.getChannel('canal');
            protection.channelLock.schedules = protection.channelLock.schedules.filter(s => s.channelId !== channel.id);
            await db.write(protection);

            return await interaction.reply({
                content: `Bloqueio automático removido do canal ${channel}.`,
                ephemeral: true
            });
        }

        if (subcommand === 'list') {
            if (!protection.channelLock.schedules || protection.channelLock.schedules.length === 0) {
                return await interaction.reply({
                    content: 'Não há horários de bloqueio configurados.',
                    ephemeral: true
                });
            }

            const scheduleList = protection.channelLock.schedules.map(s => {
                const channel = interaction.guild.channels.cache.get(s.channelId);
                return `${channel ? channel.name : 'Canal deletado'}: 🔒 ${s.lockTime} - 🔓 ${s.unlockTime}`;
            }).join('\n');

            return await interaction.reply({
                content: `**Horários de Bloqueio Configurados:**\n${scheduleList}`,
                ephemeral: true
            });
        }
    },
};
