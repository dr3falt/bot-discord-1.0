import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder  } from 'discord.js';
import HistoryManager from '../../utils/HistoryManager.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('historico')
        .setDescription('Mostra o histórico de ações no servidor')
        .addStringOption(option =>
            option.setName('categoria')
                .setDescription('Categoria do histórico')
                .setRequired(true)
                .addChoices(
                    { name: 'Comandos', value: 'commands' },
                    { name: 'Interações', value: 'interactions' },
                    { name: 'Configurações', value: 'configurations' },
                    { name: 'Moderação', value: 'moderation' }
                ))
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('Quantidade de registros para mostrar')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(50)),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id,
                interaction.guild.id, 'admin',
                interaction.member
            );

            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ Você não tem permissão para usar este comando.',
                    ephemeral: true
                });
            }

            const category = interaction.options.getString('categoria');
            const limit = interaction.options.getInteger('quantidade') || 10;

            const history = await HistoryManager.getGuildHistory(interaction.guildId, category, limit);

            if (!history || (Array.isArray(history) && history.length === 0)) {
                return await interaction.reply({
                    content: '📝 Nenhum registro encontrado nesta categoria.',
                    ephemeral: true
                });
            }

            const formatEntry = (entry) => {
                let description = '';

                switch (entry.category) {
                    case 'commands':
                        description = `Comando: /${entry.commandName}\n`;
                        if (Object.keys(entry.options).length > 0) {
                            description += `Opções: ${JSON.stringify(entry.options)}\n`;
                        }
                        break;

                    case 'interactions':
                        description = `Tipo: ${entry.type}\n`;
                        if (entry.customId) description += `ID: ${entry.customId}\n`;
                        if (entry.values) description += `Valores: ${entry.values.join(', ')}\n`;
                        break;

                    case 'configurations':
                        description = `Configuração: ${entry.type}\n`;
                        description += `Alterações: ${JSON.stringify(entry.changes)}\n`;
                        break;

                    case 'moderation':
                        description = `Ação: ${entry.type}\n`;
                        description += `Alvo: <@${entry.targetId}>\n`;
                        if (entry.reason) description += `Motivo: ${entry.reason}\n`;
                        break;
                }

                return `**Usuário:** <@${entry.userId}>\n${description}**Data:** <t:${Math.floor(entry.timestamp / 1000)}:R>\n`;
            };

            const entries = Array.isArray(history) ? history : history[category];
            const formattedEntries = entries.map(formatEntry).join('\n---\n');

            const embed = new EmbedBuilder()
                .setTitle(`📜 Histórico - ${category}`)
                .setColor('#2ecc71')
                .setDescription(formattedEntries)
                .setFooter({ text: `${entries.length} registros encontrados` })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Erro ao executar comando historico:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao buscar o histórico.',
                ephemeral: true
            });
        }
    }
};
