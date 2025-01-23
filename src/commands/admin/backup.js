import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs/promises';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import permissionManager from '../../utils/permissionManager.js';
import backupUtils from '../../utils/backupUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '../../database/backups');

export default {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Sistema avançado de backup do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Cria um backup do servidor')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome personalizado para o backup')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('descrição')
                        .setDescription('Descrição do backup')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista todos os backups disponíveis'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Mostra informações detalhadas de um backup')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID do backup')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Deleta um backup')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID do backup')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            await backupUtils.ensureBackupDirExists();

            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'create':
                    await this.handleCreateBackup(interaction);
                    break;
                case 'list':
                    await this.handleListBackups(interaction);
                    break;
                case 'info':
                    await this.handleBackupInfo(interaction);
                    break;
                case 'delete':
                    await this.handleDeleteBackup(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: 'Subcomando inválido.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Erro ao executar comando de backup:', error);
            await interaction.reply({
                content: 'Ocorreu um erro ao executar o comando de backup.',
                ephemeral: true
            });
        }
    },

    async handleCreateBackup(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const nome = interaction.options.getString('nome');
            const descricao = interaction.options.getString('descrição');

            const guild = interaction.guild;
            const backupData = {
                name: nome || `Backup_${guild.name}_${new Date().toISOString()}`,
                description: descricao || 'Backup automático',
                timestamp: Date.now(),
                creator: interaction.user.id,
                guild: {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL(),
                    channels: [],
                    roles: [],
                    emojis: []
                }
            };

            // Coleta dados dos canais
            const channels = await guild.channels.fetch();
            for (const [id, channel] of channels) {
                backupData.guild.channels.push({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    parent: channel.parent?.id,
                    position: channel.position,
                    permissions: channel.permissionOverwrites.cache.map(perm => ({
                        id: perm.id,
                        type: perm.type,
                        allow: perm.allow.toArray(),
                        deny: perm.deny.toArray()
                    }))
                });
            }

            // Coleta dados dos cargos
            const roles = await guild.roles.fetch();
            for (const [id, role] of roles) {
                if (role.managed) continue;
                backupData.guild.roles.push({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    hoist: role.hoist,
                    position: role.position,
                    permissions: role.permissions.toArray(),
                    mentionable: role.mentionable
                });
            }

            // Coleta dados dos emojis
            const emojis = await guild.emojis.fetch();
            for (const [id, emoji] of emojis) {
                backupData.guild.emojis.push({
                    id: emoji.id,
                    name: emoji.name,
                    url: emoji.url
                });
            }

            // Cria o backup
            const backupId = await backupUtils.createBackup(guild.id, backupData);

            const embed = new EmbedBuilder()
                .setTitle('✅ Backup Criado')
                .setDescription(`O backup foi criado com sucesso!\nID: \`${backupId}\``)
                .addFields(
                    { name: 'Nome', value: backupData.name, inline: true },
                    { name: 'Descrição', value: backupData.description, inline: true },
                    { name: 'Canais', value: backupData.guild.channels.length.toString(), inline: true },
                    { name: 'Cargos', value: backupData.guild.roles.length.toString(), inline: true },
                    { name: 'Emojis', value: backupData.guild.emojis.length.toString(), inline: true }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            await interaction.editReply('Ocorreu um erro ao criar o backup.');
        }
    },

    async handleListBackups(interaction) {
        try {
            const backups = await backupUtils.listBackups();
            
            if (backups.length === 0) {
                await interaction.reply({
                    content: 'Não há backups disponíveis.',
                    ephemeral: true
                });
                return;
            }

            const backupsList = await Promise.all(backups.map(async (backupId) => {
                try {
                    const data = await backupUtils.loadBackup(backupId);
                    const date = new Date(data.timestamp).toLocaleString();
                    return `**ID:** \`${backupId}\`\n**Nome:** ${data.name}\n**Data:** ${date}\n`;
                } catch {
                    return `**ID:** \`${backupId}\` (Dados corrompidos)\n`;
                }
            }));

            const embed = new EmbedBuilder()
                .setTitle('📋 Lista de Backups')
                .setDescription(backupsList.join('\n'))
                .setColor(0x0099FF)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Erro ao listar backups:', error);
            await interaction.reply({
                content: 'Ocorreu um erro ao listar os backups.',
                ephemeral: true
            });
        }
    },

    async handleBackupInfo(interaction) {
        try {
            const backupId = interaction.options.getString('id');
            const data = await backupUtils.loadBackup(backupId);

            const embed = new EmbedBuilder()
                .setTitle('ℹ️ Informações do Backup')
                .addFields(
                    { name: 'ID', value: backupId, inline: true },
                    { name: 'Nome', value: data.name, inline: true },
                    { name: 'Descrição', value: data.description || 'Nenhuma descrição', inline: false },
                    { name: 'Servidor', value: data.guild.name, inline: true },
                    { name: 'Criado por', value: `<@${data.creator}>`, inline: true },
                    { name: 'Data', value: new Date(data.timestamp).toLocaleString(), inline: true },
                    { name: 'Canais', value: data.guild.channels.length.toString(), inline: true },
                    { name: 'Cargos', value: data.guild.roles.length.toString(), inline: true },
                    { name: 'Emojis', value: data.guild.emojis.length.toString(), inline: true }
                )
                .setColor(0x0099FF)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Erro ao mostrar info do backup:', error);
            await interaction.reply({
                content: 'Ocorreu um erro ao buscar as informações do backup.',
                ephemeral: true
            });
        }
    },

    async handleDeleteBackup(interaction) {
        try {
            const backupId = interaction.options.getString('id');
            await backupUtils.deleteBackup(backupId);

            await interaction.reply({
                content: `✅ Backup \`${backupId}\` deletado com sucesso!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Erro ao deletar backup:', error);
            await interaction.reply({
                content: 'Ocorreu um erro ao deletar o backup.',
                ephemeral: true
            });
        }
    }
};
