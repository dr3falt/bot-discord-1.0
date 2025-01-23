import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Coloca um usuário em timeout')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('O usuário para dar timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('minutos')
                .setDescription('Duração do timeout em minutos')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)) // 4 semanas em minutos
        .addStringOption(option =>
            option.setName('razao')
                .setDescription('Razão do timeout')
                .setRequired(false)),

    async execute(interaction) {
        // Verificar permissões
        if (!(await checkPermissions(interaction.user.id, interaction.guild.id, 'mod'))) {
            return await interaction.reply({
                content: 'Você precisa ser um moderador para usar este comando.',
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('usuario');
        const minutes = interaction.options.getInteger('minutos');
        const reason = interaction.options.getString('razao') || 'Nenhuma razão fornecida';
        const member = await interaction.guild.members.fetch(targetUser.id);

        // Verificar se o usuário pode receber timeout
        if (!member.moderatable) {
            return await interaction.reply({
                content: 'Não posso dar timeout neste usuário. Ele pode ter permissões mais altas que eu.',
                ephemeral: true
            });
        }

        try {
            await member.timeout(minutes * 60 * 1000, reason);
            await interaction.reply({
                content: `${targetUser.tag} recebeu timeout por ${minutes} minutos.\nRazão: ${reason}`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'Houve um erro ao tentar dar timeout no usuário.',
                ephemeral: true
            });
        }
    },
};
