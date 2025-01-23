import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('deafen')
        .setDescription('Ensurdece um usuário em um canal de voz')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário a ser ensurdecido')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const member = interaction.guild.members.cache.get(user.id);
        if (member && member.voice.channel) {
            await member.voice.setDeaf(true);
            await interaction.reply(`${user.tag} foi ensurdecido.`);
        } else {
            await interaction.reply('Usuário não encontrado ou não está em um canal de voz.');
        }
    },
};
