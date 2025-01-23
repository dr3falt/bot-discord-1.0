import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import permissionManager from '../../utils/permissionManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setperms')
        .setDescription('Gerencia permissões de comandos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Gerencia permissões de um usuário')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('O usuário para gerenciar permissões')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('acao')
                        .setDescription('Ação a ser realizada')
                        .setRequired(true)
                        .addChoices(
                            { name: '👑 Adicionar Permissões', value: 'add' },
                            { name: '❌ Remover Permissões', value: 'remove' },
                            { name: '📋 Listar Permissões', value: 'list' }
                        ))
                .addStringOption(option =>
                    option.setName('comandos')
                        .setDescription('Comandos (separados por vírgula) ou * para todos')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Gerencia permissões de um cargo')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('O cargo para gerenciar permissões')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('acao')
                        .setDescription('Ação a ser realizada')
                        .setRequired(true)
                        .addChoices(
                            { name: '👑 Adicionar Permissões', value: 'add' },
                            { name: '❌ Remover Permissões', value: 'remove' },
                            { name: '📋 Listar Permissões', value: 'list' }
                        ))
                .addStringOption(option =>
                    option.setName('comandos')
                        .setDescription('Comandos (separados por vírgula) ou * para todos')
                        .setRequired(false))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const action = interaction.options.getString('acao');
            const commandsStr = interaction.options.getString('comandos');

            // Inicializa o sistema de permissões
            await permissionManager.initialize();

            if (action === 'list') {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📋 Lista de Permissões')
                    .setTimestamp();

                if (subcommand === 'user') {
                    const user = interaction.options.getUser('usuario');
                    const perms = await permissionManager.getUserPermissions(user.id);
                    embed.setDescription(`Permissões do usuário ${user.tag}`);
                    embed.addFields({
                        name: 'Comandos Permitidos',
                        value: perms.commands.length > 0 ? perms.commands.join(', ') : 'Nenhum comando permitido'
                    });
                } else {
                    const role = interaction.options.getRole('cargo');
                    const perms = await permissionManager.getRolePermissions(role.id);
                    embed.setDescription(`Permissões do cargo ${role.name}`);
                    embed.addFields({
                        name: 'Comandos Permitidos',
                        value: perms.commands.length > 0 ? perms.commands.join(', ') : 'Nenhum comando permitido'
                    });
                }

                await interaction.reply({ embeds: [embed], flags: ['Ephemeral'] });
                return;
            }

            // Para ações add e remove, precisamos dos comandos
            if (!commandsStr) {
                await interaction.reply({
                    content: '❌ Você precisa especificar os comandos para adicionar ou remover permissões.',
                    flags: ['Ephemeral']
                });
                return;
            }

            const commands = commandsStr.split(',').map(cmd => cmd.trim());

            if (subcommand === 'user') {
                const user = interaction.options.getUser('usuario');
                if (action === 'add') {
                    await permissionManager.setUserPermissions(user.id, commands);
                    await interaction.reply({
                        content: `✅ Permissões adicionadas para ${user.tag}: ${commands.join(', ')}`,
                        flags: ['Ephemeral']
                    });
                } else {
                    await permissionManager.removeUserPermissions(user.id, commands);
                    await interaction.reply({
                        content: `✅ Permissões removidas de ${user.tag}: ${commands.join(', ')}`,
                        flags: ['Ephemeral']
                    });
                }
            } else {
                const role = interaction.options.getRole('cargo');
                if (action === 'add') {
                    await permissionManager.setRolePermissions(role.id, commands);
                    await interaction.reply({
                        content: `✅ Permissões adicionadas para o cargo ${role.name}: ${commands.join(', ')}`,
                        flags: ['Ephemeral']
                    });
                } else {
                    await permissionManager.removeRolePermissions(role.id, commands);
                    await interaction.reply({
                        content: `✅ Permissões removidas do cargo ${role.name}: ${commands.join(', ')}`,
                        flags: ['Ephemeral']
                    });
                }
            }

        } catch (error) {
            console.error('Erro ao executar comando setperms:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                flags: ['Ephemeral']
            });
        }
    }
};
