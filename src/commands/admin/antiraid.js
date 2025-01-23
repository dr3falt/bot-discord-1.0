import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';
import embedBuilder from '../../utils/embedBuilder.js';

const db = new JsonDatabase(path.join(__dirname, '../../database/protection.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Configura o sistema anti-raid')
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Ativa ou desativa o sistema anti-raid'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('joinlimit')
                .setDescription('Define o limite de entradas em um período')
                .addIntegerOption(option =>
                    option.setName('quantidade')
                        .setDescription('Número máximo de entradas (5-50)')
                        .setRequired(true)
                        .setMinValue(5)
                        .setMaxValue(50))
                .addIntegerOption(option =>
                    option.setName('tempo')
                        .setDescription('Período em segundos (10-300)')
                        .setRequired(true)
                        .setMinValue(10)
                        .setMaxValue(300)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('action')
                .setDescription('Define a ação a ser tomada')
                .addStringOption(option =>
                    option.setName('acao')
                        .setDescription('Ação quando detectar raid')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Kick - Expulsar membros', value: 'kick' },
                            { name: 'Ban - Banir membros', value: 'ban' },
                            { name: 'Timeout - Silenciar membros', value: 'timeout' },
                            { name: 'Verificação - Requer verificação', value: 'verify' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Gerencia a whitelist do anti-raid')
                .addStringOption(option =>
                    option.setName('operacao')
                        .setDescription('Adicionar ou remover da whitelist')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover', value: 'remove' },
                            { name: 'Listar', value: 'list' }
                        ))
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para adicionar/remover da whitelist')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Mostra a configuração atual do anti-raid')),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id,
                interaction.guild.id, 'admin',
                interaction.member
            );

            if (!hasPermission) {
                const errorEmbed = embedBuilder.error( 'Sem Permissão', 'Você precisa ser um administrador para usar este comando.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;

            // Carrega ou inicializa configuração
            let config = await db.read() || {};
            if (!config[guildId]) {
                config[guildId] = {
                    antiRaid: {
                        enabled: false,
                        joinLimit: 10,
                        timeWindow: 30,
                        action: 'kick',
                        whitelist: []
                    }
                };
            }

            switch (subcommand) {
                case 'toggle':
                    config[guildId].antiRaid.enabled = !config[guildId].antiRaid.enabled;
                    await db.write(config);

                    const toggleEmbed = embedBuilder.success( 'Anti-Raid Atualizado',
                        `Sistema anti-raid foi ${config[guildId].antiRaid.enabled ? 'ativado' : 'desativado'}`
                    );
                    await interaction.reply({ embeds: [toggleEmbed] });
                    break;

                case 'joinlimit':
                    const amount = interaction.options.getInteger('quantidade');
                    const time = interaction.options.getInteger('tempo');

                    config[guildId].antiRaid.joinLimit = amount;
                    config[guildId].antiRaid.timeWindow = time;
                    await db.write(config);

                    const limitEmbed = embedBuilder.success( 'Limite Atualizado',
                        `Novo limite: ${amount} entradas em ${time} segundos`
                    );
                    await interaction.reply({ embeds: [limitEmbed] });
                    break;

                case 'action':
                    const action = interaction.options.getString('acao');
                    config[guildId].antiRaid.action = action;
                    await db.write(config);

                    const actionMap = {
                        kick: 'Expulsar',
                        ban: 'Banir',
                        timeout: 'Silenciar',
                        verify: 'Verificação'
                    };

                    const actionEmbed = embedBuilder.success( 'Ação Atualizada',
                        `Nova ação: ${actionMap[action] || action}`
                    );
                    await interaction.reply({ embeds: [actionEmbed] });
                    break;

                case 'whitelist':
                    const operation = interaction.options.getString('operacao');
                    const target = interaction.options.getUser('usuario');

                    if (operation === 'list') {
                        const whitelist = config[guildId].antiRaid.whitelist;
                        const whitelistEmbed = embedBuilder.custom({
                            title: 'Whitelist do Anti-Raid',
                            description: whitelist.length > 0
                                ? whitelist.map(id => `<@${id}>`).join('\n')
                                : 'Nenhum usuário na whitelist.',
                            color: 0x00FF00
                        });
                        await interaction.reply({ embeds: [whitelistEmbed] });
                        break;
                    }

                    if (!target) {
                        const errorEmbed = embedBuilder.error( 'Erro', 'Você precisa especificar um usuário para adicionar/remover da whitelist.'
                        );
                        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    }

                    if (operation === 'add') {
                        if (!config[guildId].antiRaid.whitelist.includes(target.id)) {
                            config[guildId].antiRaid.whitelist.push(target.id);
                            await db.write(config);

                            const addEmbed = embedBuilder.success( 'Whitelist Atualizada',
                                `${target.tag} foi adicionado à whitelist`
                            );
                            await interaction.reply({ embeds: [addEmbed] });
                        } else {
                            const errorEmbed = embedBuilder.error( 'Erro', 'Este usuário já está na whitelist'
                            );
                            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                        }
                    } else if (operation === 'remove') {
                        const index = config[guildId].antiRaid.whitelist.indexOf(target.id);
                        if (index > -1) {
                            config[guildId].antiRaid.whitelist.splice(index, 1);
                            await db.write(config);

                            const removeEmbed = embedBuilder.success( 'Whitelist Atualizada',
                                `${target.tag} foi removido da whitelist`
                            );
                            await interaction.reply({ embeds: [removeEmbed] });
                        } else {
                            const errorEmbed = embedBuilder.error( 'Erro', 'Este usuário não está na whitelist'
                            );
                            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                        }
                    }
                    break;

                case 'config':
                    const settings = config[guildId].antiRaid;
                    const configEmbed = embedBuilder.custom({
                        title: 'Configuração do Anti-Raid',
                        fields: [
                            {
                                name: 'Status',
                                value: settings.enabled ? '✅ Ativado' : '❌ Desativado',
                                inline: true
                            },
                            {
                                name: 'Limite',
                                value: `${settings.joinLimit} entradas em ${settings.timeWindow}s`,
                                inline: true
                            },
                            {
                                name: 'Ação',
                                value: {
                                    kick: 'Expulsar',
                                    ban: 'Banir',
                                    timeout: 'Silenciar',
                                    verify: 'Verificação'
                                }[settings.action],
                                inline: true
                            },
                            {
                                name: 'Whitelist',
                                value: settings.whitelist.length > 0
                                    ? settings.whitelist.map(id => `<@${id}>`).join('\n')
                                    : 'Nenhum usuário',
                                inline: false
                            }
                        ],
                        color: settings.enabled ? 0x00FF00 : 0xFF0000
                    });
                    await interaction.reply({ embeds: [configEmbed] });
                    break;
            }

        } catch (error) {
            console.error('❌ Erro ao executar comando antiraid:', error);
            const errorEmbed = embedBuilder.error( 'Erro', 'Ocorreu um erro ao executar o comando'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
