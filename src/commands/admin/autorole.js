import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, PermissionFlagsBits  } from 'discord.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';
const configDb = new JsonDatabase(path.join(__dirname, '../../database/config.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Configura o cargo automático para novos membros')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('configurar')
                .setDescription('Configura o cargo automático')
                .addRoleOption(option =>
                    option
                        .setName('cargo')
                        .setDescription('O cargo que será dado automaticamente')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover_cargo')
                .setDescription('Remove o cargo automático de todos os membros que o possuem')
                .addRoleOption(option =>
                    option
                        .setName('cargo')
                        .setDescription('O cargo para remover (deixe vazio para usar o cargo configurado)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Mostra o status atual do autorole')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Ativa ou desativa o autorole')
                .addBooleanOption(option =>
                    option
                        .setName('ativar')
                        .setDescription('Ativar ou desativar o autorole')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const config = await configDb.read();
            
            if (!config[interaction.guildId]) {
                config[interaction.guildId] = {};
            }

            if (!config[interaction.guildId].autorole) {
                config[interaction.guildId].autorole = {
                    enabled: false,
                    roleId: null
                };
            }

            switch (subcommand) {
                case 'configurar': {
                    const role = interaction.options.getRole('cargo');
                    
                    // Verifica se o bot pode gerenciar o cargo
                    const botMember = await interaction.guild.members.fetchMe();
                    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                        return await interaction.reply({
                            content: '❌ Eu não tenho permissão para gerenciar cargos neste servidor.',
                            ephemeral: true
                        });
                    }

                    if (role.position >= botMember.roles.highest.position) {
                        return await interaction.reply({
                            content: '❌ Não posso gerenciar este cargo pois ele está acima do meu cargo mais alto.',
                            ephemeral: true
                        });
                    }

                    config[interaction.guildId].autorole = {
                        enabled: true,
                        roleId: role.id
                    };

                    await configDb.write(config);
                    console.log('Autorole configurado:', {
                        guild: interaction.guildId,
                        role: role.id,
                        roleName: role.name
                    });

                    await interaction.reply({
                        content: `✅ Autorole configurado! O cargo ${role} será dado automaticamente aos novos membros.`,
                        ephemeral: true
                    });
                    break;
                }

                case 'toggle': {
                    const ativar = interaction.options.getBoolean('ativar');
                    
                    if (!config[interaction.guildId].autorole.roleId) {
                        return await interaction.reply({
                            content: '❌ Configure primeiro um cargo usando `/autorole configurar` antes de ativar/desativar.',
                            ephemeral: true
                        });
                    }

                    config[interaction.guildId].autorole.enabled = ativar;
                    await configDb.write(config);

                    const role = await interaction.guild.roles.fetch(config[interaction.guildId].autorole.roleId);
                    const roleMention = role ? role.toString() : 'cargo configurado';

                    await interaction.reply({
                        content: ativar 
                            ? `✅ Autorole ativado! O ${roleMention} será dado automaticamente aos novos membros.`
                            : `✅ Autorole desativado! O ${roleMention} não será mais dado automaticamente.`,
                        ephemeral: true
                    });
                    break;
                }

                case 'remover_cargo': {
                    // Verifica se o bot tem permissão para gerenciar cargos
                    const botMember = await interaction.guild.members.fetchMe();
                    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                        return await interaction.reply({
                            content: '❌ Eu não tenho permissão para gerenciar cargos neste servidor.',
                            ephemeral: true
                        });
                    }

                    // Pega o cargo especificado ou usa o cargo configurado
                    const roleOption = interaction.options.getRole('cargo');
                    let role;

                    if (roleOption) {
                        role = roleOption;
                    } else if (config[interaction.guildId].autorole.roleId) {
                        role = await interaction.guild.roles.fetch(config[interaction.guildId].autorole.roleId);
                    } else {
                        return await interaction.reply({
                            content: '❌ Nenhum cargo especificado ou configurado.',
                            ephemeral: true
                        });
                    }

                    if (!role) {
                        return await interaction.reply({
                            content: '❌ Cargo não encontrado.',
                            ephemeral: true
                        });
                    }

                    if (role.position >= botMember.roles.highest.position) {
                        return await interaction.reply({
                            content: '❌ Não posso gerenciar este cargo pois ele está acima do meu cargo mais alto.',
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({ ephemeral: true });

                    try {
                        // Obtém todos os membros com o cargo
                        const membersWithRole = role.members;
                        let removedCount = 0;

                        // Remove o cargo de cada membro
                        for (const [memberId, member] of membersWithRole) {
                            try {
                                await member.roles.remove(role);
                                removedCount++;
                            } catch (error) {
                                console.error(`Erro ao remover cargo de ${memberId}:`, error);
                            }
                        }

                        await interaction.editReply({
                            content: `✅ Cargo ${role} removido de ${removedCount} membros.`,
                        });

                    } catch (error) {
                        console.error('Erro ao remover cargos:', error);
                        await interaction.editReply({
                            content: '❌ Ocorreu um erro ao remover os cargos.',
                        });
                    }
                    break;
                }

                case 'status': {
                    const autorole = config[interaction.guildId].autorole;
                    let message = '';

                    if (autorole.roleId) {
                        const role = await interaction.guild.roles.fetch(autorole.roleId).catch(() => null);
                        if (role) {
                            message = `📊 Status do Autorole:\n` +
                                    `▫️ Status: ${autorole.enabled ? '✅ Ativado' : '❌ Desativado'}\n` +
                                    `▫️ Cargo: ${role}\n\n` +
                                    `ℹ️ Use \`/autorole toggle\` para ativar/desativar`;
                        } else {
                            message = '❌ O cargo configurado não foi encontrado. Por favor, configure novamente usando `/autorole configurar`.';
                        }
                    } else {
                        message = '❌ Nenhum cargo configurado. Use `/autorole configurar` para configurar um cargo.';
                    }

                    await interaction.reply({
                        content: message,
                        ephemeral: true
                    });
                    break;
                }
            }

        } catch (error) {
            console.error('Erro ao executar comando autorole:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                ephemeral: true
            }).catch(() => {});
        }
    }
};
