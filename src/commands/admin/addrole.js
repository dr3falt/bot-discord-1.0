import { SlashCommandBuilder } from 'discord.js';

const command = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Adiciona um cargo a um usuário')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário para adicionar o cargo')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('cargo')
                .setDescription('O cargo a ser adicionado')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const role = interaction.options.getRole('cargo');
        const member = interaction.guild.members.cache.get(user.id);
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        const botHighestRole = botMember.roles.highest;
        const ownerId = process.env.OWNER_ID;

        if (role.position >= botHighestRole.position) {
            return await interaction.reply(`Não posso adicionar o cargo ${role.name} porque ele é igual ou superior ao meu cargo mais alto.`);
        }

        if (interaction.user.id === ownerId) {
            await member.roles.add(role);
            return await interaction.reply(`Cargo ${role.name} adicionado a ${user.tag}.`);
        }

        if (member) {
            await member.roles.add(role);
            await interaction.reply(`Cargo ${role.name} adicionado a ${user.tag}.`);
        } else {
            await interaction.reply('Usuário não encontrado.');
        }
    },
};

export default command;
