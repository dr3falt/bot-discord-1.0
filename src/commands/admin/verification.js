import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import embedBuilder from '../../utils/embedBuilder.js';
import { JsonDatabase } from 'wio.db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicialização dos bancos de dados
const configDb = new JsonDatabase({
    databasePath: path.join(__dirname, '../../database/config.json')
});
const verifiedDb = new JsonDatabase({
    databasePath: path.join(__dirname, '../../database/verified_users.json')
});

export default {
    data: new SlashCommandBuilder()
        .setName('verification')
        .setDescription('Configura o sistema de verificação')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configura o sistema de verificação')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo que será dado após a verificação')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal onde será enviada a mensagem de verificação')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('titulo')
                        .setDescription('Título da mensagem de verificação')
                        .setRequired(false)
                        .setMaxLength(256))
                .addStringOption(option =>
                    option.setName('descricao')
                        .setDescription('Descrição da mensagem de verificação')
                        .setRequired(false)
                        .setMaxLength(2000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Desativa o sistema de verificação'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista todos os membros verificados')),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guildId;

            // Inicializa as configurações se não existirem
            let guildConfig = configDb.get(`guilds.${guildId}`) || {};
            let verifiedUsers = verifiedDb.get(`guilds.${guildId}`) || {};

            if (subcommand === 'setup') {
                const role = interaction.options.getRole('cargo');
                const channel = interaction.options.getChannel('canal');
                const title = interaction.options.getString('titulo') || '✅ Verificação do Servidor';
                const description = interaction.options.getString('descricao') || 
                    '**Bem-vindo ao nosso servidor!**\n\n' +
                    'Para ter acesso completo ao servidor, você precisa passar por uma breve verificação.\n' +
                    'Isso nos ajuda a manter nossa comunidade segura e livre de bots maliciosos.\n\n' +
                    '**Como verificar:**\n' +
                    '1. Clique no botão "Verificar" abaixo\n' +
                    '2. Responda às perguntas que aparecerem\n' +
                    '3. Após aprovação, você receberá acesso automático\n\n' +
                    '🔒 Seus dados serão mantidos em segurança e usados apenas para verificação.';

                // Atualiza a configuração do servidor
                guildConfig.verification = {
                    enabled: true,
                    roleId: role.id,
                    channelId: channel.id,
                    messageTitle: title,
                    messageDescription: description,
                    lastUpdate: Date.now()
                };

                // Salva as configurações
                configDb.set(`guilds.${guildId}`, guildConfig);

                // Cria o botão de verificação
                const verifyButton = new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('Verificar')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✅');

                // Cria o embed de verificação
                const verificationEmbed = embedBuilder.custom({
                    title: title,
                    description: description,
                    color: 0x2ecc71,
                    footer: { text: 'Sistema de Verificação' }
                });

                // Envia a mensagem com o botão
                const message = await channel.send({
                    embeds: [verificationEmbed],
                    components: [new ActionRowBuilder().addComponents(verifyButton)]
                });

                // Responde ao comando
                return interaction.reply({
                    embeds: [embedBuilder.success(
                        '✅ Sistema Configurado',
                        `O sistema de verificação foi configurado com sucesso!\nCanal: ${channel}\nCargo: ${role}`
                    )],
                    ephemeral: true
                });
            }

            else if (subcommand === 'disable') {
                if (!guildConfig.verification?.enabled) {
                    return interaction.reply({
                        embeds: [embedBuilder.error(
                            '❌ Sistema não ativo',
                            'O sistema de verificação já está desativado.'
                        )],
                        ephemeral: true
                    });
                }

                // Desativa o sistema
                guildConfig.verification.enabled = false;
                configDb.set(`guilds.${guildId}`, guildConfig);

                return interaction.reply({
                    embeds: [embedBuilder.success(
                        '✅ Sistema Desativado',
                        'O sistema de verificação foi desativado com sucesso.'
                    )],
                    ephemeral: true
                });
            }

            else if (subcommand === 'list') {
                const verifiedList = Object.keys(verifiedUsers).map(userId => `<@${userId}>`).join('\n') || 'Nenhum membro verificado.';

                return interaction.reply({
                    embeds: [embedBuilder.custom({
                        title: '📋 Membros Verificados',
                        description: verifiedList,
                        color: 0x3498db
                    })],
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Erro no comando de verificação:', error);
            return interaction.reply({
                embeds: [embedBuilder.error(
                    '❌ Erro',
                    'Ocorreu um erro ao executar o comando. Por favor, tente novamente.'
                )],
                ephemeral: true
            });
        }
    }
};
