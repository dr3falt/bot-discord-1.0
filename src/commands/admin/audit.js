import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import warningManager from '../../utils/warningManager.js';
import messageTracker from '../../utils/messageTracker.js';
import permissionTracker from '../../utils/permissionTracker.js';

export default {
    data: new SlashCommandBuilder()
        .setName('audit')
        .setDescription('Sistema de auditoria do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('Mostra logs de ações recentes')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de logs para visualizar')
                        .setRequired(true)
                        .addChoices(
                            { name: '🔨 Moderação', value: 'mod' },
                            { name: '⚙️ Configuração', value: 'config' },
                            { name: '👥 Membros', value: 'members' },
                            { name: '💬 Mensagens', value: 'messages' },
                            { name: '🔐 Segurança', value: 'security' }
                        ))
                .addIntegerOption(option =>
                    option.setName('quantidade')
                        .setDescription('Quantidade de logs para mostrar (máx: 100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Mostra histórico de ações de um usuário')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para verificar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Gerencia advertências de um usuário')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para advertir')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('acao')
                        .setDescription('Ação a ser realizada')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover', value: 'remove' },
                            { name: 'Limpar', value: 'clear' }
                        ))
                .addStringOption(option =>
                    option.setName('motivo')
                        .setDescription('Motivo da advertência')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Exporta logs do servidor')
                .addStringOption(option =>
                    option.setName('formato')
                        .setDescription('Formato do arquivo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'CSV', value: 'csv' },
                            { name: 'JSON', value: 'json' }
                        ))
                .addStringOption(option =>
                    option.setName('periodo')
                        .setDescription('Período dos logs')
                        .setRequired(true)
                        .addChoices(
                            { name: '24 horas', value: '24h' },
                            { name: '7 dias', value: '7d' },
                            { name: '30 dias', value: '30d' }
                        ))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'logs':
                    await this.handleLogsCommand(interaction);
                    break;
                case 'user':
                    await this.handleUserCommand(interaction);
                    break;
                case 'warn':
                    await this.handleWarnCommand(interaction);
                    break;
                case 'export':
                    await this.handleExportCommand(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: 'Subcomando inválido.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Erro ao executar comando audit:', error);
            await interaction.reply({
                content: 'Ocorreu um erro ao executar o comando.',
                ephemeral: true
            });
        }
    },

    async handleLogsCommand(interaction) {
        const tipo = interaction.options.getString('tipo');
        const quantidade = interaction.options.getInteger('quantidade') || 10;

        const logs = await this.fetchLogs(interaction.guild, tipo, quantidade);
        const tipoNome = this.getTipoNome(tipo);

        const embed = new EmbedBuilder()
            .setTitle(`📋 Logs de ${tipoNome}`)
            .setDescription(this.formatLogs(logs))
            .setColor(0x0099FF)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleUserCommand(interaction) {
        const user = interaction.options.getUser('usuario');
        const history = await this.fetchUserHistory(interaction.guild, user.id);

        const warnings = await warningManager.getWarnings(interaction.guild.id, user.id);
        const deletedMessages = await messageTracker.getDeletedMessages(interaction.guild.id, user.id);
        const permChanges = await permissionTracker.getChanges(interaction.guild.id, user.id);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Histórico de ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(0x0099FF)
            .addFields(
                { name: '⚠️ Advertências', value: warnings.length.toString(), inline: true },
                { name: '🗑️ Mensagens Deletadas', value: deletedMessages.length.toString(), inline: true },
                { name: '🔑 Mudanças de Permissão', value: permChanges.length.toString(), inline: true }
            )
            .setDescription('**Ações Recentes:**\n' + this.formatModActions(history))
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleWarnCommand(interaction) {
        const user = interaction.options.getUser('usuario');
        const action = interaction.options.getString('acao');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';

        switch (action) {
            case 'add':
                await warningManager.addWarning(interaction.guild.id, user.id, {
                    reason,
                    moderator: interaction.user.id,
                    timestamp: Date.now()
                });

                await interaction.reply({
                    content: `✅ Advertência adicionada para ${user.tag}\nMotivo: ${reason}`,
                    ephemeral: true
                });
                break;

            case 'remove':
                const removed = await warningManager.removeWarning(interaction.guild.id, user.id);
                if (removed) {
                    await interaction.reply({
                        content: `✅ Última advertência removida de ${user.tag}`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `❌ ${user.tag} não possui advertências para remover`,
                        ephemeral: true
                    });
                }
                break;

            case 'clear':
                await warningManager.clearWarnings(interaction.guild.id, user.id);
                await interaction.reply({
                    content: `✅ Todas as advertências de ${user.tag} foram removidas`,
                    ephemeral: true
                });
                break;
        }
    },

    async handleExportCommand(interaction) {
        const formato = interaction.options.getString('formato');
        const periodo = interaction.options.getString('periodo');

        await interaction.deferReply({ ephemeral: true });

        try {
            const filePath = await this.generateLogFile(interaction.guild, formato, periodo);
            await interaction.editReply({
                content: 'Aqui está o arquivo de logs:',
                files: [filePath]
            });
        } catch (error) {
            console.error('Erro ao gerar arquivo de logs:', error);
            await interaction.editReply({
                content: 'Ocorreu um erro ao gerar o arquivo de logs.'
            });
        }
    },

    // Funções auxiliares
    async fetchLogs(guild, tipo, quantidade) {
        const auditLogType = this.getAuditLogType(tipo);
        const fetchedLogs = await guild.fetchAuditLogs({
            type: auditLogType,
            limit: quantidade
        });

        return fetchedLogs.entries;
    },

    async fetchUserHistory(guild, userId) {
        const fetchedLogs = await guild.fetchAuditLogs({
            user: userId,
            limit: 10
        });

        return fetchedLogs.entries;
    },

    async generateLogFile(guild, formato, periodo) {
        // Implementação da geração do arquivo
        // Esta é uma implementação básica, você pode expandir conforme necessário
        return 'path/to/generated/file';
    },

    getTipoNome(tipo) {
        const tipos = {
            'mod': 'Moderação',
            'config': 'Configuração',
            'members': 'Membros',
            'messages': 'Mensagens',
            'security': 'Segurança'
        };
        return tipos[tipo] || tipo;
    },

    getAuditLogType(tipo) {
        // Mapeia os tipos para os tipos de AuditLogEvent do Discord.js
        const tipos = {
            'mod': 'MEMBER_BAN_ADD',
            'config': 'GUILD_UPDATE',
            'members': 'MEMBER_UPDATE',
            'messages': 'MESSAGE_DELETE',
            'security': 'MEMBER_KICK'
        };
        return tipos[tipo];
    },

    formatLogs(logs) {
        return logs.map(log => 
            `[${new Date(log.createdTimestamp).toLocaleString()}] ${log.action} por ${log.executor.tag}`
        ).join('\n');
    },

    formatModActions(entries) {
        return entries.map(entry => {
            const timestamp = new Date(entry.createdTimestamp).toLocaleString();
            const action = entry.action;
            const target = entry.target ? (entry.target.tag || entry.target.name) : 'Desconhecido';
            
            return `\`${timestamp}\` **${action}** - Alvo: ${target}`;
        }).join('\n');
    },

    async getWarnings(guild, userId) {
        return await warningManager.getWarnings(guild.id, userId);
    },

    async getDeletedMessages(guild, userId) {
        return await messageTracker.getDeletedMessages(guild.id, userId);
    },

    async getPermissionChanges(guild, userId) {
        return await permissionTracker.getChanges(guild.id, userId);
    }
};
