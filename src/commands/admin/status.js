import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import statusManager from '../../utils/statusManager.js';
import embedBuilder from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Gerencia os status do bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adiciona um novo status')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo do status')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Jogando', value: 'playing' },
                            { name: 'Assistindo', value: 'watching' },
                            { name: 'Ouvindo', value: 'listening' },
                            { name: 'Transmitindo', value: 'streaming' },
                            { name: 'Competindo', value: 'competing' }
                        ))
                .addStringOption(option =>
                    option.setName('texto')
                        .setDescription('Texto do status (use {servers}, {users}, {channels}, {uptime} para valores dinâmicos)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove um status existente')
                .addIntegerOption(option =>
                    option.setName('indice')
                        .setDescription('Índice do status para remover (use /status list para ver os índices)')
                        .setRequired(true)
                        .setMinValue(0)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista todos os status configurados')),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'add') {
                const type = interaction.options.getString('tipo');
                const text = interaction.options.getString('texto');

                await statusManager.addStatus(type, text);

                const successEmbed = embedBuilder.success( '✅ Status Adicionado',
                    `Tipo: ${type}\nTexto: ${text}`
                );
                await interaction.reply({ embeds: [successEmbed] });
            }
            else if (subcommand === 'remove') {
                const index = interaction.options.getInteger('indice');

                await statusManager.removeStatus(index);

                const successEmbed = embedBuilder.success( '✅ Status Removido',
                    `O status no índice ${index} foi removido.`
                );
                await interaction.reply({ embeds: [successEmbed] });
            }
            else if (subcommand === 'list') {
                const statusList = statusManager.statusList;
                let description = '';

                statusList.forEach((status, index) => {
                    description += `${index}. ${status.type}: ${status.text}\n`;
                });

                const listEmbed = embedBuilder.custom({
                    title: '📋 Lista de Status',
                    description: description || 'Nenhum status configurado.',
                    fields: [
                        {
                            name: '📝 Variáveis Disponíveis',
                            value: '`{servers}` - Número de servidores\n`{users}` - Número de usuários\n`{channels}` - Número de canais\n`{uptime}` - Tempo online'
                        }
                    ]
                });

                await interaction.reply({ embeds: [listEmbed] });
            }
        } catch (error) {
            console.error('Erro ao executar comando status:', error);
            const errorEmbed = embedBuilder.error( 'Erro', 'Ocorreu um erro ao gerenciar os status do bot.'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
