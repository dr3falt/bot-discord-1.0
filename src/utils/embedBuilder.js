import { EmbedBuilder  } from 'discord.js';;

const defaultColors = {
    primary: '#0099ff',
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff0000',
    info: '#00ffff'
};

const defaultFooter = {
    text: 'ByteBot • Security System',
    iconURL: 'https://i.imgur.com/AfFp7pu.png'
};

class EmbedBuilderUtil {
    static success(title, description) {
        return new EmbedBuilder()
            .setColor(defaultColors.success)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setFooter(defaultFooter)
            .setTimestamp();
    }

    static error(title, description) {
        return new EmbedBuilder()
            .setColor(defaultColors.error)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setFooter(defaultFooter)
            .setTimestamp();
    }

    static warning(title, description) {
        return new EmbedBuilder()
            .setColor(defaultColors.warning)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setFooter(defaultFooter)
            .setTimestamp();
    }

    static info(title, description) {
        return new EmbedBuilder()
            .setColor(defaultColors.info)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setFooter(defaultFooter)
            .setTimestamp();
    }

    static primary(title, description) {
        return new EmbedBuilder()
            .setColor(defaultColors.primary)
            .setTitle(title)
            .setDescription(description)
            .setFooter(defaultFooter)
            .setTimestamp();
    }

    static custom({ title, description, color, fields, thumbnail, image, author, footer }) {
        const embed = new EmbedBuilder()
            .setColor(color || defaultColors.primary)
            .setTimestamp();

        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (fields) embed.addFields(fields);
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        if (author) embed.setAuthor(author);
        if (footer) {
            embed.setFooter(footer);
        } else {
            embed.setFooter(defaultFooter);
        }

        return embed;
    }

    static moderationEmbed(action, user, moderator, reason) {
        return new EmbedBuilder()
            .setColor(defaultColors.primary)
            .setTitle(`🛡️ ${action}`)
            .addFields([
                { name: 'Usuário', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderador', value: `${moderator.tag}`, inline: true },
                { name: 'Motivo', value: reason || 'Nenhum motivo fornecido' }
            ])
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter(defaultFooter)
            .setTimestamp();
    }

    static helpEmbed(title, commands, footer) {
        return new EmbedBuilder()
            .setColor(defaultColors.info)
            .setTitle(`📚 ${title}`)
            .setDescription(commands.map(cmd => `\`${cmd.name}\` - ${cmd.description}`).join('\n'))
            .setFooter(footer || defaultFooter)
            .setTimestamp();
    }

    static statsEmbed(title, stats) {
        const fields = Object.entries(stats).map(([name, value]) => {
            if (typeof value === 'object') {
                return {
                    name: name,
                    value: Object.entries(value)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n'),
                    inline: true
                };
            }
            return {
                name: name,
                value: value.toString(),
                inline: true
            };
        });

        return new EmbedBuilder()
            .setColor(defaultColors.primary)
            .setTitle(`📊 ${title}`)
            .addFields(fields)
            .setFooter(defaultFooter)
            .setTimestamp();
    }

    static serverInfoEmbed(guild) {
        return new EmbedBuilder()
            .setColor(defaultColors.primary)
            .setTitle(`📌 Informações do Servidor`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields([
                { name: 'Nome', value: guild.name, inline: true },
                { name: 'ID', value: guild.id, inline: true },
                { name: 'Dono', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Membros', value: guild.memberCount.toString(), inline: true },
                { name: 'Canais', value: guild.channels.cache.size.toString(), inline: true },
                { name: 'Cargos', value: guild.roles.cache.size.toString(), inline: true },
                { name: 'Criado em', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
            ])
            .setFooter(defaultFooter)
            .setTimestamp();
    }

    static userInfoEmbed(member) {
        return new EmbedBuilder()
            .setColor(defaultColors.primary)
            .setTitle(`👤 Informações do Usuário`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                { name: 'Nome', value: member.user.tag, inline: true },
                { name: 'ID', value: member.id, inline: true },
                { name: 'Nickname', value: member.nickname || 'Nenhum', inline: true },
                { name: 'Conta Criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Entrou no Servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Cargos', value: member.roles.cache.size > 1 ? member.roles.cache.map(r => `<@&${r.id}>`).join(', ') : 'Nenhum' }
            ])
            .setFooter(defaultFooter)
            .setTimestamp();
    }
}

export { EmbedBuilderUtil as EmbedBuilder };
export default EmbedBuilderUtil;
