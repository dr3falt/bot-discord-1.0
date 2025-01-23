import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, PermissionFlagsBits  } from 'discord.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';
import embedBuilder from '../../utils/embedBuilder.js';

const db = new JsonDatabase(path.join(__dirname, '../../database/protection.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('antilink')
        .setDescription('Configura o sistema anti-link')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Ativa ou desativa o sistema anti-link'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Adiciona ou remove um canal da whitelist')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('O canal para adicionar/remover da whitelist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('permitir')
                .setDescription('Permite que um usuário envie links')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('O usuário que poderá enviar links')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover')
                .setDescription('Remove a permissão de um usuário enviar links')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('O usuário que não poderá mais enviar links')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lista')
                .setDescription('Mostra a lista de canais e usuários permitidos')),

    async execute(interaction) {
        try {
            // Verifica permissões
            if (!(await checkPermissions(interaction.user.id, interaction.guild.id, 'admin'))) {
                const errorEmbed = embedBuilder.error( 'Sem Permissão', 'Você precisa ser um administrador para usar este comando.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Lê ou inicializa as configurações
            let protection = await db.read() || {};
            const guildId = interaction.guild.id;

            // Inicializa a estrutura se não existir
            if (!protection[guildId]) {
                protection[guildId] = {
                    antiLink: {
                        enabled: false,
                        whitelistedChannels: [],
                        whitelistedUsers: [],
                        lastModified: new Date().toISOString(),
                        modifiedBy: interaction.user.id
                    }
                };
            }

            if (!protection[guildId].antiLink) {
                protection[guildId].antiLink = {
                    enabled: false,
                    whitelistedChannels: [],
                    whitelistedUsers: [],
                    lastModified: new Date().toISOString(),
                    modifiedBy: interaction.user.id
                };
            }

            // Garante que os arrays existam
            if (!Array.isArray(protection[guildId].antiLink.whitelistedChannels)) {
                protection[guildId].antiLink.whitelistedChannels = [];
            }
            if (!Array.isArray(protection[guildId].antiLink.whitelistedUsers)) {
                protection[guildId].antiLink.whitelistedUsers = [];
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'toggle') {
                protection[guildId].antiLink.enabled = !protection[guildId].antiLink.enabled;
                protection[guildId].antiLink.lastModified = new Date().toISOString();
                protection[guildId].antiLink.modifiedBy = interaction.user.id;
                
                await db.write(protection);

                const statusEmbed = embedBuilder.success( 'Anti-Link Atualizado',
                    `O sistema anti-link foi ${protection[guildId].antiLink.enabled ? 'ativado' : 'desativado'}.`
                );
                return await interaction.reply({ embeds: [statusEmbed] });
            }

            if (subcommand === 'whitelist') {
                const channel = interaction.options.getChannel('canal');
                const channelId = channel.id;
                const whitelistedChannels = protection[guildId].antiLink.whitelistedChannels;

                if (whitelistedChannels.includes(channelId)) {
                    protection[guildId].antiLink.whitelistedChannels = whitelistedChannels.filter(id => id !== channelId);
                    protection[guildId].antiLink.lastModified = new Date().toISOString();
                    protection[guildId].antiLink.modifiedBy = interaction.user.id;
                    await db.write(protection);

                    const removeEmbed = embedBuilder.success( 'Canal Removido',
                        `O canal ${channel} foi removido da whitelist do anti-link.`
                    );
                    return await interaction.reply({ embeds: [removeEmbed] });
                } else {
                    protection[guildId].antiLink.whitelistedChannels.push(channelId);
                    protection[guildId].antiLink.lastModified = new Date().toISOString();
                    protection[guildId].antiLink.modifiedBy = interaction.user.id;
                    await db.write(protection);

                    const addEmbed = embedBuilder.success( 'Canal Adicionado',
                        `O canal ${channel} foi adicionado à whitelist do anti-link.`
                    );
                    return await interaction.reply({ embeds: [addEmbed] });
                }
            }

            if (subcommand === 'permitir') {
                const user = interaction.options.getUser('usuario');
                const userId = user.id;
                const whitelistedUsers = protection[guildId].antiLink.whitelistedUsers;

                if (whitelistedUsers.includes(userId)) {
                    const alreadyEmbed = embedBuilder.warning( 'Usuário já Permitido',
                        `${user} já pode enviar links.`
                    );
                    return await interaction.reply({ embeds: [alreadyEmbed] });
                }

                protection[guildId].antiLink.whitelistedUsers.push(userId);
                protection[guildId].antiLink.lastModified = new Date().toISOString();
                protection[guildId].antiLink.modifiedBy = interaction.user.id;
                await db.write(protection);

                const addEmbed = embedBuilder.success( 'Usuário Permitido',
                    `${user} agora pode enviar links.`
                );
                return await interaction.reply({ embeds: [addEmbed] });
            }

            if (subcommand === 'remover') {
                const user = interaction.options.getUser('usuario');
                const userId = user.id;
                const whitelistedUsers = protection[guildId].antiLink.whitelistedUsers;

                if (!whitelistedUsers.includes(userId)) {
                    const notFoundEmbed = embedBuilder.warning( 'Usuário não Encontrado',
                        `${user} não estava na lista de usuários permitidos.`
                    );
                    return await interaction.reply({ embeds: [notFoundEmbed] });
                }

                protection[guildId].antiLink.whitelistedUsers = whitelistedUsers.filter(id => id !== userId);
                protection[guildId].antiLink.lastModified = new Date().toISOString();
                protection[guildId].antiLink.modifiedBy = interaction.user.id;
                await db.write(protection);

                const removeEmbed = embedBuilder.success( 'Usuário Removido',
                    `${user} não pode mais enviar links.`
                );
                return await interaction.reply({ embeds: [removeEmbed] });
            }

            if (subcommand === 'lista') {
                const { whitelistedChannels = [], whitelistedUsers = [], enabled, lastModified, modifiedBy } = protection[guildId].antiLink;
                
                const channelsList = whitelistedChannels.length > 0
                    ? whitelistedChannels.map(id => `<#${id}>`).join('\n')
                    : 'Nenhum canal permitido';

                const usersList = whitelistedUsers.length > 0
                    ? whitelistedUsers.map(id => `<@${id}>`).join('\n')
                    : 'Nenhum usuário permitido';

                const listEmbed = embedBuilder.custom({
                    title: '📋 Configurações do Anti-Link',
                    fields: [
                        {
                            name: '⚙️ Status',
                            value: enabled ? '✅ Ativado' : '❌ Desativado',
                            inline: true
                        },
                        {
                            name: '📝 Canais Permitidos',
                            value: channelsList,
                            inline: true
                        },
                        {
                            name: '👥 Usuários Permitidos',
                            value: usersList,
                            inline: true
                        },
                        {
                            name: '🕒 Última Modificação',
                            value: `<t:${Math.floor(new Date(lastModified).getTime() / 1000)}:R> por <@${modifiedBy}>`,
                            inline: false
                        }
                    ]
                });

                return await interaction.reply({ embeds: [listEmbed] });
            }
        } catch (error) {
            console.error('Erro ao executar antilink:', error);
            const errorEmbed = embedBuilder.error( 'Erro', 'Ocorreu um erro ao configurar o sistema anti-link.'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
