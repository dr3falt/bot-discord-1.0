const urlRegex = /(https?:\/\/[^\s]+)/g;
const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/g;
const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

class MessageAnalyzer {
    static containsLink(content) {
        return urlRegex.test(content);
    }

    static containsInvite(content) {
        return inviteRegex.test(content);
    }

    static containsIP(content) {
        return ipRegex.test(content);
    }

    static isAllowed(content, whitelistedDomains) {
        if (!content.match(urlRegex)) return true;
        
        const urls = content.match(urlRegex);
        return urls.every(url => {
            try {
                const domain = new URL(url).hostname;
                return whitelistedDomains.some(allowed => domain.includes(allowed));
            } catch {
                return false;
            }
        });
    }

    static countMentions(message) {
        const userMentions = message.mentions.users.size;
        const roleMentions = message.mentions.roles.size;
        const everyoneMention = message.mentions.everyone ? 1 : 0;
        return userMentions + roleMentions + everyoneMention;
    }

    static isSpam(content) {
        // Verifica repetição de caracteres
        const repeatedChars = content.match(/(.)\1{4,}/g);
        if (repeatedChars) return true;

        // Verifica mensagens muito longas
        if (content.length > 1000 && content.split(' ').length < 10) return true;

        // Verifica CAPS LOCK
        const upperCount = content.replace(/[^A-Z]/g, '').length;
        const totalChars = content.replace(/[^a-zA-Z]/g, '').length;
        if (totalChars > 10 && upperCount / totalChars > 0.7) return true;

        return false;
    }

    static hasPermission(member, protection, type) {
        if (!member) return false;

        // Verifica roles na whitelist
        const hasWhitelistedRole = member.roles.cache.some(role => 
            protection[type].whitelistedRoles.includes(role.id)
        );

        if (hasWhitelistedRole) return true;

        // Verifica permissões de administrador
        if (member.permissions.has('Administrator')) return true;

        return false;
    }

    static async handleViolation(message, type, protection, punishmentManager) {
        const { punishment, warnMessage, autoMute, muteDuration } = protection[type];

        if (!(await punishmentManager.shouldPunish(message.author.id, message.guild.id, type))) {
            return;
        }

        try {
            if (punishment === 'delete') {
                await message.delete();
            }

            if (warnMessage) {
                const warningCount = await punishmentManager.addWarning(
                    message.author.id,
                    message.guild.id,
                    `Violação de ${type}`
                );

                const embed = await punishmentManager.createPunishmentEmbed(
                    'warn',
                    message.author,
                    `Violação de ${type} (Aviso #${warningCount})`
                );

                await message.channel.send({ embeds: [embed] });
            }

            if (autoMute && warningCount >= 3) {
                await punishmentManager.muteUser(
                    message.member,
                    muteDuration,
                    `Múltiplas violações de ${type}`
                );

                const muteEmbed = await punishmentManager.createPunishmentEmbed(
                    'mute',
                    message.author,
                    `Múltiplas violações de ${type}`,
                    muteDuration
                );

                await message.channel.send({ embeds: [muteEmbed] });
            }
        } catch (error) {
            console.error(`Erro ao lidar com violação de ${type}:`, error);
        }
    }
}

export default MessageAnalyzer;
