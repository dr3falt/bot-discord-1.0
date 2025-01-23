import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import permissionManager from '../../utils/permissionManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setperm')
        .setDescription('Sistema de permissões do bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('geral')
                .setDescription('Define permissão geral para cargo ou membro')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de alvo')
                        .setRequired(true)
                        .addChoices(
                            { name: '👤 Usuário', value: 'user' },
                            { name: '🏷️ Cargo', value: 'role' }
                        ))
                .addMentionableOption(option =>
                    option.setName('alvo')
                        .setDescription('Usuário ou cargo para dar permissão')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ver')
                .setDescription('Mostra as permissões de um cargo ou usuário')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de alvo')
                        .setRequired(true)
                        .addChoices(
                            { name: '👤 Usuário', value: 'user' },
                            { name: '🏷️ Cargo', value: 'role' }
                        ))
                .addMentionableOption(option =>
                    option.setName('alvo')
                        .setDescription('Usuário ou cargo para verificar')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const tipo = interaction.options.getString('tipo');
            const alvo = interaction.options.getMentionable('alvo');

            // Inicializa o sistema de permissões
            await permissionManager.initialize();

            if (subcommand === 'geral') {
                if (tipo === 'user') {
                    // Dá permissão geral para o usuário
                    await permissionManager.setUserPermissions(alvo.id, ['*']);
                    await interaction.reply({
                        content: `✅ Permissão geral concedida para ${alvo}`,
                        flags: ['Ephemeral']
                    });
                } else {
                    // Dá permissão geral para o cargo
                    await permissionManager.setRolePermissions(alvo.id, ['*']);
                    await interaction.reply({
                        content: `✅ Permissão geral concedida para o cargo ${alvo.name}`,
                        flags: ['Ephemeral']
                    });
                }
            } else if (subcommand === 'ver') {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📋 Permissões')
                    .setTimestamp();

                if (tipo === 'user') {
                    const perms = await permissionManager.getUserPermissions(alvo.id);
                    embed.setDescription(`Permissões do usuário ${alvo}`);
                    
                    // Verifica se tem permissão geral
                    const temPermGeral = perms.commands.includes('*');
                    
                    embed.addFields(
                        { 
                            name: 'Status', 
                            value: temPermGeral ? '✅ Tem permissão geral' : '❌ Não tem permissão geral'
                        }
                    );

                    if (!temPermGeral && perms.commands.length > 0) {
                        embed.addFields({
                            name: 'Comandos Permitidos',
                            value: perms.commands.join(', ')
                        });
                    }
                } else {
                    const perms = await permissionManager.getRolePermissions(alvo.id);
                    embed.setDescription(`Permissões do cargo ${alvo.name}`);
                    
                    // Verifica se tem permissão geral
                    const temPermGeral = perms.commands.includes('*');
                    
                    embed.addFields(
                        { 
                            name: 'Status', 
                            value: temPermGeral ? '✅ Tem permissão geral' : '❌ Não tem permissão geral'
                        }
                    );

                    if (!temPermGeral && perms.commands.length > 0) {
                        embed.addFields({
                            name: 'Comandos Permitidos',
                            value: perms.commands.join(', ')
                        });
                    }
                }

                await interaction.reply({
                    embeds: [embed],
                    flags: ['Ephemeral']
                });
            }
        } catch (error) {
            console.error('Erro ao executar comando setperm:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                flags: ['Ephemeral']
            });
        }
    }
};
