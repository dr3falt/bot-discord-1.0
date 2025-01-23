import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Desbane um usuário do servidor')
        .addStringOption(option =>
            option.setName('usuário')
                .setDescription('O ID do usuário a ser desbanido')
                .setRequired(true)),
    async execute(interaction) {
        const userId = interaction.options.getString('usuário');
        try {
            await interaction.guild.bans.remove(userId);
            await interaction.reply(`Usuário com ID ${userId} foi desbanido.`);
        } catch (error) {
            await interaction.reply('Erro ao desbanir o usuário. Verifique se o ID está correto.');
        }
    },
};
