import { SlashCommandBuilder, PermissionFlagsBits, ChannelType  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('criarservidor')
        .setDescription('Cria um layout completo de servidor com categorias e cargos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Criar cargos principais
            const roles = [
                { name: '🌐 Admin de Servidor', color: '#FF0000', permissions: [PermissionFlagsBits.Administrator] },
                { name: '🤖 Moderador de Servidor', color: '#00FF00', permissions: [
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.KickMembers,
                    PermissionFlagsBits.BanMembers,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages
                ]},
                { name: '💻 Desenvolvedor', color: '#0099ff', permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { name: '✨ Designer', color: '#FF1493', permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { name: '📞 Atendente de Suporte', color: '#FFA500', permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { name: '📦 Parceiro', color: '#9400D3', permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { name: '📦 Cliente', color: '#4169E1', permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { name: '👥 Membro', color: '#808080', permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ];

            await interaction.editReply({ content: '⏳ Criando cargos...', ephemeral: true });
            const createdRoles = {};
            for (const role of roles) {
                try {
                    const createdRole = await interaction.guild.roles.create({
                        name: role.name,
                        color: role.color,
                        permissions: role.permissions,
                        reason: 'Configuração automática do servidor'
                    });
                    createdRoles[role.name] = createdRole;
                } catch (error) {
                    console.error(`Erro ao criar cargo ${role.name}:`, error);
                }
            }

            // Estrutura de categorias e canais
            const categories = [
                {
                    name: 'comunidade 🌐',
                    channels: ['💬-membro', '❓-moderador', '🎞️-administração']
                },
                {
                    name: 'store info 🏪',
                    channels: ['📌-membro', '📝-comprador', '📢-gerente-de-loja']
                },
                {
                    name: 'referencias 📚',
                    channels: ['📦-membro', '💬-cliente', '💎-equipe-de-suporte']
                },
                {
                    name: 'loja 🛒',
                    channels: ['📌-membro', '📌-cliente', '📌-gestor-de-produtos', '📌-admin-da-loja']
                },
                {
                    name: 'metodos ⚙️',
                    channels: ['📦-membro', '📦-desenvolvedor']
                },
                {
                    name: 'utilitarios 🛠️',
                    channels: ['🧰-membro', '🧰-administrador-de-ferramentas']
                },
                {
                    name: 'Bots 🤖',
                    channels: [ '🛡️-bot-de-moderação', '🎫-bot-de-tickets', '💸-bot-de-vendas', '🎶-bot-de-música', '🎮-bot-de-jogos', '💰-bot-de-economia', '⚠️-bot-vazado', '✨-bot-personalizado'
                    ]
                },
                {
                    name: 'paineis 🖥️',
                    channels: ['📦-membro', '📦-desenvolvedor', '📦-admin-de-painéis']
                },
                {
                    name: 'paineis-full 🖥️',
                    channels: ['📦-membro', '📦-desenvolvedor', '📦-admin-de-painéis']
                },
                {
                    name: 'packs 📦',
                    channels: ['📦-membro', '📦-cliente', '📦-gestor-de-packs']
                },
                {
                    name: 'servidor 🏠',
                    channels: ['layout', '🤖-moderador-de-servidor', '🚫-fakes', '🌐-admin-de-servidor', '📦-em-breve']
                },
                {
                    name: 'design 🎨',
                    channels: ['✨-designer', '🖼️-membro', '🖥️-admin-de-design']
                },
                {
                    name: 'parceiros 🤝',
                    channels: ['📦-parceiro', '⛓️‍💥-admin-de-parcerias']
                },
                {
                    name: 'suporte 🛠️',
                    channels: [ 'ℹ️-membro', '📞-atendente-de-suporte', '📝-feedback', '⭐-avaliação', '👨‍💻-staff', '💻-desenvolvedor', '📜-logs'
                    ]
                }
            ];

            // Configurações padrão de permissões
            const defaultPermissions = [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ];

            // Adicionar permissões para os cargos criados
            if (createdRoles['🌐 Admin de Servidor']) {
                defaultPermissions.push({
                    id: createdRoles['🌐 Admin de Servidor'].id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
                });
            }

            if (createdRoles['🤖 Moderador de Servidor']) {
                defaultPermissions.push({
                    id: createdRoles['🤖 Moderador de Servidor'].id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                });
            }

            await interaction.editReply({ content: '⏳ Criando categorias e canais...', ephemeral: true });

            // Criar categorias e canais
            for (const category of categories) {
                try {
                    const createdCategory = await interaction.guild.channels.create({
                        name: category.name,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: defaultPermissions,
                        reason: 'Configuração automática do servidor'
                    });

                    // Criar canais dentro da categoria
                    for (const channelName of category.channels) {
                        try {
                            await interaction.guild.channels.create({
                                name: channelName,
                                type: ChannelType.GuildText,
                                parent: createdCategory.id,
                                permissionOverwrites: defaultPermissions,
                                reason: 'Configuração automática do servidor'
                            });
                            // Pequeno delay para evitar rate limits
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (error) {
                            console.error(`Erro ao criar canal ${channelName}:`, error);
                        }
                    }
                } catch (error) {
                    console.error(`Erro ao criar categoria ${category.name}:`, error);
                }
            }

            await interaction.editReply({
                content: '✅ Servidor configurado com sucesso!\n\n' + '**Cargos criados:**\n' +
                        Object.keys(createdRoles).map(role => `• ${role}`).join('\n') + '\n\n' + '**Categorias criadas:**\n' +
                        categories.map(cat => `• ${cat.name}`).join('\n'),
                ephemeral: true
            });

        } catch (error) {
            console.error('Erro ao configurar servidor:', error);
            await interaction.editReply({
                content: '❌ Ocorreu um erro ao configurar o servidor. Verifique se o bot tem todas as permissões necessárias.\n' + 'Erro: ' + error.message,
                ephemeral: true
            });
        }
    },
};
