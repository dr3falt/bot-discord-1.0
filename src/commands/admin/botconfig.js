import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits  } from 'discord.js';
import config from '../../config/botConfig.js';
import embedBuilder from '../../utils/embedBuilder.js';
import permissionManager from '../../utils/permissionManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('botconfig')
        .setDescription('Configura a aparência do bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Altera o avatar do bot')
                .addAttachmentOption(option =>
                    option.setName('imagem')
                        .setDescription('Nova imagem de avatar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nome')
                .setDescription('Altera o nome do bot')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Novo nome para o bot')
                        .setRequired(true)
                        .setMinLength(2)
                        .setMaxLength(32)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('emoji')
                .setDescription('Gerencia emojis do bot no servidor')
                .addStringOption(option =>
                    option.setName('ação')
                        .setDescription('Ação a ser realizada')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover', value: 'remove' },
                            { name: 'Listar', value: 'list' }
                        ))
                .addAttachmentOption(option =>
                    option.setName('imagem')
                        .setDescription('Imagem do emoji (apenas para adicionar)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome do emoji')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID do emoji para remover')
                        .setRequired(false))),

    async execute(interaction) {
        try {
            // Verifica permissões usando o permissionManager
            const hasPermission = await permissionManager.checkPermission(
                interaction.member, 'botconfig',
                interaction.guild.id
            );

            if (!hasPermission) {
                return await interaction.reply({
                    embeds: [embedBuilder.error( 'Sem Permissão', 'Você não tem permissão para usar este comando.'
                    )],
                    ephemeral: true
                });
            }

            // Verifica se o comando está na lista de comandos negados
            const isDenied = await permissionManager.isCommandDenied(
                interaction.member, 'botconfig',
                interaction.guild.id
            );

            if (isDenied) {
                return await interaction.reply({
                    embeds: [embedBuilder.error( 'Comando Negado', 'Este comando foi especificamente negado para você.'
                    )],
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'avatar':
                    await handleAvatarChange(interaction);
                    break;
                case 'nome':
                    await handleNameChange(interaction);
                    break;
                case 'emoji':
                    await handleEmojiManagement(interaction);
                    break;
            }

            // Registra o uso do comando
            await permissionManager.logCommandUsage(
                interaction.member.id, 'botconfig',
                interaction.guild.id,
                {
                    subcommand,
                    success: true
                }
            );

        } catch (error) {
            console.error('Erro no comando botconfig:', error);
            
            // Registra o erro
            await permissionManager.logCommandUsage(
                interaction.member.id, 'botconfig',
                interaction.guild.id,
                {
                    subcommand: interaction.options.getSubcommand(),
                    success: false,
                    error: error.message
                }
            );

            await interaction.reply({
                embeds: [embedBuilder.error('Erro', error.message)],
                ephemeral: true
            });
        }
    },

    // Informações para o sistema de permissões
    permissions: {
        name: 'botconfig',
        description: 'Configura a aparência do bot',
        defaultLevel: config.permissions.levels.ADMIN,
        category: 'ADMIN',
        subcommands: {
            avatar: {
                description: 'Altera o avatar do bot',
                defaultLevel: config.permissions.levels.ADMIN
            },
            nome: {
                description: 'Altera o nome do bot',
                defaultLevel: config.permissions.levels.ADMIN
            },
            emoji: {
                description: 'Gerencia emojis do bot no servidor',
                defaultLevel: config.permissions.levels.ADMIN
            }
        }
    }
};

async function handleAvatarChange(interaction) {
    const image = interaction.options.getAttachment('imagem');
    
    // Verifica se o arquivo é uma imagem
    if (!image.contentType?.startsWith('image/')) {
        throw new Error('O arquivo deve ser uma imagem (PNG, JPG, GIF)');
    }

    // Verifica o tamanho máximo (8MB)
    if (image.size > 8388608) {
        throw new Error('A imagem deve ter no máximo 8MB');
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        await interaction.client.user.setAvatar(image.url);
        
        const embed = embedBuilder.success( 'Avatar Atualizado', 'O avatar do bot foi alterado com sucesso!'
        ).setImage(image.url);

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        if (error.code === 50035) {
            throw new Error('Você está alterando o avatar muito rápido. Aguarde alguns minutos.');
        }
        throw error;
    }
}

async function handleNameChange(interaction) {
    const newName = interaction.options.getString('nome');

    await interaction.deferReply({ ephemeral: true });

    try {
        await interaction.client.user.setUsername(newName);
        
        const embed = embedBuilder.success( 'Nome Atualizado',
            `O nome do bot foi alterado para: ${newName}`
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        if (error.code === 50035) {
            throw new Error('Você está alterando o nome muito rápido. Aguarde algumas horas.');
        }
        throw error;
    }
}

async function handleEmojiManagement(interaction) {
    const action = interaction.options.getString('ação');
    
    switch (action) {
        case 'add':
            await handleAddEmoji(interaction);
            break;
        case 'remove':
            await handleRemoveEmoji(interaction);
            break;
        case 'list':
            await handleListEmojis(interaction);
            break;
    }
}

async function handleAddEmoji(interaction) {
    const image = interaction.options.getAttachment('imagem');
    const name = interaction.options.getString('nome');

    if (!image || !name) {
        throw new Error('Para adicionar um emoji, forneça uma imagem e um nome');
    }

    // Verifica se o arquivo é uma imagem
    if (!image.contentType?.startsWith('image/')) {
        throw new Error('O arquivo deve ser uma imagem (PNG, JPG, GIF)');
    }

    // Verifica o tamanho máximo (256KB)
    if (image.size > 262144) {
        throw new Error('A imagem deve ter no máximo 256KB');
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const emoji = await interaction.guild.emojis.create({
            attachment: image.url,
            name: name
        });

        const embed = embedBuilder.success( 'Emoji Adicionado',
            `Emoji ${emoji} foi adicionado com sucesso!`
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        if (error.code === 50035) {
            throw new Error('O servidor atingiu o limite máximo de emojis');
        }
        throw error;
    }
}

async function handleRemoveEmoji(interaction) {
    const emojiId = interaction.options.getString('id');

    if (!emojiId) {
        throw new Error('Forneça o ID do emoji para remover');
    }

    const emoji = interaction.guild.emojis.cache.get(emojiId);
    if (!emoji) {
        throw new Error('Emoji não encontrado');
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        await emoji.delete();
        
        const embed = embedBuilder.success( 'Emoji Removido',
            `O emoji ${emoji.name} foi removido com sucesso!`
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        throw new Error('Não foi possível remover o emoji');
    }
}

async function handleListEmojis(interaction) {
    const emojis = interaction.guild.emojis.cache;
    
    if (emojis.size === 0) {
        throw new Error('Este servidor não possui emojis personalizados');
    }

    const staticEmojis = emojis.filter(emoji => !emoji.animated);
    const animatedEmojis = emojis.filter(emoji => emoji.animated);

    const embed = new EmbedBuilder()
        .setColor(config.embeds.colors.info)
        .setTitle('📋 Lista de Emojis')
        .setDescription('Lista de todos os emojis personalizados do servidor')
        .addFields(
            {
                name: `🖼️ Emojis Estáticos (${staticEmojis.size})`,
                value: staticEmojis.size > 0 
                    ? staticEmojis.map(emoji => `${emoji} \`:${emoji.name}:\` \`${emoji.id}\``).join('\n')
                    : 'Nenhum emoji estático',
                inline: false
            },
            {
                name: `✨ Emojis Animados (${animatedEmojis.size})`,
                value: animatedEmojis.size > 0
                    ? animatedEmojis.map(emoji => `${emoji} \`:${emoji.name}:\` \`${emoji.id}\``).join('\n')
                    : 'Nenhum emoji animado',
                inline: false
            }
        )
        .setFooter({
            text: `Total: ${emojis.size} emojis • Limite: ${interaction.guild.premiumTier * 50 + 50} emojis`
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
