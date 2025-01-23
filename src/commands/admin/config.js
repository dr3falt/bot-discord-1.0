import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits  } from 'discord.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';

const configDb = new JsonDatabase(path.join(__dirname, '../../database/config.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Visualiza as configurações do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const config = await configDb.read();
            const guildConfig = config[interaction.guildId] || {};

            const embed = new EmbedBuilder()
                .setColor(config.embedColor || 0x0099ff)
                .setTitle('⚙️ Configurações do Servidor')
                .setDescription('Aqui estão as configurações atuais do servidor:')
                .addFields(
                    { 
                        name: '🤖 Auto-Moderação', 
                        value: guildConfig.automod ? this.formatAutomodStatus(guildConfig.automod) : '❌ Não configurado\nUse `/automod` para configurar', 
                        inline: false 
                    },
                    { 
                        name: '📝 Logs', 
                        value: guildConfig.logs ? this.formatLogsStatus(guildConfig.logs) : '❌ Não configurado\nUse `/logs` para configurar', 
                        inline: false 
                    },
                    { 
                        name: '👋 Boas-vindas', 
                        value: guildConfig.welcome ? this.formatWelcomeStatus(guildConfig.welcome) : '❌ Não configurado\nUse `/welcome` para configurar', 
                        inline: false 
                    },
                    { 
                        name: '🎭 Cargo Automático', 
                        value: guildConfig.autoRole ? this.formatAutoroleStatus(guildConfig.autoRole) : '❌ Não configurado\nUse `/autorole` para configurar', 
                        inline: false 
                    }
                )
                .setFooter({ text: 'Use os comandos específicos para alterar cada configuração' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Erro ao executar comando config:', error);
            await interaction.reply({
                content: '❌ Houve um erro ao executar o comando.',
                ephemeral: true
            });
        }
    },

    formatAutomodStatus(automod) {
        const status = [];
        
        if (automod.antilink?.enabled) status.push('🔗 Anti-Link: ✅');
        if (automod.antispam?.enabled) status.push('🔄 Anti-Spam: ✅');
        if (automod.antiinvite?.enabled) status.push('📨 Anti-Invite: ✅');
        
        return status.length > 0 ? status.join('\n') : '❌ Nenhuma proteção ativa';
    },

    formatLogsStatus(logs) {
        const status = [];
        
        if (logs.mod?.enabled) status.push('🔨 Moderação: ✅');
        if (logs.member?.enabled) status.push('👥 Membros: ✅');
        if (logs.message?.enabled) status.push('💬 Mensagens: ✅');
        if (logs.server?.enabled) status.push('⚙️ Servidor: ✅');
        
        return status.length > 0 ? status.join('\n') : '❌ Nenhum log ativo';
    },

    formatWelcomeStatus(welcome) {
        if (!welcome.enabled) return '❌ Desativado';
        return `✅ Ativado\n📝 Canal: <#${welcome.channelId}>`;
    },

    formatAutoroleStatus(autoRole) {
        if (!autoRole.enabled) return '❌ Desativado';
        return `✅ Ativado\n👥 Cargo: <@&${autoRole.roleId}>`;
    }
};
