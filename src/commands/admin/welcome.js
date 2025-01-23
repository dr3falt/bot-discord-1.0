import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importações necessárias
import { SlashCommandBuilder  } from 'discord.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder  } from 'discord.js';
import { PermissionFlagsBits  } from 'discord.js';
import fs from 'fs';
import path from 'path';
import JsonDatabase from '../../utils/jsonDatabase.js';

// Classe para gerenciar configurações
class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '../../database/config.json');
        this.ensureConfigFile();
    }

    ensureConfigFile() {
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.configPath)) {
            fs.writeFileSync(this.configPath, JSON.stringify({}, null, 2));
        }
    }

    async read() {
        try {
            const data = await fs.promises.readFile(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Erro ao ler configuração:', error);
            return {};
        }
    }

    async write(config) {
        try {
            await fs.promises.writeFile(this.configPath, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            return false;
        }
    }

    async getGuildConfig(guildId) {
        const config = await this.read();
        if (!config[guildId]) {
            config[guildId] = this.getDefaultConfig();
            await this.write(config);
        }
        return config[guildId];
    }

    async updateGuildConfig(guildId, newConfig) {
        const config = await this.read();
        config[guildId] = { ...this.getDefaultConfig(), ...newConfig };
        return await this.write(config);
    }

    getDefaultConfig() {
        return {
            welcome: {
                enabled: false,
                channelId: null,
                type: 'text',
                message: 'Bem-vindo(a) {user} ao {server}!',
                color: '#3498db',
                title: 'Bem-vindo(a)!',
                banner: null,
                thumbnail: null,
                author: null,
                footer: null,
                fields: []
            }
        };
    }
}

// Classe para gerenciar embeds
class EmbedManager {
    static createMainEmbed(welcomeConfig) {
        return new EmbedBuilder()
            .setTitle('⚙️ Configuração de Boas-vindas')
            .setDescription(
                `Configure as mensagens de boas-vindas do servidor.\n\n` +
                `**Status:** ${welcomeConfig.enabled ? '✅ Ativado' : '❌ Desativado'}\n` +
                `**Canal:** ${welcomeConfig.channelId ? `<#${welcomeConfig.channelId}>` : 'Não configurado'}\n` +
                `**Tipo:** ${this.getTypeLabel(welcomeConfig.type)}`
            )
            .setColor(welcomeConfig.color || '#3498db')
            .setFooter({ text: 'Use os botões abaixo para configurar' });
    }

    static getTypeLabel(type) {
        switch (type) {
            case 'embed_full': return 'Embed Completa';
            case 'embed_simple': return 'Embed Simples';
            default: return 'Texto Simples';
        }
    }

    static createPreviewEmbed(welcomeConfig, member, guild) {
        const embed = new EmbedBuilder();
        
        if (welcomeConfig.type.startsWith('embed')) {
            if (welcomeConfig.color) embed.setColor(welcomeConfig.color);
            if (welcomeConfig.title) embed.setTitle(welcomeConfig.title);
            if (welcomeConfig.message) {
                const processedMessage = this.processMessageVariables(welcomeConfig.message, member, guild);
                embed.setDescription(processedMessage);
            }
            if (welcomeConfig.banner) embed.setImage(welcomeConfig.banner);
            if (welcomeConfig.thumbnail) embed.setThumbnail(welcomeConfig.thumbnail);
            if (welcomeConfig.author) embed.setAuthor({ name: welcomeConfig.author });
            if (welcomeConfig.footer) embed.setFooter({ text: welcomeConfig.footer });
            if (welcomeConfig.fields?.length > 0) {
                embed.addFields(welcomeConfig.fields);
            }
        }

        return embed;
    }

    static processMessageVariables(message, member, guild) {
        return message
            .replace(/{user}/g, member.toString())
            .replace(/{user\.tag}/g, member.user.tag)
            .replace(/{user\.name}/g, member.user.username)
            .replace(/{server}/g, guild.name)
            .replace(/{memberCount}/g, guild.memberCount.toString());
    }
}

// Classe para gerenciar componentes (botões e menus)
class ComponentManager {
    static createMainButtons(welcomeConfig) {
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('welcome_toggle')
                    .setLabel(welcomeConfig.enabled ? 'Desativar' : 'Ativar')
                    .setStyle(welcomeConfig.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji(welcomeConfig.enabled ? '❌' : '✅'),
                new ButtonBuilder()
                    .setCustomId('welcome_channel')
                    .setLabel('Canal')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝')
                    .setDisabled(!welcomeConfig.enabled),
                new ButtonBuilder()
                    .setCustomId('welcome_message')
                    .setLabel('Mensagem')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️')
                    .setDisabled(!welcomeConfig.enabled)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('welcome_type')
                    .setLabel('Tipo')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎨')
                    .setDisabled(!welcomeConfig.enabled),
                new ButtonBuilder()
                    .setCustomId('welcome_preview')
                    .setLabel('Visualizar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👁️')
                    .setDisabled(!welcomeConfig.enabled || !welcomeConfig.message)
            );

        return [row1, row2];
    }

    static createChannelSelect(channels, currentPage = 0, totalPages = 1) {
        const select = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('welcome_channel_select')
                    .setPlaceholder('Selecione um canal')
                    .addOptions(channels.map(c => ({
                        label: `#${c.name}`,
                        value: c.id
                    })))
            );

        const navigation = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('welcome_channel_prev')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('welcome_channel_next')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('welcome_channel_cancel')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Danger)
            );

        return [select, navigation];
    }
}

// Instância do gerenciador de configuração
const configManager = new ConfigManager();

// Comando principal
export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configura o sistema de boas-vindas')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            // Validação inicial
            if (!interaction.guild) {
                return await interaction.reply({
                    content: '❌ Este comando só pode ser usado em servidores.',
                    ephemeral: true
                });
            }

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return await interaction.reply({
                    content: '❌ Você precisa ter permissão para gerenciar o servidor.',
                    ephemeral: true
                });
            }

            // Inicialização
            const guildId = interaction.guild.id;
            const guildConfig = await configManager.getGuildConfig(guildId);
            const welcomeConfig = guildConfig.welcome;

            // Criação da interface inicial
            const mainEmbed = EmbedManager.createMainEmbed(welcomeConfig);
            const mainButtons = ComponentManager.createMainButtons(welcomeConfig);

            // Envia a mensagem inicial
            const reply = await interaction.reply({
                embeds: [mainEmbed],
                components: mainButtons,
                ephemeral: true
            });

            // Coletor de interações
            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 minutos
            });

            // Handler de interações
            collector.on('collect', async (i) => {
                try {
                    await handleInteraction(i, guildId, welcomeConfig);
                } catch (error) {
                    console.error('Erro ao processar interação:', error);
                    await i.reply({
                        content: '❌ Ocorreu um erro ao processar sua ação.',
                        ephemeral: true
                    });
                }
            });

            // Handler de fim do coletor
            collector.on('end', async () => {
                try {
                    await reply.edit({
                        content: '⏰ Tempo esgotado! Use o comando novamente se precisar.',
                        components: []
                    });
                } catch {}
            });

        } catch (error) {
            console.error('Erro ao executar comando:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                ephemeral: true
            });
        }
    }
};

// Função para processar interações
async function handleInteraction(interaction, guildId, welcomeConfig) {
    const { customId } = interaction;

    switch (customId) {
        case 'welcome_toggle':
            await handleToggle(interaction, guildId, welcomeConfig);
            break;

        case 'welcome_channel':
            await handleChannelSelect(interaction, guildId, welcomeConfig);
            break;

        case 'welcome_message':
            await handleMessage(interaction, guildId, welcomeConfig);
            break;

        case 'welcome_type':
            await handleType(interaction, guildId, welcomeConfig);
            break;

        case 'welcome_preview':
            await handlePreview(interaction, welcomeConfig);
            break;

        default:
            await interaction.reply({
                content: '❌ Ação inválida!',
                ephemeral: true
            });
    }
}

// Funções auxiliares para cada tipo de interação
async function handleToggle(interaction, guildId, welcomeConfig) {
    welcomeConfig.enabled = !welcomeConfig.enabled;
    await configManager.updateGuildConfig(guildId, { welcome: welcomeConfig });

    const mainEmbed = EmbedManager.createMainEmbed(welcomeConfig);
    const mainButtons = ComponentManager.createMainButtons(welcomeConfig);

    await interaction.update({
        embeds: [mainEmbed],
        components: mainButtons
    });
}

async function handleChannelSelect(interaction, guildId, welcomeConfig) {
    const channels = interaction.guild.channels.cache
        .filter(c => c.type === 0)
        .map(c => ({
            id: c.id,
            name: c.name
        }));

    if (channels.length === 0) {
        await interaction.reply({
            content: '❌ Não encontrei nenhum canal de texto.',
            ephemeral: true
        });
        return;
    }

    const components = ComponentManager.createChannelSelect(channels);
    await interaction.update({ components });
}

async function handleMessage(interaction, guildId, welcomeConfig) {
    const embed = new EmbedBuilder()
        .setTitle('📝 Editar Mensagem')
        .setDescription( 'Digite a nova mensagem no chat.\n\n' + 'Variáveis disponíveis:\n' + '`{user}` - Menciona o usuário\n' + '`{server}` - Nome do servidor\n' + '`{memberCount}` - Número de membros\n\n' + 'Digite `cancelar` para cancelar.'
        )
        .setColor('#3498db');

    await interaction.update({
        embeds: [embed],
        components: []
    });

    // Coletor de mensagens
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1
    });

    collector.on('collect', async (m) => {
        await m.delete().catch(() => {});

        if (m.content.toLowerCase() === 'cancelar') {
            const mainEmbed = EmbedManager.createMainEmbed(welcomeConfig);
            const mainButtons = ComponentManager.createMainButtons(welcomeConfig);

            await interaction.editReply({
                content: '❌ Operação cancelada!',
                embeds: [mainEmbed],
                components: mainButtons
            });
            return;
        }

        welcomeConfig.message = m.content;
        await configManager.updateGuildConfig(guildId, { welcome: welcomeConfig });

        const mainEmbed = EmbedManager.createMainEmbed(welcomeConfig);
        const mainButtons = ComponentManager.createMainButtons(welcomeConfig);

        await interaction.editReply({
            content: '✅ Mensagem atualizada!',
            embeds: [mainEmbed],
            components: mainButtons
        });
    });
}

async function handleType(interaction, guildId, welcomeConfig) {
    const typeSelect = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('welcome_type_select')
                .setPlaceholder('Selecione o tipo')
                .addOptions([
                    {
                        label: 'Texto Simples',
                        description: 'Mensagem normal de texto',
                        value: 'text'
                    },
                    {
                        label: 'Embed Simples',
                        description: 'Embed com mensagem e cor',
                        value: 'embed_simple'
                    },
                    {
                        label: 'Embed Completa',
                        description: 'Embed com todas as opções',
                        value: 'embed_full'
                    }
                ])
        );

    await interaction.update({
        content: 'Escolha o tipo de mensagem:',
        embeds: [],
        components: [typeSelect]
    });
}

async function handlePreview(interaction, welcomeConfig) {
    try {
        const previewEmbed = EmbedManager.createPreviewEmbed(
            welcomeConfig,
            interaction.member,
            interaction.guild
        );

        await interaction.reply({
            content: 'Prévia da mensagem de boas-vindas:',
            embeds: [previewEmbed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Erro ao gerar prévia:', error);
        await interaction.reply({
            content: '❌ Erro ao gerar prévia. Verifique as configurações.',
            ephemeral: true
        });
    }
}
