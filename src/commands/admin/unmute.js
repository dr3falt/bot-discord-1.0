import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove o silêncio de um usuário')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário a ser desmutado')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) {
            await member.voice.setMute(false);
            await interaction.reply(`${user.tag} foi desmutado.`);
        } else {
            await interaction.reply('Usuário não encontrado.');
        }
    },
};
