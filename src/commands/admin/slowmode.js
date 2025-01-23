import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Define o modo lento em um canal')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('O canal para definir o modo lento')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('segundos')
                .setDescription('O intervalo de modo lento em segundos')
                .setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('canal');
        const seconds = interaction.options.getInteger('segundos');
        if (channel && channel.isText()) {
            await channel.setRateLimitPerUser(seconds);
            await interaction.reply(`Modo lento definido para ${seconds} segundos no canal ${channel}.`);
        } else {
            await interaction.reply('Canal inválido ou não é um canal de texto.');
        }
    },
};
