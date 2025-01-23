import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('Lista todos os usuários banidos do servidor'),
    async execute(interaction) {
        const bans = await interaction.guild.bans.fetch();
        if (bans.size === 0) {
            await interaction.reply('Não há usuários banidos.');
        } else {
            const banList = bans.map(ban => `${ban.user.tag}`).join(', ');
            await interaction.reply(`Usuários banidos: ${banList}`);
        }
    },
};
