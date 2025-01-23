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
import { checkPermissions } from '../../utils/checkPermissions.js';
import embedBuilder from '../../utils/embedBuilder.js';

const embedCache = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName('embed2')
        .setDescription('Cria uma embed personalizada')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id, 
                interaction.guild.id,  'admin',
                interaction.member
            );

            console.log('Verificando permissões para:', interaction.user.tag);
            console.log('ID do usuário:', interaction.user.id);
            console.log('ID do servidor:', interaction.guild.id);
            console.log('Tem permissão:', hasPermission);

            if (!hasPermission) {
                const errorEmbed = embedBuilder.error( 'Sem Permissão', 'Você precisa ser um administrador para usar este comando.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Create initial embed
            const embed = new EmbedBuilder()
                .setDescription('Clique nos botões abaixo para personalizar a embed')
                .setColor('#2f3136');

            // Create buttons for editing
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('embed_title')
                    .setLabel('Título')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('embed_description')
                    .setLabel('Descrição')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('embed_color')
                    .setLabel('Cor')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('embed_thumbnail')
                    .setLabel('Thumbnail')
                    .setStyle(ButtonStyle.Primary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('embed_image')
                    .setLabel('Imagem')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('embed_footer')
                    .setLabel('Rodapé')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('embed_author')
                    .setLabel('Autor')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('embed_field')
                    .setLabel('Campo')
                    .setStyle(ButtonStyle.Success)
            );

            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('embed_send')
                    .setLabel('Enviar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('embed_preview')
                    .setLabel('Visualizar')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('embed_cancel')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Danger)
            );

            const response = await interaction.reply({
                embeds: [embed],
                components: [row1, row2, row3],
                ephemeral: true
            });

            // Store the embed in cache
            embedCache.set(interaction.user.id, {
                embed: embed,
                message: response,
                fields: [],
                lastInteraction: interaction
            });

            // Create collector for buttons
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 900000 // 15 minutes
            });

            collector.on('collect', async i => {
                const userData = embedCache.get(interaction.user.id);
                if (!userData) return;
                
                // Update last interaction
                userData.lastInteraction = i;
                embedCache.set(interaction.user.id, userData);

                switch (i.customId) {
                    case 'embed_title':
                        await handleTitleModal(i);
                        break;
                    case 'embed_description':
                        await handleDescriptionModal(i);
                        break;
                    case 'embed_color':
                        await handleColorModal(i);
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
                    case 'embed_field':
                        await handleFieldModal(i);
                        break;
                    case 'embed_preview':
                        await handlePreview(i, userData);
                        break;
                    case 'embed_send':
                        await handleSendModal(i, userData);
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
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({
                        content: 'Tempo esgotado. Por favor, inicie o comando novamente.',
                        embeds: [],
                        components: []
                    });
                    embedCache.delete(interaction.user.id);
                }
            });
        } catch (error) {
            console.error('Erro ao executar comando embed2:', error);
            const errorEmbed = embedBuilder.error( 'Erro ao Criar Embed', 'Ocorreu um erro ao tentar criar a embed. Por favor, tente novamente.'
            );
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

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

async function handlePreview(interaction, userData) {
    await interaction.reply({
        content: 'Prévia da sua embed:',
        embeds: [userData.embed],
        ephemeral: true
    });
}

async function handleSendModal(interaction, userData) {
    try {
        // Get text channels and limit to 25 options
        const channels = interaction.guild.channels.cache
            .filter(channel => channel.type === 0) // Only text channels
            .first(25) // Limit to 25 channels
            .map(channel => ({

                label: channel.name.slice(0, 25), // Limit label length
                value: channel.id,
                description: `ID: ${channel.id}`.slice(0, 50) // Limit description length
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
            // If the original interaction failed, try to use the last known interaction
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
