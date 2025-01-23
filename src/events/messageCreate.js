import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Events  } from 'discord.js';;
import JsonDatabase from '../utils/jsonDatabase.js';;
import path from 'path';;
import embedBuilder from '../utils/embedBuilder.js';;

const protectionDb = new JsonDatabase(path.join(__dirname, '../database/protection.json'));

export default {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            // Ignora mensagens de bots
            if (message.author.bot) return;

            // Verifica sistema anti-link
            const protection = await protectionDb.read() || {};
            const guildId = message.guild?.id;

            if (!guildId) return; // Ignora DMs

            // Verifica se o anti-link está ativado
            if (!protection[guildId]?.antiLink?.enabled) return;

            const antiLink = protection[guildId].antiLink;
            const whitelistedChannels = antiLink.whitelistedChannels || [];
            const whitelistedUsers = antiLink.whitelistedUsers || [];

            // Verifica se o usuário é administrador
            const member = await message.guild.members.fetch(message.author.id);
            if (member.permissions.has('Administrator')) return;

            // Verifica se o canal ou usuário está na whitelist
            if (whitelistedChannels.includes(message.channel.id)) return;
            if (whitelistedUsers.includes(message.author.id)) return;

            // Regex para detectar links
            const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;

            if (linkRegex.test(message.content)) {
                // Tenta deletar a mensagem
                try {
                    await message.delete();

                    // Envia aviso
                    const warningEmbed = embedBuilder.warning(
                        '⚠️ Link Detectado',
                        `${message.author} você não tem permissão para enviar links neste canal.\nSua mensagem foi removida por segurança.`
                    );
                    
                    // Envia a mensagem de aviso e a mantém no canal
                    await message.channel.send({
                        embeds: [warningEmbed]
                    });

                } catch (error) {
                    console.error('Erro ao deletar mensagem com link:', error);
                }
            }
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    },
};
