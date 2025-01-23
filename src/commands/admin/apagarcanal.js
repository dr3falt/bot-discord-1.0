import { SlashCommandBuilder, PermissionFlagsBits, ChannelType  } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('apagarcanal')
        .setDescription('Apaga todos os canais do servidor, exceto os selecionados')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('confirmar')
                .setDescription('Confirme que deseja apagar os canais')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('preservar1')
                .setDescription('Primeiro canal a ser preservado')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('preservar2')
                .setDescription('Segundo canal a ser preservado')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('preservar3')
                .setDescription('Terceiro canal a ser preservado')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const confirmar = interaction.options.getBoolean('confirmar');
            if (!confirmar) {
                return await interaction.reply({
                    content: 'Operação cancelada. Você precisa confirmar a ação para prosseguir.',
                    ephemeral: true
                });
            }

            const guild = interaction.guild;

            // Verifica se o servidor tem recursos de comunidade ativados
            const isCommunityServer = guild.features.includes('COMMUNITY');
            let communityChannels = [];

            if (isCommunityServer) {
                // Obtém os canais de regras e atualizações da comunidade
                const rulesChannelId = guild.rulesChannelId;
                const publicUpdatesChannelId = guild.publicUpdatesChannelId;

                if (rulesChannelId) {
                    const rulesChannel = await guild.channels.fetch(rulesChannelId);
                    if (rulesChannel) communityChannels.push(rulesChannel);
                }
                if (publicUpdatesChannelId) {
                    const updatesChannel = await guild.channels.fetch(publicUpdatesChannelId);
                    if (updatesChannel) communityChannels.push(updatesChannel);
                }
            }

            // Coleta os canais a serem preservados
            const preservar1 = interaction.options.getChannel('preservar1');
            const preservar2 = interaction.options.getChannel('preservar2');
            const preservar3 = interaction.options.getChannel('preservar3');

            const preservedChannels = [preservar1, preservar2, preservar3]
                .filter(channel => channel !== null)
                .concat(communityChannels);

            // Lista de IDs dos canais a serem preservados
            const preservedIds = preservedChannels.map(channel => channel.id);

            // Obtém todos os canais do servidor
            const channels = await guild.channels.fetch();

            // Filtra os canais que podem ser excluídos
            const channelsToDelete = channels.filter(channel => 
                !preservedIds.includes(channel.id) &&
                channel.deletable
            );

            if (channelsToDelete.size === 0) {
                return await interaction.reply({
                    content: 'Não há canais que possam ser excluídos.',
                    ephemeral: true
                });
            }

            // Responde à interação antes de começar a excluir os canais
            await interaction.reply({
                content: `Iniciando a exclusão de ${channelsToDelete.size} canais...`,
                ephemeral: true
            });

            // Contador de canais excluídos
            let deletedCount = 0;
            let failedCount = 0;

            // Exclui os canais
            for (const [id, channel] of channelsToDelete) {
                try {
                    await channel.delete();
                    deletedCount++;

                    // Registra no log
                    await logger.sendLog(interaction.client, {
                        title: '🗑️ Canal Excluído',
                        description: `Canal "${channel.name}" foi excluído por ${interaction.user.tag}`,
                        fields: [
                            { name: 'ID do Canal', value: channel.id, inline: true },
                            { name: 'Tipo', value: channel.type, inline: true }
                        ],
                        color: 0xFF0000
                    });
                } catch (error) {
                    console.error(`Erro ao excluir canal ${channel.name}:`, error);
                    failedCount++;
                }
            }

            // Atualiza a mensagem com o resultado
            const resultMessage = [
                `✅ ${deletedCount} canais foram excluídos com sucesso.`
            ];

            if (failedCount > 0) {
                resultMessage.push(`❌ ${failedCount} canais não puderam ser excluídos.`);
            }

            if (preservedChannels.length > 0) {
                resultMessage.push('\n📌 Canais preservados:');
                preservedChannels.forEach(channel => {
                    resultMessage.push(`- ${channel.name}`);
                });
            }

            await interaction.followUp({
                content: resultMessage.join('\n'),
                ephemeral: true
            });

        } catch (error) {
            console.error('Erro ao executar comando apagarcanal:', error);
            await interaction.reply({
                content: 'Ocorreu um erro ao tentar apagar os canais.',
                ephemeral: true
            });
        }
    }
};
