import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Silencia um usuário em todos os canais')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário a ser silenciado')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) {
            await member.voice.setMute(true);
            await interaction.reply(`${user.tag} foi silenciado.`);
        } else {
            await interaction.reply('Usuário não encontrado.');
        }
    },
};
