import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('Remove um cargo de um usuário')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário para remover o cargo')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('cargo')
                .setDescription('O cargo a ser removido')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const role = interaction.options.getRole('cargo');
        const member = interaction.guild.members.cache.get(user.id);
        if (member) {
            await member.roles.remove(role);
            await interaction.reply(`Cargo ${role.name} removido de ${user.tag}.`);
        } else {
            await interaction.reply('Usuário não encontrado.');
        }
    },
};
