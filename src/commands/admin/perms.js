import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';
import embedBuilder from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('perms')
        .setDescription('Gerencia as permissões do bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adiciona permissões a um usuário ou cargo')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de alvo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Usuário', value: 'user' },
                            { name: 'Cargo', value: 'role' }
                        ))
                .addStringOption(option =>
                    option.setName('nivel')
                        .setDescription('Nível de permissão')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Administrador', value: 'admin' },
                            { name: 'Moderador', value: 'mod' },
                            { name: 'Ajudante', value: 'helper' }
                        ))
                .addMentionableOption(option =>
                    option.setName('alvo')
                        .setDescription('Usuário ou cargo para adicionar permissão')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove permissões de um usuário ou cargo')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de alvo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Usuário', value: 'user' },
                            { name: 'Cargo', value: 'role' }
                        ))
                .addMentionableOption(option =>
                    option.setName('alvo')
                        .setDescription('Usuário ou cargo para remover permissão')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            // Verifica se o usuário tem permissão de admin
            const hasPermission = await checkPermissions(interaction.user.id, interaction.guild.id, 'admin');
            if (!hasPermission) {
                const embed = embedBuilder.error('Permissão Negada', 'Você não tem permissão para usar este comando.');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const subcommand = interaction.options.getSubcommand();
            const tipo = interaction.options.getString('tipo');
            const alvo = interaction.options.getMentionable('alvo');
            const nivel = interaction.options.getString('nivel');

            // Verifica se o alvo é válido
            if (tipo === 'user' && !alvo.user) {
                const embed = embedBuilder.error('Erro', 'O alvo selecionado não é um usuário válido.');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            if (tipo === 'role' && !alvo.permissions) {
                const embed = embedBuilder.error('Erro', 'O alvo selecionado não é um cargo válido.');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const targetId = tipo === 'user' ? alvo.user.id : alvo.id;
            let success = false;

            if (subcommand === 'add') {
                success = await checkPermissions.setPermission(interaction.guild.id, targetId, nivel, tipo === 'role');
                if (success) {
                    const embed = embedBuilder.success(
                        'Permissão Adicionada',
                        `${tipo === 'user' ? 'Usuário' : 'Cargo'} ${alvo} agora tem permissão de ${nivel}.`
                    );
                    await interaction.reply({ embeds: [embed] });
                }
            } else if (subcommand === 'remove') {
                success = await checkPermissions.removePermission(interaction.guild.id, targetId, tipo === 'role');
                if (success) {
                    const embed = embedBuilder.success(
                        'Permissão Removida',
                        `Permissões de ${tipo === 'user' ? 'usuário' : 'cargo'} ${alvo} foram removidas.`
                    );
                    await interaction.reply({ embeds: [embed] });
                }
            }

            if (!success) {
                const embed = embedBuilder.error(
                    'Erro',
                    'Ocorreu um erro ao processar o comando. Por favor, tente novamente.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Erro no comando perms:', error);
            const embed = embedBuilder.error(
                'Erro Interno',
                'Ocorreu um erro interno ao processar o comando.'
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
