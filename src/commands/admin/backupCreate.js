import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits  } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { createGzip  } from 'zlib';
import { pipeline  } from 'stream/promises';
import { Readable  } from 'stream';
import { generateBackupId, ensureBackupDirExists  } from '../../utils/backupUtils.js';

async function handleCreateBackup(interaction, backupDir) {
    await interaction.deferReply();

    const backup = {
        id: generateBackupId(),
        name: interaction.options.getString('nome') || interaction.guild.name,
        description: interaction.options.getString('descrição') || 'Backup automático',
        icon: interaction.guild.iconURL(),
        createdAt: Date.now(),
        createdBy: interaction.user.id,
        serverInfo: {
            name: interaction.guild.name,
            icon: interaction.guild.iconURL(),
            banner: interaction.guild.bannerURL(),
            splash: interaction.guild.splashURL(),
            features: interaction.guild.features,
            verificationLevel: interaction.guild.verificationLevel,
            explicitContentFilter: interaction.guild.explicitContentFilter,
            defaultMessageNotifications: interaction.guild.defaultMessageNotifications
        },
        channels: [],
        categories: [],
        roles: [],
        emojis: [],
        bans: [],
        settings: {}
    };

    // Backup de categorias e canais organizados
    const categories = interaction.guild.channels.cache.filter(c => c.type === 4);
    categories.forEach(category => {
        const categoryData = {
            name: category.name,
            position: category.position,
            permissions: category.permissionOverwrites.cache.map(perm => ({
                id: perm.id,
                type: perm.type,
                allow: perm.allow.toArray(),
                deny: perm.deny.toArray()
            }))
        };
        backup.categories.push(categoryData);

        // Canais da categoria
        const channels = interaction.guild.channels.cache
            .filter(c => c.parentId === category.id)
            .sort((a, b) => a.position - b.position);

        channels.forEach(channel => {
            const channelData = {
                name: channel.name,
                type: channel.type,
                position: channel.position,
                topic: channel.topic,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser,
                bitrate: channel.bitrate,
                userLimit: channel.userLimit,
                parent: category.name,
                permissions: channel.permissionOverwrites.cache.map(perm => ({
                    id: perm.id,
                    type: perm.type,
                    allow: perm.allow.toArray(),
                    deny: perm.deny.toArray()
                }))
            };
            backup.channels.push(channelData);
        });
    });

    // Canais sem categoria
    const uncategorizedChannels = interaction.guild.channels.cache
        .filter(c => !c.parentId && c.type !== 4)
        .sort((a, b) => a.position - b.position);

    uncategorizedChannels.forEach(channel => {
        const channelData = {
            name: channel.name,
            type: channel.type,
            position: channel.position,
            topic: channel.topic,
            nsfw: channel.nsfw,
            rateLimitPerUser: channel.rateLimitPerUser,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            permissions: channel.permissionOverwrites.cache.map(perm => ({
                id: perm.id,
                type: perm.type,
                allow: perm.allow.toArray(),
                deny: perm.deny.toArray()
            }))
        };
        backup.channels.push(channelData);
    });

    // Backup de cargos
    const roles = interaction.guild.roles.cache
        .filter(role => !role.managed)
        .sort((a, b) => b.position - a.position);

    roles.forEach(role => {
        const roleData = {
            name: role.name,
            color: role.hexColor,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions.toArray(),
            mentionable: role.mentionable,
            icon: role.icon,
            unicodeEmoji: role.unicodeEmoji
        };
        backup.roles.push(roleData);
    });

    // Backup de emojis
    interaction.guild.emojis.cache.forEach(emoji => {
        const emojiData = {
            name: emoji.name,
            url: emoji.url,
            animated: emoji.animated,
            roles: emoji.roles.cache.map(r => r.name)
        };
        backup.emojis.push(emojiData);
    });

    // Backup de banimentos
    const bans = await interaction.guild.bans.fetch();
    bans.forEach(ban => {
        backup.bans.push({
            user: ban.user.id,
            reason: ban.reason
        });
    });

    // Configurações do servidor
    backup.settings = {
        verificationLevel: interaction.guild.verificationLevel,
        explicitContentFilter: interaction.guild.explicitContentFilter,
        defaultMessageNotifications: interaction.guild.defaultMessageNotifications,
        systemChannel: interaction.guild.systemChannel?.name,
        rulesChannel: interaction.guild.rulesChannel?.name,
        publicUpdatesChannel: interaction.guild.publicUpdatesChannel?.name,
        afkChannel: interaction.guild.afkChannel?.name,
        afkTimeout: interaction.guild.afkTimeout,
        premiumProgressBarEnabled: interaction.guild.premiumProgressBarEnabled
    };

    // Salva o backup comprimido
    const fileName = `backup_${backup.id}.json.gz`;
    const filePath = path.join(backupDir, fileName);

    const writeStream = fs.createWriteStream(filePath);
    const gzip = createGzip();

    try {
        const backupString = JSON.stringify(backup, null, 2);
        const backupBuffer = Buffer.from(backupString);
        const backupStream = Readable.from(backupBuffer);

        await pipeline(
            backupStream,
            gzip,
            writeStream
        );
    } catch (error) {
        console.error('Erro ao salvar o backup:', error);
        throw new Error('Falha ao salvar o backup');
    }

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(' Backup Criado com Sucesso')
        .setDescription(`**ID do Backup:** \`${backup.id}\``)
        .addFields(
            { name: 'Nome', value: backup.name, inline: true },
            { name: 'Descrição', value: backup.description, inline: true },
            { name: 'Criado por', value: `<@${backup.createdBy}>`, inline: true },
            { name: 'Categorias', value: backup.categories.length.toString(), inline: true },
            { name: 'Canais', value: backup.channels.length.toString(), inline: true },
            { name: 'Cargos', value: backup.roles.length.toString(), inline: true },
            { name: 'Emojis', value: backup.emojis.length.toString(), inline: true },
            { name: 'Banimentos', value: backup.bans.length.toString(), inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

export default {
    data: new SlashCommandBuilder()
        .setName('backup-create')
        .setDescription('Cria um backup do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome personalizado para o backup')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('descrição')
                .setDescription('Descrição do backup')
                .setRequired(false)),
    async execute(interaction) {
        const backupDir = path.join(__dirname, '../../database/backups');
        ensureBackupDirExists(backupDir);

        try {
            await handleCreateBackup(interaction, backupDir);
        } catch (error) {
            console.error('Erro ao executar comando backup-create:', error);
            const errorMessage = {
                content: 'Houve um erro ao criar o backup.',
                ephemeral: true
            };
            
            try {
                if (interaction.deferred) {
                    await interaction.editReply(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            } catch (replyError) {
                console.error('Erro ao responder à interação:', replyError);
            }
        }
    }
};
