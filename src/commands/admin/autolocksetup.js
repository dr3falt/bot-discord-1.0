import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, PermissionFlagsBits  } from 'discord.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';
import embedBuilder from '../../utils/embedBuilder.js';
import schedule from 'node-schedule';

const db = new JsonDatabase(path.join(__dirname, '../../database/autolock.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('autolocksetup')
        .setDescription('Configura o bloqueio automático de canais')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar')
                .setDescription('Adiciona canais ao sistema de bloqueio automático')
                .addStringOption(option =>
                    option.setName('horario_lock')
                        .setDescription('Horário para trancar (formato 24h - HH:mm)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('horario_unlock')
                        .setDescription('Horário para destrancar (formato 24h - HH:mm)')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal para adicionar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover')
                .setDescription('Remove um canal do sistema de bloqueio automático')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal para remover')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lista')
                .setDescription('Mostra a lista de canais configurados')),

    async execute(interaction) {
        try {
            // Verifica permissões
            if (!(await checkPermissions(interaction.user.id, interaction.guild.id, 'admin'))) {
                const errorEmbed = embedBuilder.error( 'Sem Permissão', 'Você precisa ser um administrador para usar este comando.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            let autolock = await db.read() || {};

            // Inicializa a estrutura se não existir
            if (!autolock[guildId]) {
                autolock[guildId] = {
                    channels: []
                };
            }

            if (subcommand === 'adicionar') {
                const channel = interaction.options.getChannel('canal');
                const lockTime = interaction.options.getString('horario_lock');
                const unlockTime = interaction.options.getString('horario_unlock');

                // Valida o formato das horas
                const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(lockTime) || !timeRegex.test(unlockTime)) {
                    const errorEmbed = embedBuilder.error( 'Formato Inválido', 'O formato do horário deve ser HH:mm (exemplo: 23:00)'
                    );
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                // Verifica se o canal já está configurado
                const existingChannel = autolock[guildId].channels.find(c => c.id === channel.id);
                if (existingChannel) {
                    existingChannel.lockTime = lockTime;
                    existingChannel.unlockTime = unlockTime;
                } else {
                    autolock[guildId].channels.push({
                        id: channel.id,
                        name: channel.name,
                        lockTime,
                        unlockTime
                    });
                }

                await db.write(autolock);

                // Agenda os horários
                schedule.scheduleJob(`lock-${channel.id}`, `0 ${lockTime.split(':')[1]} ${lockTime.split(':')[0]} * * *`, async () => {
                    try {
                        const targetChannel = await interaction.guild.channels.fetch(channel.id);
                        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                            SendMessages: false,
                            AddReactions: false
                        });

                        const lockEmbed = embedBuilder.custom({
                            title: '🔒 Canal Bloqueado Automaticamente',
                            description: 'Este canal foi bloqueado pelo sistema automático.',
                            color: 0xFF0000
                        });

                        await targetChannel.send({ embeds: [lockEmbed] });
                    } catch (error) {
                        console.error('Erro ao executar bloqueio automático:', error);
                    }
                });

                schedule.scheduleJob(`unlock-${channel.id}`, `0 ${unlockTime.split(':')[1]} ${unlockTime.split(':')[0]} * * *`, async () => {
                    try {
                        const targetChannel = await interaction.guild.channels.fetch(channel.id);
                        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                            SendMessages: null,
                            AddReactions: null
                        });

                        const unlockEmbed = embedBuilder.custom({
                            title: '🔓 Canal Desbloqueado Automaticamente',
                            description: 'Este canal foi desbloqueado pelo sistema automático.',
                            color: 0x00FF00
                        });

                        await targetChannel.send({ embeds: [unlockEmbed] });
                    } catch (error) {
                        console.error('Erro ao executar desbloqueio automático:', error);
                    }
                });

                const successEmbed = embedBuilder.success( '⏰ AutoLock Configurado',
                    `O canal ${channel} será bloqueado às ${lockTime} e desbloqueado às ${unlockTime}.`
                );
                return await interaction.reply({ embeds: [successEmbed] });
            }

            if (subcommand === 'remover') {
                const channel = interaction.options.getChannel('canal');
                const channelIndex = autolock[guildId].channels.findIndex(c => c.id === channel.id);

                if (channelIndex === -1) {
                    const errorEmbed = embedBuilder.error( 'Canal não Encontrado', 'Este canal não está configurado no sistema de bloqueio automático.'
                    );
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                // Remove os agendamentos existentes
                const lockJob = schedule.scheduledJobs[`lock-${channel.id}`];
                const unlockJob = schedule.scheduledJobs[`unlock-${channel.id}`];
                if (lockJob) lockJob.cancel();
                if (unlockJob) unlockJob.cancel();

                autolock[guildId].channels.splice(channelIndex, 1);
                await db.write(autolock);

                const successEmbed = embedBuilder.success( '⏰ AutoLock Removido',
                    `O canal ${channel} foi removido do sistema de bloqueio automático.`
                );
                return await interaction.reply({ embeds: [successEmbed] });
            }

            if (subcommand === 'lista') {
                const channels = autolock[guildId].channels;
                
                if (channels.length === 0) {
                    const emptyEmbed = embedBuilder.info( '⏰ AutoLock', 'Nenhum canal configurado no sistema de bloqueio automático.'
                    );
                    return await interaction.reply({ embeds: [emptyEmbed] });
                }

                const listEmbed = embedBuilder.custom({
                    title: '⏰ Canais com Bloqueio Automático',
                    fields: channels.map(channel => ({
                        name: `#${channel.name}`,
                        value: `🔒 Bloqueia: ${channel.lockTime}\n🔓 Desbloqueia: ${channel.unlockTime}`,
                        inline: true
                    }))
                });

                return await interaction.reply({ embeds: [listEmbed] });
            }
        } catch (error) {
            console.error('Erro ao executar autolocksetup:', error);
            const errorEmbed = embedBuilder.error( 'Erro', 'Ocorreu um erro ao configurar o sistema de bloqueio automático.'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
