import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pkg from 'wio.db';
const { JsonDB } = pkg;
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import Canvas from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new JsonDB({
    databasePath: path.join(__dirname, '../database/welcome.json')
});

class WelcomeHandler {
    constructor() {
        this.settings = new Map();
    }

    async initialize() {
        const data = await db.get('welcome');
        if (!data) {
            await db.set('welcome', {});
        } else {
            // Carregar configurações
            for (const [guildId, settings] of Object.entries(data)) {
                this.settings.set(guildId, settings);
            }
        }

        // Registrar fontes personalizadas
        Canvas.registerFont('./assets/fonts/Roboto-Regular.ttf', { family: 'Roboto' });
        Canvas.registerFont('./assets/fonts/Roboto-Bold.ttf', { family: 'Roboto Bold' });
    }

    async handleJoin(member) {
        const settings = this.settings.get(member.guild.id);
        if (!settings?.enabled) return;

        try {
            // Criar imagem de boas-vindas
            if (settings.imageEnabled) {
                const attachment = await this.createWelcomeImage(member, settings);
                await this.sendWelcome(member, settings, attachment);
            } else {
                await this.sendWelcome(member, settings);
            }

            // Atribuir cargos automáticos
            if (settings.autoRoles?.length > 0) {
                await this.assignRoles(member, settings.autoRoles);
            }
        } catch (error) {
            console.error(`Erro ao enviar mensagem de boas-vindas: ${error}`);
        }
    }

    async createWelcomeImage(member, settings) {
        const canvas = Canvas.createCanvas(1024, 500);
        const ctx = canvas.getContext('2d');

        // Carregar e desenhar background
        const background = await Canvas.loadImage(settings.backgroundUrl || './assets/images/default_welcome.png');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // Adicionar overlay semi-transparente
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Desenhar avatar
        const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(512, 166, 125, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 387, 41, 250, 250);
        ctx.restore();

        // Configurar texto
        ctx.font = '72px "Roboto Bold"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';

        // Adicionar texto de boas-vindas
        ctx.fillText('BEM-VINDO', 512, 355);
        
        // Adicionar nome do usuário
        ctx.font = '42px Roboto';
        ctx.fillText(member.user.tag, 512, 415);

        // Adicionar contador de membros
        ctx.font = '32px Roboto';
        ctx.fillText(`Você é o membro #${member.guild.memberCount}`, 512, 455);

        return new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });
    }

    async sendWelcome(member, settings, attachment = null) {
        const channel = await this.getChannel(settings.channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(settings.embedColor || '#00ff00')
            .setTitle(settings.title || '👋 Bem-vindo(a)!')
            .setDescription(this.formatMessage(settings.message || 'Bem-vindo(a) ao servidor!', member))
            .setTimestamp();

        if (attachment) {
            embed.setImage('attachment://welcome.png');
        }

        await channel.send({
            content: settings.mentionUser ? `<@${member.id}>` : null,
            embeds: [embed],
            files: attachment ? [attachment] : []
        });
    }

    async assignRoles(member, roleIds) {
        try {
            const roles = roleIds.map(id => member.guild.roles.cache.get(id)).filter(Boolean);
            if (roles.length > 0) {
                await member.roles.add(roles);
            }
        } catch (error) {
            console.error(`Erro ao atribuir cargos automáticos: ${error}`);
        }
    }

    formatMessage(message, member) {
        return message
            .replace(/{user}/g, member.user.username)
            .replace(/{usertag}/g, member.user.tag)
            .replace(/{userid}/g, member.user.id)
            .replace(/{server}/g, member.guild.name)
            .replace(/{membercount}/g, member.guild.memberCount);
    }

    async updateSettings(guildId, settings) {
        this.settings.set(guildId, settings);
        
        const data = await db.get('welcome');
        data[guildId] = settings;
        await db.set('welcome', data);
    }

    async getSettings(guildId) {
        return this.settings.get(guildId) || {
            enabled: false,
            channelId: null,
            imageEnabled: true,
            backgroundUrl: null,
            embedColor: '#00ff00',
            title: '👋 Bem-vindo(a)!',
            message: 'Bem-vindo(a) ao servidor!',
            mentionUser: true,
            autoRoles: []
        };
    }

    async getChannel(channelId) {
        try {
            return await this.client?.channels.fetch(channelId);
        } catch {
            return null;
        }
    }
}

export default new WelcomeHandler();
