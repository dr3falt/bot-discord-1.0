import { Events } from 'discord.js';
import { BotConfigManager } from '../utils/botConfigManager.js';
import { EmbedBuilder } from '../utils/embedBuilder.js';
import { createLogger } from '../utils/logger.js';
import { PermissionManager } from '../utils/permissionManager.js';

const configManager = new BotConfigManager();
const logger = createLogger('MemberEvents');
const permManager = new PermissionManager();

// Função para criar um evento estruturado
function createEvent(eventName, callback) {
    return {
        name: eventName,
        async execute(...args) {
            try {
                await callback(...args);
            } catch (error) {
                logger.error(`Erro ao executar o evento ${eventName}:`, error);
            }
        },
    };
}

// Função para criar um embed de boas-vindas ou despedida
function createMemberEmbed(member, guildConfig, action) {
    const embedColor = guildConfig.embedColor || '#2ecc71'; // Usando verde para boas-vindas por padrão
    let title, description, thumbnailColor;
    
    // Personalizar título e descrição com base na ação (entrada ou saída)
    if (action === 'join') {
        title = '👋 Bem-vindo!';
        description = `${member.user.tag} se juntou ao servidor!`;
        thumbnailColor = '#2ecc71'; // Verde
    } else if (action === 'leave') {
        title = '👋 Adeus!';
        description = `${member.user.tag} saiu do servidor.`;
        thumbnailColor = '#e74c3c'; // Vermelho
    }

    // Criar o embed
    return new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(title)
        .setDescription(description)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 2048 }))
        .addFields(
            { name: '🎫 Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '👥 Membros totais', value: member.guild.memberCount.toString(), inline: true }
        )
        .setTimestamp();
}

// Evento para quando um membro entra no servidor
const guildMemberAdd = createEvent(Events.GuildMemberAdd, async (member) => {
    try {
        logger.info(`Novo membro: ${member.user.tag}`);
        const guildConfig = await configManager.getGuildConfig(member.guild.id);

        if (guildConfig.welcome?.enabled && guildConfig.welcome.channelId) {
            const channel = await member.guild.channels.fetch(guildConfig.welcome.channelId);
            if (channel) {
                const embed = createMemberEmbed(member, guildConfig, 'join');
                await channel.send({ embeds: [embed] });
            }
        }

        if (guildConfig.autorole?.enabled && guildConfig.autorole.roleId) {
            const role = await member.guild.roles.fetch(guildConfig.autorole.roleId);
            if (role) {
                await member.roles.add(role);
                logger.info(`Cargo automático atribuído a ${member.user.tag}`);
            }
        }

        if (guildConfig.welcome?.dmEnabled && guildConfig.welcome.dmMessage) {
            try {
                await member.send(guildConfig.welcome.dmMessage);
            } catch (error) {
                logger.error(`Falha ao enviar DM para ${member.user.tag}`, error);
            }
        }
    } catch (error) {
        logger.error('Erro ao processar novo membro:', error);
    }
});

// Evento para quando um membro sai do servidor
const guildMemberRemove = createEvent(Events.GuildMemberRemove, async (member) => {
    try {
        logger.info(`Membro saiu: ${member.user.tag}`);
        const guildConfig = await configManager.getGuildConfig(member.guild.id);

        if (guildConfig.leave?.enabled && guildConfig.leave.channelId) {
            const channel = await member.guild.channels.fetch(guildConfig.leave.channelId);
            if (channel) {
                const embed = createMemberEmbed(member, guildConfig, 'leave');
                await channel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        logger.error('Erro ao processar saída de membro:', error);
    }
});

// Função para criar embed de log de atualização de membros
function createMemberUpdateEmbed(guildConfig, oldMember, newMember, addedRoles, removedRoles) {
    return new EmbedBuilder()
        .setColor(guildConfig.embedColor || '#3498db') // Azul padrão
        .setTitle('🔄 Alteração de Cargo')
        .setDescription(`Atualização de cargo para ${newMember.user.tag}`)
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 2048 }))
        .addFields(
            addedRoles.size > 0 ? { name: '➕ Cargos adicionados', value: addedRoles.map(r => r.toString()).join(', ') } : {},
            removedRoles.size > 0 ? { name: '➖ Cargos removidos', value: removedRoles.map(r => r.toString()).join(', ') } : {}
        )
        .setTimestamp();
}

// Evento para quando os dados de um membro são atualizados
const guildMemberUpdate = createEvent(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
        const guildConfig = await configManager.getGuildConfig(newMember.guild.id);
        const logChannelId = guildConfig.logChannel;

        if (!logChannelId) return;

        const logChannel = await newMember.guild.channels.fetch(logChannelId);
        if (!logChannel) return;

        // Verifica mudanças de cargo
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

        if (addedRoles.size > 0 || removedRoles.size > 0) {
            logger.info(`Cargos atualizados para ${newMember.user.tag}`);

            const embed = createMemberUpdateEmbed(guildConfig, oldMember, newMember, addedRoles, removedRoles);
            await logChannel.send({ embeds: [embed] });
        }

        // Verifica mudanças no apelido
        if (oldMember.nickname !== newMember.nickname) {
            logger.info(`Apelido atualizado para ${newMember.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(guildConfig.embedColor || '#f1c40f') // Amarelo
                .setTitle('📝 Apelido alterado')
                .setDescription(`O apelido de ${newMember.user.tag} foi alterado`)
                .addFields(
                    { name: 'Antigo', value: oldMember.nickname || 'Nenhum', inline: true },
                    { name: 'Novo', value: newMember.nickname || 'Nenhum', inline: true }
                )
                .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 2048 }))
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Erro ao processar atualização de membro:', error);
    }
});

// Evento para quando um membro é banido
const guildBanAdd = createEvent(Events.GuildBanAdd, async (ban) => {
    try {
        const guildConfig = await configManager.getGuildConfig(ban.guild.id);
        if (guildConfig.banLog?.enabled && guildConfig.banLog.channelId) {
            const channel = await ban.guild.channels.fetch(guildConfig.banLog.channelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c') // Vermelho para banimento
                    .setTitle('🚫 Membro Banido')
                    .setDescription(`${ban.user.tag} foi banido do servidor.`)
                    .setTimestamp();
                await channel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        logger.error('Erro ao processar banimento de membro:', error);
    }
});

// Evento para quando um membro é desbanido
const guildBanRemove = createEvent(Events.GuildBanRemove, async (ban) => {
    try {
        const guildConfig = await configManager.getGuildConfig(ban.guild.id);
        if (guildConfig.unbanLog?.enabled && guildConfig.unbanLog.channelId) {
            const channel = await ban.guild.channels.fetch(guildConfig.unbanLog.channelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('#2ecc71') // Verde para desbanimento
                    .setTitle('✅ Membro Desbanido')
                    .setDescription(`${ban.user.tag} foi desbanido do servidor.`)
                    .setTimestamp();
                await channel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        logger.error('Erro ao processar desbanimento de membro:', error);
    }
});

// Exportando os eventos
export default [
    guildMemberAdd,
    guildMemberRemove,
    guildBanAdd,
    guildBanRemove,
    guildMemberUpdate
];
