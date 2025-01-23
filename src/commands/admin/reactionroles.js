import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    Collection
} from 'discord.js';
import path from 'path';
import JsonDatabase from '../../utils/jsonDatabase.js';
import { checkPermissions } from '../../utils/checkPermissions.js';

// Cache para armazenar as configurações em memória
const messageCache = new Map();

// Cache para configurações temporárias
const tempConfigs = new Collection();

// Configuração do banco de dados
const db = new JsonDatabase(path.join(__dirname, '../../data/reactionRoles.json'));

// Constantes
const MAX_ROLES_PER_MESSAGE = 25;
const EMBED_COLORS = {
    DEFAULT: '#2F3136',
    SUCCESS: '#43B581',
    ERROR: '#F04747',
    WARNING: '#FAA61A'
};

// Carregar configurações do banco de dados
async function loadConfigurations() {
    try {
        const data = await db.read();
        if (data && data.messages) {
            data.messages.forEach(msg => {
                messageCache.set(msg.messageId, msg);
            });
            console.log(`✅ Carregadas ${data.messages.length} configurações de reaction roles`);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        throw error;
    }
}

// Salvar configurações no banco de dados
async function saveConfigurations() {
    try {
        await db.write({ messages: Array.from(messageCache.values()) });
        console.log('✅ Configurações salvas com sucesso');
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        throw error;
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('reactionroles')
        .setDescription('Gerencia cargos por reação/botão')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Cria uma nova configuração de reaction roles')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de interação')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Reações', value: 'reaction' },
                            { name: 'Botões', value: 'button' },
                            { name: 'Menu de Seleção', value: 'select' }
                        ))
                .addStringOption(option =>
                    option.setName('título')
                        .setDescription('Título da mensagem')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('descrição')
                        .setDescription('Descrição da mensagem')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('cor')
                        .setDescription('Cor da embed (hex)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edita uma configuração existente')
                .addStringOption(option =>
                    option.setName('mensagem')
                        .setDescription('ID da mensagem para editar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove uma configuração')
                .addStringOption(option =>
                    option.setName('mensagem')
                        .setDescription('ID da mensagem para remover')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista todas as configurações')),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id,
                interaction.guild.id, 'admin',
                interaction.member
            );

            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ Você não tem permissão para usar este comando.',
                    ephemeral: true
                });
            }

            // Carrega configurações se necessário
            if (messageCache.size === 0) {
                await loadConfigurations();
            }

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction);
                    break;
                case 'edit':
                    await handleEdit(interaction);
                    break;
                case 'remove':
                    await handleRemove(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
            }
        } catch (error) {
            console.error('❌ Erro ao executar comando:', error);
            const errorMessage = {
                content: '❌ Ocorreu um erro ao executar o comando.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
};

// Função para criar uma nova configuração
async function handleCreate(interaction) {
    try {
        const type = interaction.options.getString('tipo');
        const title = interaction.options.getString('título');
        const description = interaction.options.getString('descrição');
        const color = interaction.options.getString('cor') || EMBED_COLORS.DEFAULT;

        // Cria configuração temporária
        const config = {
            type,
            roles: [],
            embed: new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .toJSON()
        };

        // Salva configuração temporária
        tempConfigs.set(interaction.user.id, config);

        // Cria botões de ação
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('add_role')
                .setLabel('Adicionar Cargo')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('preview')
                .setLabel('Prévia')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('save')
                .setLabel('Salvar')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            content: 'Configure os cargos para sua mensagem:',
            embeds: [EmbedBuilder.from(config.embed)],
            components: [row],
            ephemeral: true
        });

        // Cria coletor de interações
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000 // 5 minutos
        });

        collector.on('collect', async i => {
            const config = tempConfigs.get(interaction.user.id);
            if (!config) return;

            switch (i.customId) {
                case 'add_role':
                    await handleAddRole(i, config);
                    break;
                case 'preview':
                    await handlePreview(i, config);
                    break;
                case 'save':
                    await handleSave(i, config);
                    collector.stop();
                    break;
                case 'cancel':
                    tempConfigs.delete(interaction.user.id);
                    await i.update({
                        content: '❌ Configuração cancelada.',
                        embeds: [],
                        components: []
                    });
                    collector.stop();
                    break;
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                tempConfigs.delete(interaction.user.id);
                interaction.editReply({
                    content: '❌ Tempo esgotado. Tente novamente.',
                    embeds: [],
                    components: []
                }).catch(() => {});
            }
        });

    } catch (error) {
        console.error('❌ Erro ao criar configuração:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao criar a configuração.',
            ephemeral: true
        });
    }
}

// Função para adicionar um cargo
async function handleAddRole(interaction, config) {
    try {
        if (config.roles.length >= MAX_ROLES_PER_MESSAGE) {
            await interaction.reply({
                content: `❌ Limite máximo de ${MAX_ROLES_PER_MESSAGE} cargos atingido.`,
                ephemeral: true
            });
            return;
        }

        // Modal para adicionar cargo
        const modal = new ModalBuilder()
            .setCustomId('add_role_modal')
            .setTitle('Adicionar Cargo');

        const roleInput = new TextInputBuilder()
            .setCustomId('role_id')
            .setLabel('ID do Cargo')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const emojiInput = new TextInputBuilder()
            .setCustomId('emoji')
            .setLabel('Emoji (apenas para reações)')
            .setStyle(TextInputStyle.Short)
            .setRequired(config.type === 'reaction');

        const labelInput = new TextInputBuilder()
            .setCustomId('label')
            .setLabel('Texto do Botão/Menu')
            .setStyle(TextInputStyle.Short)
            .setRequired(config.type !== 'reaction');

        const row1 = new ActionRowBuilder().addComponents(roleInput);
        const row2 = new ActionRowBuilder().addComponents(emojiInput);
        const row3 = new ActionRowBuilder().addComponents(labelInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);

        try {
            const modalInteraction = await interaction.awaitModalSubmit({
                filter: i => i.customId === 'add_role_modal' && i.user.id === interaction.user.id,
                time: 60000
            });

            const roleId = modalInteraction.fields.getTextInputValue('role_id');
            const emoji = modalInteraction.fields.getTextInputValue('emoji');
            const label = modalInteraction.fields.getTextInputValue('label');

            // Verifica se o cargo existe
            const role = await interaction.guild.roles.fetch(roleId);
            if (!role) {
                await modalInteraction.reply({
                    content: '❌ Cargo não encontrado.',
                    ephemeral: true
                });
                return;
            }

            // Verifica se o cargo já está na lista
            if (config.roles.some(r => r.roleId === roleId)) {
                await modalInteraction.reply({
                    content: '❌ Este cargo já está na lista.',
                    ephemeral: true
                });
                return;
            }

            // Adiciona o cargo à configuração
            config.roles.push({
                roleId,
                emoji: config.type === 'reaction' ? emoji : null,
                label: config.type !== 'reaction' ? label : null
            });

            // Atualiza a mensagem
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('add_role')
                    .setLabel('Adicionar Cargo')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('preview')
                    .setLabel('Prévia')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('save')
                    .setLabel('Salvar')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(config.roles.length === 0),
                new ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Danger)
            );

            const embed = EmbedBuilder.from(config.embed)
                .addFields({
                    name: 'Cargos Configurados',
                    value: config.roles.map(r => {
                        const role = interaction.guild.roles.cache.get(r.roleId);
                        return `${r.emoji || ''} ${role.name}`;
                    }).join('\n')
                });

            await modalInteraction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                await interaction.followUp({
                    content: '❌ Tempo esgotado. Tente novamente.',
                    ephemeral: true
                });
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('❌ Erro ao adicionar cargo:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao adicionar o cargo.',
            ephemeral: true
        });
    }
}

// Função para criar as linhas de componentes
function createComponentRows(config) {
    const rows = [];

    if (config.type === 'button') {
        // Divide os botões em linhas de 5
        for (let i = 0; i < config.roles.length; i += 5) {
            const row = new ActionRowBuilder();
            const buttons = config.roles.slice(i, i + 5).map(role =>
                new ButtonBuilder()
                    .setCustomId(`role_${role.roleId}`)
                    .setLabel(role.label)
                    .setStyle(ButtonStyle.Secondary)
            );
            row.addComponents(buttons);
            rows.push(row);
        }
    }
    else if (config.type === 'select') {
        const options = config.roles.map(role => ({
            label: role.label,
            value: role.roleId,
            description: `Clique para receber/remover o cargo`
        }));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('role_select')
                .setPlaceholder('Selecione seus cargos')
                .setMinValues(0)
                .setMaxValues(config.roles.length)
                .addOptions(options)
        );

        rows.push(row);
    }

    return rows;
}

// Função para visualizar a configuração
async function handlePreview(interaction, config) {
    try {
        const embed = EmbedBuilder.from(config.embed);
        const rows = createComponentRows(config);

        await interaction.reply({
            content: 'Prévia da sua mensagem:',
            embeds: [embed],
            components: rows,
            ephemeral: true
        });

    } catch (error) {
        console.error('❌ Erro ao mostrar prévia:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao mostrar a prévia.',
            ephemeral: true
        });
    }
}

// Função para listar configurações
async function handleList(interaction) {
    try {
        const configs = Array.from(messageCache.values());
        
        if (configs.length === 0) {
            await interaction.reply({
                content: '❌ Não há configurações de reaction roles.',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Configurações de Reaction Roles')
            .setColor(EMBED_COLORS.DEFAULT)
            .setDescription(configs.map((config, index) => {
                const channel = interaction.guild.channels.cache.get(config.channelId);
                return `${index + 1}. **${config.embed.title}**
                   📝 Tipo: ${config.type}
                   📍 Canal: ${channel ? channel.toString() : 'Desconhecido'}
                   🔢 ID: \`${config.messageId}\`
                   👥 Cargos: ${config.roles.length}`;
            }).join('\n\n'));

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error('❌ Erro ao listar configurações:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao listar as configurações.',
            ephemeral: true
        });
    }
}

// Função para editar uma configuração
async function handleEdit(interaction) {
    try {
        const messageId = interaction.options.getString('mensagem');
        const config = messageCache.get(messageId);

        if (!config) {
            await interaction.reply({
                content: '❌ Configuração não encontrada.',
                ephemeral: true
            });
            return;
        }

        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (!channel) {
            await interaction.reply({
                content: '❌ Canal não encontrado.',
                ephemeral: true
            });
            return;
        }

        // Cria botões de edição
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('edit_title')
                .setLabel('Editar Título')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('edit_description')
                .setLabel('Editar Descrição')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('edit_color')
                .setLabel('Editar Cor')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('edit_roles')
                .setLabel('Editar Cargos')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
            content: 'Selecione o que deseja editar:',
            components: [row],
            ephemeral: true
        });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            switch (i.customId) {
                case 'edit_title':
                case 'edit_description':
                case 'edit_color':
                    await handleEditEmbed(i, config, i.customId.split('_')[1]);
                    break;
                case 'edit_roles':
                    await handleEditRoles(i, config);
                    break;
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    content: '❌ Tempo esgotado.',
                    components: []
                }).catch(() => {});
            }
        });

    } catch (error) {
        console.error('❌ Erro ao editar configuração:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao editar a configuração.',
            ephemeral: true
        });
    }
}

// Função para remover uma configuração
async function handleRemove(interaction) {
    try {
        const messageId = interaction.options.getString('mensagem');
        const config = messageCache.get(messageId);

        if (!config) {
            await interaction.reply({
                content: '❌ Configuração não encontrada.',
                ephemeral: true
            });
            return;
        }

        const channel = interaction.guild.channels.cache.get(config.channelId);
        
        // Botões de confirmação
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_remove')
                .setLabel('Confirmar')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_remove')
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: `Tem certeza que deseja remover a configuração "${config.embed.title}"${channel ? ` do canal ${channel}` : ''}?`,
            components: [row],
            ephemeral: true
        });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 30000,
            max: 1
        });

        collector.on('collect', async i => {
            if (i.customId === 'confirm_remove') {
                try {
                    // Remove a mensagem do Discord
                    if (channel) {
                        try {
                            const message = await channel.messages.fetch(messageId);
                            await message.delete();
                        } catch (error) {
                            console.error('❌ Erro ao deletar mensagem:', error);
                        }
                    }

                    // Remove do cache e salva
                    messageCache.delete(messageId);
                    await saveConfigurations();

                    await i.update({
                        content: '✅ Configuração removida com sucesso!',
                        components: []
                    });
                } catch (error) {
                    console.error('❌ Erro ao remover configuração:', error);
                    await i.update({
                        content: '❌ Ocorreu um erro ao remover a configuração.',
                        components: []
                    });
                }
            } else {
                await i.update({
                    content: '❌ Remoção cancelada.',
                    components: []
                });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    content: '❌ Tempo esgotado.',
                    components: []
                }).catch(() => {});
            }
        });

    } catch (error) {
        console.error('❌ Erro ao remover configuração:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao remover a configuração.',
            ephemeral: true
        });
    }
}
