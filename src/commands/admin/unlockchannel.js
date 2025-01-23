import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unlockchannel')
        .setDescription('Desbloqueia um canal para todos os membros')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('O canal a ser desbloqueado')
                .setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('canal');
        if (channel && channel.isText()) {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SEND_MESSAGES: true });
            await interaction.reply(`O canal ${channel} foi desbloqueado.`);
        } else {
            await interaction.reply('Canal inválido ou não é um canal de texto.');
        }
    },
};
