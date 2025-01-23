import { SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Faz o bot dizer uma mensagem')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('mensagem')
                .setDescription('A mensagem que será enviada')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal onde a mensagem será enviada (opcional)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)),

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
                    flags: ['Ephemeral']
                });
            }

            // Se não for especificado um canal, usa o canal atual
            const channel = interaction.options.getChannel('canal') || interaction.channel;
            const message = interaction.options.getString('mensagem');

            // Verifica se o bot tem permissão para enviar mensagens no canal
            if (!channel.permissionsFor(interaction.client.user).has('SendMessages')) {
                return await interaction.reply({
                    content: '❌ Não tenho permissão para enviar mensagens neste canal.',
                    flags: ['Ephemeral']
                });
            }

            // Envia a mensagem
            await channel.send(message);

            // Confirma o envio
            await interaction.reply({
                content: `✅ Mensagem enviada com sucesso em ${channel}!`,
                flags: ['Ephemeral']
            });

        } catch (error) {
            console.error('Erro ao executar comando say:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao enviar a mensagem.',
                flags: ['Ephemeral']
            }).catch(() => {});
        }
    }
};
