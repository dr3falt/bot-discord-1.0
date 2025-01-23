import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Emite um aviso a um usuário')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário a ser avisado')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('O motivo do aviso')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const reason = interaction.options.getString('motivo');
        await interaction.reply(`${user.tag} foi avisado por: ${reason}`);
    },
};
