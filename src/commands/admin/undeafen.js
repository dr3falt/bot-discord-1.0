import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('undeafen')
        .setDescription('Desensurdece um usuário em um canal de voz')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário a ser desensurdecido')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const member = interaction.guild.members.cache.get(user.id);
        if (member && member.voice.channel) {
            await member.voice.setDeaf(false);
            await interaction.reply(`${user.tag} foi desensurdecido.`);
        } else {
            await interaction.reply('Usuário não encontrado ou não está em um canal de voz.');
        }
    },
};
