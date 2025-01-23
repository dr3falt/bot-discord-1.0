import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import embedBuilder from '../../utils/embedBuilder.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';

// Banco de dados para logs de moderação
const logsDb = new JsonDatabase(path.join(__dirname, '../../database/modlogs.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpa mensagens do canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('Número de mensagens para deletar (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Deletar apenas mensagens deste usuário')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('silencioso')
                .setDescription('Se verdadeiro, apenas você verá a mensagem de confirmação')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const amount = interaction.options.getInteger('quantidade');
            const user = interaction.options.getUser('usuario');
            const silent = interaction.options.getBoolean('silencioso') || false;

            // Busca as mensagens
            const messages = await interaction.channel.messages.fetch({ 
                limit: amount 
            });

            // Filtra mensagens por usuário se especificado
            let messagesToDelete = messages;
            if (user) {
                messagesToDelete = messages.filter(msg => msg.author.id === user.id);
            }

            // Verifica se há mensagens para deletar
            if (messagesToDelete.size === 0) {
                const noMessagesEmbed = embedBuilder.warning( 'Aviso',
                    user 
                        ? `Não encontrei mensagens de ${user.tag} para deletar.`
                        : 'Não encontrei mensagens para deletar.'
                );
                return await interaction.reply({ embeds: [noMessagesEmbed], ephemeral: true });
            }

            // Deleta as mensagens
            const deleted = await interaction.channel.bulkDelete(messagesToDelete, true)
                .catch(error => {
                    if (error.code === 50034) { // Mensagem muito antiga
                        throw new Error('MESSAGES_TOO_OLD');
                    }
                    throw error;
                });

            // Registra a ação nos logs
            const logs = await logsDb.read() || {};
            if (!logs[interaction.guild.id]) logs[interaction.guild.id] = [];
            
            logs[interaction.guild.id].push({
                type: 'clear',
                channelId: interaction.channel.id,
                moderatorId: interaction.user.id,
                messagesDeleted: deleted.size,
                targetUserId: user?.id,
                date: new Date().toISOString()
            });

            await logsDb.write(logs);

            // Cria o embed de confirmação
            const clearEmbed = embedBuilder.custom({
                title: '🧹 Mensagens Deletadas',
                fields: [
                    { 
                        name: '📝 Quantidade', 
                        value: `${deleted.size} mensagens`, 
                        inline: true 
                    },
                    { 
                        name: '🛡️ Moderador', 
                        value: interaction.user.tag, 
                        inline: true 
                    }
                ],
                color: '#00FF00'
            });

            // Adiciona campo de usuário se especificado
            if (user) {
                clearEmbed.addFields({
                    name: '👤 Usuário Filtrado',
                    value: user.tag,
                    inline: true
                });
            }

            // Responde à interação
            await interaction.reply({ 
                embeds: [clearEmbed], 
                ephemeral: silent 
            });

            // Se não for silencioso, deleta a mensagem de confirmação após 5 segundos
            if (!silent) {
                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 5000);
            }

        } catch (error) {
            console.error('Erro ao limpar mensagens:', error);

            let errorMessage = 'Ocorreu um erro ao tentar limpar as mensagens.';
            if (error.message === 'MESSAGES_TOO_OLD') {
                errorMessage = 'Não posso deletar mensagens mais antigas que 14 dias.';
            }

            const errorEmbed = embedBuilder.error('Erro', errorMessage);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
