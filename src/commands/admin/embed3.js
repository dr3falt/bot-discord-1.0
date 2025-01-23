import { SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
 } from 'discord.js';

const embedCache = new Map();
const TIMEOUT = 900000; // 15 minutes
const MODAL_TIMEOUT = 180000; // 3 minutes

// Predefined color options
const COLORS = {
    DEFAULT: '#2f3136',
    RED: '#ff0000',
    GREEN: '#00ff00',
    BLUE: '#0000ff',
    YELLOW: '#ffff00',
    PURPLE: '#800080',
    ORANGE: '#ffa500',
    WHITE: '#ffffff',
    BLACK: '#000000'
};

// Create button rows
const mainRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('embed_title')
        .setLabel('📝 Título')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_description')
        .setLabel('📄 Descrição')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_color')
        .setLabel('🎨 Cor')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_thumbnail')
        .setLabel('🖼️ Thumbnail')
        .setStyle(ButtonStyle.Primary)
);

const mediaRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('embed_image')
        .setLabel('📸 Imagem')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_footer')
        .setLabel('📝 Rodapé')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_author')
        .setLabel('👤 Autor')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_timestamp')
        .setLabel('⏰ Timestamp')
        .setStyle(ButtonStyle.Primary)
);

const fieldRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('embed_field_add')
        .setLabel('➕ Campo')
        .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
        .setCustomId('embed_field_edit')
        .setLabel('✏️ Editar Campo')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_field_remove')
        .setLabel('➖ Remover Campo')
        .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
        .setCustomId('embed_field_clear')
        .setLabel('🗑️ Limpar Campos')
        .setStyle(ButtonStyle.Danger)
);

const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('embed_preview')
        .setLabel('👁️ Visualizar')
        .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
        .setCustomId('embed_copy')
        .setLabel('📋 Copiar')
        .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
        .setCustomId('embed_send')
        .setLabel('📨 Enviar')
        .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
        .setCustomId('embed_cancel')
        .setLabel('❌ Cancelar')
        .setStyle(ButtonStyle.Danger)
);

export default {
    data: new SlashCommandBuilder()
        .setName('embed3')
        .setDescription('Cria uma embed personalizada com várias opções')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            // Verificar permissões
            if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
                await interaction.reply({
                    content: '❌ Você não tem permissão para usar este comando.',
                    ephemeral: true
                });
                return;
            }

            // Verificar se já existe uma sessão ativa
            if (embedCache.has(interaction.user.id)) {
                await interaction.reply({
                    content: 'Você já tem uma sessão de criação de embed ativa. Complete ou cancele a sessão anterior antes de iniciar uma nova.',
                    ephemeral: true
                });
                return;
            }

            // Criar embed inicial
            const embed = new EmbedBuilder()
                .setDescription('Clique nos botões abaixo para personalizar a embed')
                .setColor(COLORS.DEFAULT);

            // Enviar resposta inicial
            const response = await interaction.reply({
                embeds: [embed],
                components: [mainRow, mediaRow, fieldRow, actionRow],
                fetchReply: true
            });

            // Configurar cache
            embedCache.set(interaction.user.id, {
                embed: embed,
                message: response,
                fields: [],
                lastInteraction: Date.now(),
                timestamp: null
            });

            // Configurar collector
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: TIMEOUT
            });

            // Eventos do collector
            collector.on('collect', async i => {
                try {
                    // Verificar cache
                    const userData = embedCache.get(interaction.user.id);
                    if (!userData) {
                        await i.reply({
                            content: 'Sua sessão expirou. Por favor, use o comando novamente.',
                            ephemeral: true
                        });
                        collector.stop('expired');
                        return;
                    }

                    // Atualizar última interação
                    userData.lastInteraction = Date.now();
                    embedCache.set(interaction.user.id, userData);

                    // Processar interação
                    switch (i.customId) {
                        case 'embed_title':
                            await handleTitleModal(i);
                            break;
                        case 'embed_description':
                            await handleDescriptionModal(i);
                            break;
                        case 'embed_color':
                            await handleColorSelect(i);
                            break;
                        case 'embed_thumbnail':
                            await handleThumbnailModal(i);
                            break;
                        case 'embed_image':
                            await handleImageModal(i);
                            break;
                        case 'embed_footer':
                            await handleFooterModal(i);
                            break;
                        case 'embed_author':
                            await handleAuthorModal(i);
                            break;
                        case 'embed_timestamp':
                            await handleTimestampSelect(i);
                            break;
                        case 'embed_field_add':
                            await handleFieldModal(i);
                            break;
                        case 'embed_field_edit':
                            await handleFieldEdit(i);
                            break;
                        case 'embed_field_remove':
                            await handleFieldRemove(i);
                            break;
                        case 'embed_field_clear':
                            await handleFieldClear(i);
                            break;
                        case 'embed_preview':
                            await handlePreview(i);
                            break;
                        case 'embed_copy':
                            await handleCopy(i);
                            break;
                        case 'embed_send':
                            await handleSendModal(i);
                            break;
                        case 'embed_cancel':
                            collector.stop('cancelled');
                            await i.update({
                                content: 'Criação de embed cancelada.',
                                embeds: [],
                                components: []
                            });
                            break;
                    }
                } catch (error) {
                    console.error('Erro ao processar interação:', error);
                    try {
                        const reply = {
                            content: 'Ocorreu um erro ao processar sua ação. Por favor, tente novamente.',
                            ephemeral: true
                        };
                        if (i.replied || i.deferred) {
                            await i.followUp(reply);
                        } else {
                            await i.reply(reply);
                        }
                    } catch (e) {
                        console.error('Erro ao enviar mensagem de erro:', e);
                    }
                }
            });

            // Evento de fim do collector
            collector.on('end', (collected, reason) => {
                if (embedCache.has(interaction.user.id)) {
                    embedCache.delete(interaction.user.id);
                }
                
                if (reason === 'time') {
                    try {
                        interaction.editReply({
                            content: 'Tempo esgotado. Use o comando novamente se quiser criar uma nova embed.',
                            embeds: [],
                            components: []
                        });
                    } catch (error) {
                        console.error('Erro ao editar mensagem de timeout:', error);
                    }
                }
            });

        } catch (error) {
            console.error('Erro fatal no comando embed3:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({
                        content: 'Ocorreu um erro ao iniciar o criador de embed. Por favor, tente novamente mais tarde.',
                        ephemeral: true
                    });
                }
            } catch (e) {
                console.error('Erro ao enviar mensagem de erro:', e);
            }
            if (embedCache.has(interaction.user.id)) {
                embedCache.delete(interaction.user.id);
            }
        }
    }
};

// Color selection handler
async function handleColorSelect(interaction) {
    console.log('[EMBED3] Starting color selection process');
    
    try {
        const userData = embedCache.get(interaction.user.id);
        if (!userData) {
            console.log('[EMBED3] No user data found for color selection');
            await interaction.deferUpdate();
            await interaction.editReply({
                content: 'Erro: Dados não encontrados. Por favor, tente novamente.',
                components: []
            });
            return;
        }

        const colorRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('color_select')
                .setPlaceholder('Escolha uma cor')
                .addOptions([
                    {
                        label: 'Padrão',
                        description: 'Cor padrão do Discord',
                        value: 'DEFAULT',
                    },
                    {
                        label: 'Vermelho',
                        description: 'Cor vermelha',
                        value: 'RED',
                    },
                    {
                        label: 'Verde',
                        description: 'Cor verde',
                        value: 'GREEN',
                    },
                    {
                        label: 'Azul',
                        description: 'Cor azul',
                        value: 'BLUE',
                    },
                    {
                        label: 'Amarelo',
                        description: 'Cor amarela',
                        value: 'YELLOW',
                    },
                    {
                        label: 'Roxo',
                        description: 'Cor roxa',
                        value: 'PURPLE',
                    },
                    {
                        label: 'Laranja',
                        description: 'Cor laranja',
                        value: 'ORANGE',
                    },
                    {
                        label: 'Branco',
                        description: 'Cor branca',
                        value: 'WHITE',
                    },
                    {
                        label: 'Preto',
                        description: 'Cor preta',
                        value: 'BLACK',
                    },
                    {
                        label: 'Personalizada',
                        description: 'Escolha uma cor personalizada (HEX)',
                        value: 'CUSTOM',
                    },
                ])
        );

        const customRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('color_custom')
                .setLabel('Cor Personalizada (HEX)')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.deferUpdate();
        const response = await interaction.editReply({
            content: 'Escolha uma cor para a embed:',
            components: [colorRow, customRow],
            ephemeral: true
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({
            filter,
            time: MODAL_TIMEOUT,
            max: 1
        });

        collector.on('collect', async i => {
            try {
                await i.deferUpdate();
                
                if (i.customId === 'color_custom') {
                    await handleCustomColorModal(i);
                    return;
                }

                const selectedColor = i.values[0];
                console.log(`[EMBED3] Color selection received: ${selectedColor}`);

                if (selectedColor === 'CUSTOM') {
                    await handleCustomColorModal(i);
                    return;
                }

                const colorHex = COLORS[selectedColor];
                console.log(`[EMBED3] Setting color: ${colorHex}`);

                userData.embed.setColor(colorHex);
                embedCache.set(interaction.user.id, userData);

                await i.editReply({
                    content: `✅ Cor alterada para: ${selectedColor}`,
                    components: [],
                    embeds: [userData.embed]
                });

            } catch (error) {
                console.error('[EMBED3] Error in color selection:', error);
                try {
                    if (!i.deferred) {
                        await i.deferUpdate();
                    }
                    await i.editReply({
                        content: 'Ocorreu um erro ao selecionar a cor.',
                        components: []
                    });
                } catch (e) {
                    console.error('[EMBED3] Error handling color selection error:', e);
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                try {
                    await interaction.editReply({
                        content: 'Tempo esgotado. Por favor, tente novamente.',
                        components: []
                    });
                } catch (error) {
                    console.error('[EMBED3] Error in color collector end:', error);
                }
            }
        });

    } catch (error) {
        console.error('[EMBED3] Error in color selection handler:', error);
        try {
            if (!interaction.deferred) {
                await interaction.deferUpdate();
            }
            await interaction.editReply({
                content: 'Ocorreu um erro ao processar a seleção de cor.',
                components: []
            });
        } catch (e) {
            console.error('[EMBED3] Error handling color selection handler error:', e);
        }
    }
}

async function handleCustomColorModal(interaction) {
    try {
        const customColor = interaction.fields.getTextInputValue('custom_color');
        const embedData = embedCache.get(interaction.user.id);
        
        if (!embedData) {
            await interaction.reply({
                content: '❌ Não foi possível encontrar os dados do embed. Por favor, comece novamente.',
                ephemeral: true
            });
            return;
        }

        // Validate color format
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!colorRegex.test(customColor)) {
            await interaction.reply({
                content: '❌ Cor inválida! Use o formato hexadecimal (ex: #FF0000)',
                ephemeral: true
            });
            return;
        }

        // Update embed color
        embedData.embed.setColor(customColor);
        embedCache.set(interaction.user.id, embedData);

        // Update message with new embed
        await interaction.update({
            embeds: [embedData.embed],
            components: [mainRow, mediaRow, fieldRow, actionRow]
        });
    } catch (error) {
        console.error('Erro ao processar cor personalizada:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao processar a cor personalizada.',
            ephemeral: true
        });
    }
}

// Timestamp selection handler
async function handleTimestampSelect(interaction) {
    console.log('[EMBED3] Starting timestamp selection process');
    
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('timestamp_select')
            .setPlaceholder('Escolha uma opção de timestamp')
            .addOptions([
                { label: 'Agora', value: 'now', emoji: '⌚' },
                { label: 'Remover Timestamp', value: 'remove', emoji: '❌' },
                { label: 'Personalizado', value: 'custom', emoji: '📅' }
            ])
    );

    await interaction.update({
        content: 'Escolha uma opção de timestamp:',
        components: [row]
    });

    try {
        console.log('[EMBED3] Awaiting timestamp selection response');
        const response = await interaction.message.awaitMessageComponent({
            filter: i => i.customId === 'timestamp_select' && i.user.id === interaction.user.id,
            time: 30000
        });

        console.log(`[EMBED3] Timestamp selection received: ${response.values[0]}`);
        
        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        switch (response.values[0]) {
            case 'now':
                userData.embed.setTimestamp();
                break;
            case 'remove':
                userData.embed.setTimestamp(null);
                break;
            case 'custom':
                await handleCustomTimestampModal(response);
                return;
        }

        await response.update({
            content: null,
            embeds: [userData.embed],
            components: [mainRow, mediaRow, fieldRow, actionRow]
        });
    } catch (error) {
        console.error('[EMBED3] Error in timestamp selection:', error);
    }
}

// Field management handlers
async function handleFieldEdit(interaction) {
    console.log('[EMBED3] Starting field edit process');
    
    const userData = embedCache.get(interaction.user.id);
    if (!userData || !userData.fields.length) {
        await interaction.reply({
            content: 'Não há campos para editar.',
            ephemeral: true
        });
        return;
    }

    const options = userData.fields.map((field, index) => ({
        label: field.name.slice(0, 25),
        value: index.toString(),
        description: field.value.slice(0, 50)
    }));

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('field_edit_select')
            .setPlaceholder('Escolha um campo para editar')
            .addOptions(options)
    );

    await interaction.update({
        content: 'Selecione o campo que deseja editar:',
        components: [row]
    });

    try {
        console.log('[EMBED3] Awaiting field edit selection response');
        const fieldResponse = await interaction.message.awaitMessageComponent({
            filter: i => i.customId === 'field_edit_select' && i.user.id === interaction.user.id,
            time: 30000
        });

        console.log(`[EMBED3] Field edit selection received: ${fieldResponse.values[0]}`);
        
        const fieldIndex = parseInt(fieldResponse.values[0]);
        await handleFieldEditModal(fieldResponse, fieldIndex);
    } catch (error) {
        console.error('[EMBED3] Error in field edit selection:', error);
    }
}

async function handleFieldRemove(interaction) {
    console.log('[EMBED3] Starting field remove process');
    
    const userData = embedCache.get(interaction.user.id);
    if (!userData || !userData.fields.length) {
        await interaction.reply({
            content: 'Não há campos para remover.',
            ephemeral: true
        });
        return;
    }

    const options = userData.fields.map((field, index) => ({
        label: field.name.slice(0, 25),
        value: index.toString(),
        description: field.value.slice(0, 50)
    }));

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('field_remove_select')
            .setPlaceholder('Escolha um campo para remover')
            .addOptions(options)
    );

    await interaction.update({
        content: 'Selecione o campo que deseja remover:',
        components: [row]
    });

    try {
        console.log('[EMBED3] Awaiting field remove selection response');
        const fieldResponse = await interaction.message.awaitMessageComponent({
            filter: i => i.customId === 'field_remove_select' && i.user.id === interaction.user.id,
            time: 30000
        });

        console.log(`[EMBED3] Field remove selection received: ${fieldResponse.values[0]}`);
        
        const fieldIndex = parseInt(fieldResponse.values[0]);
        userData.fields.splice(fieldIndex, 1);
        userData.embed.setFields(userData.fields);

        await fieldResponse.update({
            content: null,
            embeds: [userData.embed],
            components: [mainRow, mediaRow, fieldRow, actionRow]
        });
    } catch (error) {
        console.error('[EMBED3] Error in field removal:', error);
    }
}

async function handleFieldClear(interaction) {
    console.log('[EMBED3] Starting field clear process');
    
    const userData = embedCache.get(interaction.user.id);
    if (!userData) return;

    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('field_clear_confirm')
            .setLabel('Confirmar')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('field_clear_cancel')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
        content: 'Tem certeza que deseja remover todos os campos?',
        components: [confirmRow]
    });

    try {
        console.log('[EMBED3] Awaiting field clear confirmation response');
        const confirmation = await interaction.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

        console.log(`[EMBED3] Field clear confirmation received: ${confirmation.customId}`);
        
        if (confirmation.customId === 'field_clear_confirm') {
            userData.fields = [];
            userData.embed.setFields([]);
        }

        await confirmation.update({
            content: null,
            embeds: [userData.embed],
            components: [mainRow, mediaRow, fieldRow, actionRow]
        });
    } catch (error) {
        console.error('[EMBED3] Error in field clear:', error);
    }
}

// Copy embed handler
async function handleCopy(interaction) {
    console.log('[EMBED3] Starting copy process');
    
    const userData = embedCache.get(interaction.user.id);
    if (!userData) return;

    try {
        const embedData = {
            title: userData.embed.data.title,
            description: userData.embed.data.description,
            color: userData.embed.data.color,
            fields: userData.fields,
            author: userData.embed.data.author,
            footer: userData.embed.data.footer,
            thumbnail: userData.embed.data.thumbnail?.url,
            image: userData.embed.data.image?.url,
            timestamp: userData.embed.data.timestamp
        };

        const embedJson = JSON.stringify(embedData, null, 2);
        await interaction.reply({
            content: `\`\`\`json\n${embedJson}\n\`\`\`\nCopie este JSON para usar a embed posteriormente!`,
            ephemeral: true
        });
    } catch (error) {
        console.error('[EMBED3] Error copying embed:', error);
    }
}

// Preview handler
async function handlePreview(interaction) {
    console.log('[EMBED3] Starting preview process');
    
    const userData = embedCache.get(interaction.user.id);
    if (!userData) return;

    try {
        await interaction.reply({
            content: 'Prévia da sua embed:',
            embeds: [userData.embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('[EMBED3] Error in preview:', error);
    }
}

// Send handler
async function handleSendModal(interaction) {
    console.log('[EMBED3] Starting send process');

    try {
        const userData = embedCache.get(interaction.user.id);
        if (!userData) {
            console.log('[EMBED3] No user data found for send');
            return;
        }

        // Organizar canais por categoria
        const categories = new Map();
        interaction.guild.channels.cache
            .filter(channel => 
                (channel.type === 0 || channel.type === 5) && // TextChannel e AnnouncementChannel
                channel.viewable
            )
            .forEach(channel => {
                const categoryName = channel.parent ? channel.parent.name : 'Sem Categoria';
                if (!categories.has(categoryName)) {
                    categories.set(categoryName, []);
                }
                categories.get(categoryName).push(channel);
            });

        // Criar opções do menu agrupadas por categoria
        const options = [];
        for (const [categoryName, channels] of categories) {
            // Adicionar separador de categoria
            if (options.length > 0) {
                options.push({
                    label: `── ${categoryName} ──`,
                    value: `separator_${categoryName}`,
                    description: `Categoria: ${categoryName}`,
                    default: false
                });
            }

            // Adicionar canais da categoria
            channels
                .sort((a, b) => a.position - b.position)
                .forEach(channel => {
                    options.push({
                        label: channel.name,
                        value: channel.id,
                        description: `#${channel.name} (${categoryName})`,
                        default: false
                    });
                });
        }

        // Dividir em grupos de 25 se necessário
        const optionGroups = [];
        for (let i = 0; i < options.length; i += 23) { // 23 para deixar espaço para navegação
            optionGroups.push(options.slice(i, i + 23));
        }

        let currentGroup = 0;
        const totalGroups = optionGroups.length;

        // Função para criar o menu de seleção atual
        function createCurrentMenu() {
            const currentOptions = optionGroups[currentGroup];
            
            // Adicionar botões de navegação se necessário
            if (totalGroups > 1) {
                if (currentGroup > 0) {
                    currentOptions.unshift({
                        label: '⬅️ Página Anterior',
                        value: 'prev_page',
                        description: `Página ${currentGroup} de ${totalGroups}`,
                    });
                }
                if (currentGroup < totalGroups - 1) {
                    currentOptions.push({
                        label: '➡️ Próxima Página',
                        value: 'next_page',
                        description: `Página ${currentGroup + 2} de ${totalGroups}`,
                    });
                }
            }

            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('channel_select')
                    .setPlaceholder(`Selecione ou pesquise um canal (${currentGroup + 1}/${totalGroups})`)
                    .addOptions(currentOptions)
                    .setMinValues(1)
                    .setMaxValues(1)
            );
        }

        // Enviar menu inicial
        const response = await interaction.reply({
            content: 'Selecione o canal onde deseja enviar a embed:',
            components: [createCurrentMenu()],
            ephemeral: true,
            fetchReply: true
        });

        // Coletor de interações
        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            try {
                const value = i.values[0];

                // Verificar navegação
                if (value === 'prev_page' && currentGroup > 0) {
                    currentGroup--;
                    await i.deferUpdate();
                    await i.editReply({
                        components: [createCurrentMenu()]
                    });
                    return;
                }
                if (value === 'next_page' && currentGroup < totalGroups - 1) {
                    currentGroup++;
                    await i.deferUpdate();
                    await i.editReply({
                        components: [createCurrentMenu()]
                    });
                    return;
                }
                if (value.startsWith('separator_')) {
                    await i.deferUpdate();
                    return;
                }

                // Enviar a embed para o canal selecionado
                const channel = await interaction.guild.channels.fetch(value);
                if (!channel) {
                    await i.deferUpdate();
                    await i.editReply({
                        content: 'Canal não encontrado ou inacessível.',
                        components: []
                    });
                    return;
                }

                await i.deferUpdate();
                try {
                    await channel.send({ embeds: [userData.embed] });
                    await i.editReply({
                        content: `✅ Embed enviada com sucesso para ${channel}!`,
                        components: []
                    });
                } catch (error) {
                    console.error('[EMBED3] Error sending embed:', error);
                    await i.editReply({
                        content: 'Erro ao enviar a embed. Verifique se o bot tem permissão no canal.',
                        components: []
                    });
                }
                collector.stop();

            } catch (error) {
                console.error('[EMBED3] Error in channel selection:', error);
                try {
                    if (!i.deferred) {
                        await i.deferUpdate();
                    }
                    await i.editReply({
                        content: 'Ocorreu um erro ao processar sua seleção.',
                        components: []
                    });
                } catch (e) {
                    console.error('[EMBED3] Error handling interaction error:', e);
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                try {
                    await interaction.editReply({
                        content: 'Tempo esgotado. Por favor, tente novamente.',
                        components: []
                    });
                } catch (error) {
                    console.error('[EMBED3] Error in collector end:', error);
                }
            }
        });

    } catch (error) {
        console.error('[EMBED3] Error in send modal:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: 'Ocorreu um erro ao preparar o envio da embed.',
                ephemeral: true
            });
        }
    }
}

// Modal Handlers
async function handleTitleModal(interaction) {
    console.log('[EMBED3] Starting title modal');
    
    const modal = new ModalBuilder()
        .setCustomId('title_modal')
        .setTitle('Editar Título');

    const titleInput = new TextInputBuilder()
        .setCustomId('title_input')
        .setLabel('Título da Embed')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(256)
        .setRequired(true);

    const urlInput = new TextInputBuilder()
        .setCustomId('title_url')
        .setLabel('URL do Título (opcional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(urlInput);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting title modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'title_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Title modal response received');
        
        const title = modalResponse.fields.getTextInputValue('title_input');
        const url = modalResponse.fields.getTextInputValue('title_url');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setTitle(title);
        if (url) userData.embed.setURL(url);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in title modal:', error);
    }
}

async function handleDescriptionModal(interaction) {
    console.log('[EMBED3] Starting description modal');
    
    const modal = new ModalBuilder()
        .setCustomId('description_modal')
        .setTitle('Editar Descrição');

    const descInput = new TextInputBuilder()
        .setCustomId('description_input')
        .setLabel('Descrição da Embed')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(4000)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(descInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting description modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'description_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Description modal response received');
        
        const description = modalResponse.fields.getTextInputValue('description_input');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setDescription(description);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in description modal:', error);
    }
}

async function handleColorModal(interaction) {
    console.log('[EMBED3] Starting color modal');
    
    const modal = new ModalBuilder()
        .setCustomId('color_modal')
        .setTitle('Editar Cor');

    const colorInput = new TextInputBuilder()
        .setCustomId('color_input')
        .setLabel('Cor em Hexadecimal (ex: #FF0000)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(7)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(colorInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting color modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'color_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Color modal response received');
        
        const color = modalResponse.fields.getTextInputValue('color_input');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setColor(color);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in color modal:', error);
    }
}

async function handleThumbnailModal(interaction) {
    console.log('[EMBED3] Starting thumbnail modal');
    
    const modal = new ModalBuilder()
        .setCustomId('thumbnail_modal')
        .setTitle('Editar Thumbnail');

    const urlInput = new TextInputBuilder()
        .setCustomId('thumbnail_input')
        .setLabel('URL da Thumbnail')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(urlInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting thumbnail modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'thumbnail_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Thumbnail modal response received');
        
        const url = modalResponse.fields.getTextInputValue('thumbnail_input');
        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setThumbnail(url);
        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in thumbnail modal:', error);
    }
}

async function handleImageModal(interaction) {
    console.log('[EMBED3] Starting image modal');
    
    const modal = new ModalBuilder()
        .setCustomId('image_modal')
        .setTitle('Editar Imagem');

    const urlInput = new TextInputBuilder()
        .setCustomId('image_input')
        .setLabel('URL da Imagem')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(urlInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting image modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'image_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Image modal response received');
        
        const url = modalResponse.fields.getTextInputValue('image_input');
        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setImage(url);
        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in image modal:', error);
    }
}

async function handleFooterModal(interaction) {
    console.log('[EMBED3] Starting footer modal');
    
    const modal = new ModalBuilder()
        .setCustomId('footer_modal')
        .setTitle('Editar Rodapé');

    const textInput = new TextInputBuilder()
        .setCustomId('footer_text')
        .setLabel('Texto do Rodapé')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const iconInput = new TextInputBuilder()
        .setCustomId('footer_icon')
        .setLabel('URL do Ícone do Rodapé (opcional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const row1 = new ActionRowBuilder().addComponents(textInput);
    const row2 = new ActionRowBuilder().addComponents(iconInput);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting footer modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'footer_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Footer modal response received');
        
        const text = modalResponse.fields.getTextInputValue('footer_text');
        const iconUrl = modalResponse.fields.getTextInputValue('footer_icon');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setFooter({ 
            text: text,
            iconURL: iconUrl || null
        });

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in footer modal:', error);
    }
}

async function handleAuthorModal(interaction) {
    console.log('[EMBED3] Starting author modal');
    
    const modal = new ModalBuilder()
        .setCustomId('author_modal')
        .setTitle('Editar Autor');

    const nameInput = new TextInputBuilder()
        .setCustomId('author_name')
        .setLabel('Nome do Autor')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const iconInput = new TextInputBuilder()
        .setCustomId('author_icon')
        .setLabel('URL do Ícone do Autor (opcional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const urlInput = new TextInputBuilder()
        .setCustomId('author_url')
        .setLabel('URL do Autor (opcional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(iconInput);
    const row3 = new ActionRowBuilder().addComponents(urlInput);
    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting author modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'author_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Author modal response received');
        
        const name = modalResponse.fields.getTextInputValue('author_name');
        const iconUrl = modalResponse.fields.getTextInputValue('author_icon');
        const url = modalResponse.fields.getTextInputValue('author_url');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setAuthor({
            name: name,
            iconURL: iconUrl || null,
            url: url || null
        });

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in author modal:', error);
    }
}

async function handleFieldModal(interaction) {
    console.log('[EMBED3] Starting field modal');
    
    const modal = new ModalBuilder()
        .setCustomId('field_modal')
        .setTitle('Adicionar Campo');

    const nameInput = new TextInputBuilder()
        .setCustomId('field_name')
        .setLabel('Nome do Campo')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const valueInput = new TextInputBuilder()
        .setCustomId('field_value')
        .setLabel('Valor do Campo')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const inlineInput = new TextInputBuilder()
        .setCustomId('field_inline')
        .setLabel('Inline? (sim/não)')
        .setStyle(TextInputStyle.Short)
        .setValue('não')
        .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(valueInput);
    const row3 = new ActionRowBuilder().addComponents(inlineInput);
    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting field modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'field_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Field modal response received');
        
        const name = modalResponse.fields.getTextInputValue('field_name');
        const value = modalResponse.fields.getTextInputValue('field_value');
        const inline = modalResponse.fields.getTextInputValue('field_inline').toLowerCase() === 'sim';

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.fields.push({ name, value, inline });
        userData.embed.setFields(userData.fields);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in field modal:', error);
    }
}

async function handleFieldEditModal(interaction, fieldIndex) {
    console.log('[EMBED3] Starting field edit modal');
    
    const userData = embedCache.get(interaction.user.id);
    if (!userData) return;

    const modal = new ModalBuilder()
        .setCustomId('field_edit_modal')
        .setTitle('Editar Campo');

    const nameInput = new TextInputBuilder()
        .setCustomId('field_name')
        .setLabel('Nome do Campo')
        .setStyle(TextInputStyle.Short)
        .setValue(userData.fields[fieldIndex].name)
        .setRequired(true);

    const valueInput = new TextInputBuilder()
        .setCustomId('field_value')
        .setLabel('Valor do Campo')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(userData.fields[fieldIndex].value)
        .setRequired(true);

    const inlineInput = new TextInputBuilder()
        .setCustomId('field_inline')
        .setLabel('Inline? (sim/não)')
        .setStyle(TextInputStyle.Short)
        .setValue(userData.fields[fieldIndex].inline ? 'sim' : 'não')
        .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(valueInput);
    const row3 = new ActionRowBuilder().addComponents(inlineInput);
    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting field edit modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'field_edit_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Field edit modal response received');
        
        const name = modalResponse.fields.getTextInputValue('field_name');
        const value = modalResponse.fields.getTextInputValue('field_value');
        const inline = modalResponse.fields.getTextInputValue('field_inline').toLowerCase() === 'sim';

        userData.fields[fieldIndex] = { name, value, inline };
        userData.embed.setFields(userData.fields);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in field edit modal:', error);
    }
}

async function handleCustomTimestampModal(interaction) {
    console.log('[EMBED3] Starting custom timestamp modal');
    
    const modal = new ModalBuilder()
        .setCustomId('custom_timestamp_modal')
        .setTitle('Data/Hora Personalizada');

    const timestampInput = new TextInputBuilder()
        .setCustomId('timestamp_input')
        .setLabel('Data/Hora em formato ISO 8601 (ex: 2022-01-01T12:00:00.000Z)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(timestampInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

    try {
        console.log('[EMBED3] Awaiting custom timestamp modal response');
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'custom_timestamp_modal' && i.user.id === interaction.user.id,
            time: MODAL_TIMEOUT
        });

        console.log('[EMBED3] Custom timestamp modal response received');
        
        const timestamp = modalResponse.fields.getTextInputValue('timestamp_input');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setTimestamp(timestamp);
        userData.timestamp = timestamp;

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('[EMBED3] Error in custom timestamp modal:', error);
    }
}
