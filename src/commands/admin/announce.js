import { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Faz um anúncio em um canal específico')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('O canal onde o anúncio será feito')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option =>
            option.setName('título')
                .setDescription('O título do anúncio')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('cor')
                .setDescription('A cor do anúncio (em hexadecimal)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('mention')
                .setDescription('Mencionar @everyone?')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id,
                interaction.guild.id,
                'admin',
                interaction.member
            );

            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ Você não tem permissão para usar este comando.',
                    ephemeral: true
                });
            }

            const channel = interaction.options.getChannel('canal');
            const title = interaction.options.getString('título') || 'Anúncio';
            const color = interaction.options.getString('cor') || '#2F3136';
            const mention = interaction.options.getBoolean('mention') || false;

            // Verifica se o canal é válido
            if (!channel || channel.type !== ChannelType.GuildText) {
                return await interaction.reply({
                    content: '❌ Canal inválido ou não é um canal de texto.',
                    ephemeral: true
                });
            }

            // Cria o modal para o conteúdo do anúncio
            const modal = new ModalBuilder()
                .setCustomId('announceModal')
                .setTitle('Criar Anúncio');

            const contentInput = new TextInputBuilder()
                .setCustomId('content')
                .setLabel('Conteúdo do Anúncio')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Digite o conteúdo do seu anúncio aqui...')
                .setMaxLength(4000);

            const firstActionRow = new ActionRowBuilder().addComponents(contentInput);
            modal.addComponents(firstActionRow);

            // Armazena os dados do anúncio para usar quando o modal for submetido
            interaction.client.announceData = {
                channelId: channel.id,
                title,
                color,
                mention
            };

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Erro no comando announce:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                ephemeral: true
            });
        }
    },

    async handleModalSubmit(interaction) {
        try {
            const { channelId, title, color, mention } = interaction.client.announceData;
            const content = interaction.fields.getTextInputValue('content');
            const channel = interaction.guild.channels.cache.get(channelId);

            if (!channel) {
                return await interaction.reply({
                    content: '❌ Canal não encontrado.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(content)
                .setColor(color)
                .setTimestamp()
                .setFooter({
                    text: `Anunciado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('deleteAnnounce')
                        .setLabel('🗑️ Deletar')
                        .setStyle(ButtonStyle.Danger)
                );

            const mentionText = mention ? '@everyone' : '';
            await channel.send({ content: mentionText, embeds: [embed], components: [row] });

            await interaction.reply({
                content: `✅ Anúncio enviado com sucesso em ${channel}!`,
                ephemeral: true
            });

            // Limpa os dados armazenados
            delete interaction.client.announceData;
        } catch (error) {
            console.error('Erro ao enviar anúncio:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao enviar o anúncio.',
                ephemeral: true
            });
        }
    }
};
