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

// Create button rows as module-level variables
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
        .setLabel('🏞️ Imagem')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_footer')
        .setLabel('👣 Rodapé')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_author')
        .setLabel('👤 Autor')
        .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
        .setCustomId('embed_timestamp')
        .setLabel('⏰ Data/Hora')
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
        .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
        .setCustomId('embed_field_remove')
        .setLabel('❌ Remover Campo')
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
        .setLabel('📤 Enviar')
        .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
        .setCustomId('embed_cancel')
        .setLabel('❌ Cancelar')
        .setStyle(ButtonStyle.Danger)
);

export default {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Cria uma embed personalizada com várias opções')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setDescription('Clique nos botões abaixo para personalizar a embed')
            .setColor(COLORS.DEFAULT);

        const response = await interaction.reply({
            embeds: [embed],
            components: [mainRow, mediaRow, fieldRow, actionRow],
            ephemeral: true
        });

        embedCache.set(interaction.user.id, {
            embed: embed,
            message: response,
            fields: [],
            lastInteraction: interaction,
            timestamp: null
        });

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: TIMEOUT
        });

        collector.on('collect', async i => {
            const userData = embedCache.get(interaction.user.id);
            if (!userData) return;

            userData.lastInteraction = i;
            embedCache.set(interaction.user.id, userData);

            try {
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
                        collector.stop();
                        await i.update({
                            content: 'Criação de embed cancelada.',
                            embeds: [],
                            components: []
                        });
                        embedCache.delete(interaction.user.id);
                        break;
                }
            } catch (error) {
                console.error(`Error handling ${i.customId}:`, error);
                try {
                    await i.reply({
                        content: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
                        ephemeral: true
                    });
                } catch (e) {
                    const lastInteraction = userData.lastInteraction;
                    if (lastInteraction) {
                        await lastInteraction.followUp({
                            content: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
                            ephemeral: true
                        });
                    }
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                try {
                    await interaction.editReply({
                        content: 'Tempo esgotado. Por favor, inicie o comando novamente.',
                        embeds: [],
                        components: []
                    });
                } catch (error) {
                    console.error('Error handling collector end:', error);
                }
                embedCache.delete(interaction.user.id);
            }
        });
    }
};

// Color selection handler
async function handleColorSelect(interaction) {
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('color_select')
            .setPlaceholder('Escolha uma cor ou digite um código hex')
            .addOptions([
                { label: 'Padrão', value: COLORS.DEFAULT, emoji: '⚫' },
                { label: 'Vermelho', value: COLORS.RED, emoji: '🔴' },
                { label: 'Verde', value: COLORS.GREEN, emoji: '🟢' },
                { label: 'Azul', value: COLORS.BLUE, emoji: '🔵' },
                { label: 'Amarelo', value: COLORS.YELLOW, emoji: '🟡' },
                { label: 'Roxo', value: COLORS.PURPLE, emoji: '🟣' },
                { label: 'Laranja', value: COLORS.ORANGE, emoji: '🟠' },
                { label: 'Branco', value: COLORS.WHITE, emoji: '⚪' },
                { label: 'Preto', value: COLORS.BLACK, emoji: '⚫' },
                { label: 'Personalizado', value: 'custom', emoji: '🎨' }
            ])
    );

    await interaction.update({
        content: 'Escolha uma cor para a embed:',
        components: [row]
    });

    try {
        const colorResponse = await interaction.message.awaitMessageComponent({
            filter: i => i.customId === 'color_select' && i.user.id === interaction.user.id,
            time: 30000
        });

        if (colorResponse.values[0] === 'custom') {
            await handleCustomColorModal(colorResponse);
        } else {
            const userData = embedCache.get(interaction.user.id);
            if (!userData) return;

            userData.embed.setColor(colorResponse.values[0]);
            await colorResponse.update({
                content: null,
                embeds: [userData.embed],
                components: [mainRow, mediaRow, fieldRow, actionRow]
            });
        }
    } catch (error) {
        console.error('Error in color selection:', error);
    }
}

// Timestamp selection handler
async function handleTimestampSelect(interaction) {
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
        const response = await interaction.message.awaitMessageComponent({
            filter: i => i.customId === 'timestamp_select' && i.user.id === interaction.user.id,
            time: 30000
        });

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
        console.error('Error in timestamp selection:', error);
    }
}

// Field management handlers
async function handleFieldEdit(interaction) {
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
        const fieldResponse = await interaction.message.awaitMessageComponent({
            filter: i => i.customId === 'field_edit_select' && i.user.id === interaction.user.id,
            time: 30000
        });

        const fieldIndex = parseInt(fieldResponse.values[0]);
        await handleFieldEditModal(fieldResponse, fieldIndex);
    } catch (error) {
        console.error('Error in field edit selection:', error);
    }
}

async function handleFieldRemove(interaction) {
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
        const fieldResponse = await interaction.message.awaitMessageComponent({
            filter: i => i.customId === 'field_remove_select' && i.user.id === interaction.user.id,
            time: 30000
        });

        const fieldIndex = parseInt(fieldResponse.values[0]);
        userData.fields.splice(fieldIndex, 1);
        userData.embed.setFields(userData.fields);

        await fieldResponse.update({
            content: null,
            embeds: [userData.embed],
            components: [mainRow, mediaRow, fieldRow, actionRow]
        });
    } catch (error) {
        console.error('Error in field removal:', error);
    }
}

async function handleFieldClear(interaction) {
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
        const confirmation = await interaction.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30000
        });

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
        console.error('Error in field clear:', error);
    }
}

// Copy embed handler
async function handleCopy(interaction) {
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
        console.error('Error copying embed:', error);
    }
}

// Preview handler
async function handlePreview(interaction) {
    const userData = embedCache.get(interaction.user.id);
    if (!userData) return;

    try {
        await interaction.reply({
            content: 'Prévia da sua embed:',
            embeds: [userData.embed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in preview:', error);
    }
}

// Send handler
async function handleSendModal(interaction) {
    try {
        const channels = interaction.guild.channels.cache
            .filter(channel => channel.type === 0)
            .first(25)
            .map(channel => ({
                label: channel.name.slice(0, 25),
                value: channel.id,
                description: `#${channel.name}`.slice(0, 50)
            }));

        if (channels.length === 0) {
            await interaction.reply({
                content: 'Não encontrei nenhum canal de texto neste servidor.',
                ephemeral: true
            });
            return;
        }

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('channel_select')
                .setPlaceholder('Selecione o canal para enviar')
                .addOptions(channels)
        );

        await interaction.update({
            content: 'Selecione o canal onde deseja enviar a embed:',
            components: [row]
        });

        const channelResponse = await interaction.message.awaitMessageComponent({
            filter: i => i.customId === 'channel_select' && i.user.id === interaction.user.id,
            time: 30000
        });

        const channel = interaction.guild.channels.cache.get(channelResponse.values[0]);
        if (!channel) {
            await channelResponse.update({
                content: 'Canal não encontrado. Por favor, tente novamente.',
                components: []
            });
            return;
        }

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        await channel.send({ embeds: [userData.embed] });
        await channelResponse.update({
            content: `Embed enviada com sucesso no canal ${channel}!`,
            embeds: [],
            components: []
        });

        embedCache.delete(interaction.user.id);
    } catch (error) {
        console.error('Error in send modal:', error);
        try {
            await interaction.followUp({
                content: 'Ocorreu um erro ao enviar a embed. Por favor, tente novamente.',
                ephemeral: true
            });
        } catch (e) {
            const lastInteraction = userData?.lastInteraction;
            if (lastInteraction) {
                await lastInteraction.followUp({
                    content: 'Ocorreu um erro ao enviar a embed. Por favor, tente novamente.',
                    ephemeral: true
                });
            }
        }
    }
}

// Modal Handlers
async function handleTitleModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'title_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const title = modalResponse.fields.getTextInputValue('title_input');
        const url = modalResponse.fields.getTextInputValue('title_url');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setTitle(title);
        if (url) userData.embed.setURL(url);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in title modal:', error);
    }
}

async function handleDescriptionModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'description_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const description = modalResponse.fields.getTextInputValue('description_input');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setDescription(description);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in description modal:', error);
    }
}

async function handleColorModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'color_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const color = modalResponse.fields.getTextInputValue('color_input');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setColor(color);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in color modal:', error);
    }
}

async function handleThumbnailModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'thumbnail_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const url = modalResponse.fields.getTextInputValue('thumbnail_input');
        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setThumbnail(url);
        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in thumbnail modal:', error);
    }
}

async function handleImageModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'image_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const url = modalResponse.fields.getTextInputValue('image_input');
        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setImage(url);
        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in image modal:', error);
    }
}

async function handleFooterModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'footer_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

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
        console.error('Error in footer modal:', error);
    }
}

async function handleAuthorModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'author_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

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
        console.error('Error in author modal:', error);
    }
}

async function handleFieldModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'field_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const name = modalResponse.fields.getTextInputValue('field_name');
        const value = modalResponse.fields.getTextInputValue('field_value');
        const inline = modalResponse.fields.getTextInputValue('field_inline').toLowerCase() === 'sim';

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.fields.push({ name, value, inline });
        userData.embed.setFields(userData.fields);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in field modal:', error);
    }
}

async function handleFieldEditModal(interaction, fieldIndex) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'field_edit_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const name = modalResponse.fields.getTextInputValue('field_name');
        const value = modalResponse.fields.getTextInputValue('field_value');
        const inline = modalResponse.fields.getTextInputValue('field_inline').toLowerCase() === 'sim';

        userData.fields[fieldIndex] = { name, value, inline };
        userData.embed.setFields(userData.fields);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in field edit modal:', error);
    }
}

async function handleCustomColorModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('custom_color_modal')
        .setTitle('Cor Personalizada');

    const colorInput = new TextInputBuilder()
        .setCustomId('color_input')
        .setLabel('Cor em Hexadecimal (ex: #FF0000)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(colorInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

    try {
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'custom_color_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const color = modalResponse.fields.getTextInputValue('color_input');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setColor(color);

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in custom color modal:', error);
    }
}

async function handleCustomTimestampModal(interaction) {
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
        const modalResponse = await interaction.awaitModalSubmit({
            filter: i => i.customId === 'custom_timestamp_modal' && i.user.id === interaction.user.id,
            time: 300000
        });

        const timestamp = modalResponse.fields.getTextInputValue('timestamp_input');

        const userData = embedCache.get(interaction.user.id);
        if (!userData) return;

        userData.embed.setTimestamp(timestamp);
        userData.timestamp = timestamp;

        await modalResponse.update({ embeds: [userData.embed] });
    } catch (error) {
        console.error('Error in custom timestamp modal:', error);
    }
}
