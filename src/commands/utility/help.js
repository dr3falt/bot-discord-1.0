import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle  } from 'discord.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';

// Configurações do menu de ajuda
const HELP_CONFIG = {
    TIMEOUT: 300000, // 5 minutos
    COLORS: {
        HOME: '#2F3136',
        ADMIN: '#FF4654',
        MODS: '#FFA500',
        UTILS: '#008FFF'
    },
    EMOJIS: {
        HOME: '🏠',
        ADMIN: '⚙️',
        MODS: '🛡️',
        UTILS: '🔧',
        FIRST: '⏮️',
        PREV: '◀️',
        NEXT: '▶️',
        LAST: '⏭️'
    }
};

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Mostra todos os comandos disponíveis'),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id, 
                interaction.guild.id,  'member',
                interaction.member
            );

            if (!hasPermission) {
                return await interaction.reply({ 
                    content: '❌ Você não tem permissão para usar este comando.',
                    ephemeral: true 
                });
            }

            // Array com todas as páginas de embeds
            const embeds = [
                // Menu Principal
                new EmbedBuilder()
                    .setColor(HELP_CONFIG.COLORS.HOME)
                    .setTitle(`${HELP_CONFIG.EMOJIS.HOME} Menu Principal`)
                    .setDescription('**Bem-vindo ao menu de ajuda!**\n\n' + 'Navegue entre as categorias usando os botões abaixo:\n\n' +
                                  `${HELP_CONFIG.EMOJIS.ADMIN} **Administração**\n` + '• Gerenciamento de cargos\n' + '• Mensagens automáticas\n' + '• Configurações do servidor\n\n' +
                                  `${HELP_CONFIG.EMOJIS.MODS} **Moderação**\n` + '• Punições de membros\n' + '• Gerenciamento de canais\n' + '• Controle de mensagens\n\n' +
                                  `${HELP_CONFIG.EMOJIS.UTILS} **Utilidades**\n` + '• Informações do servidor\n' + '• Informações de usuários\n' + '• Status do bot')
                    .setThumbnail(interaction.client.user.displayAvatarURL()),

                // Administração
                new EmbedBuilder()
                    .setColor(HELP_CONFIG.COLORS.ADMIN)
                    .setTitle(`${HELP_CONFIG.EMOJIS.ADMIN} Comandos de Administração`)
                    .setDescription('**Comandos para gerenciar o servidor**\n\n' + 'Aqui você encontra comandos para:\n' + '• Gerenciamento de cargos\n' + '• Configurações do servidor\n' + '• Mensagens automáticas\n' + '• Logs e auditoria')
                    .addFields(
                        { 
                            name: '`/welcome` - Sistema de Mensagens',
                            value: '• `/welcome welcome #canal mensagem` - Boas-vindas\n' + '• `/welcome leave #canal mensagem` - Saída\n' + '• `/welcome ban #canal mensagem` - Banimento',
                            inline: false 
                        },
                        {
                            name: '`/welcome` - Configurações',
                            value: '• `/welcome toggle tipo:escolha ativar:sim/não` - Ativa/desativa\n' + '• `/welcome status` - Mostra configurações\n\n' + '**Variáveis:** {user}, {server}, {count}, {reason}, {author}',
                            inline: false
                        },
                        { 
                            name: '`/autorole` - Cargo Automático',
                            value: '• `/autorole configurar @cargo` - Define cargo\n' + '• `/autorole toggle ativar:sim/não` - Ativa/desativa\n' + '• `/autorole remover_cargo [@cargo]` - Remove cargo\n' + '• `/autorole status` - Mostra status',
                            inline: false 
                        },
                        { 
                            name: '`/embed` - Embeds',
                            value: '• `/embed criar` - Embed simples\n' + '• `/embed2` - Com thumbnail\n' + '• `/embed3` - Com imagem grande',
                            inline: false 
                        },
                        {
                            name: 'Outros Comandos',
                            value: '• `/addrole @user @cargo` - Adiciona cargo\n' + '• `/announce #canal msg` - Faz anúncio\n' + '• `/botconfig` - Configura bot\n' + '• `/perms` - Gerencia permissões',
                            inline: false
                        },
                        {
                            name: 'Proteção e Logs',
                            value: '• `/antiraid` - Sistema anti-raid\n' + '• `/antilink` - Sistema anti-link\n' + '• `/logs` - Sistema de logs\n' + '• `/historico` - Histórico de ações',
                            inline: false
                        }
                    ),

                // Moderação
                new EmbedBuilder()
                    .setColor(HELP_CONFIG.COLORS.MODS)
                    .setTitle(`${HELP_CONFIG.EMOJIS.MODS} Comandos de Moderação`)
                    .setDescription('**Comandos para manter a ordem no servidor**\n\n' + 'Aqui você encontra comandos para:\n' + '• Punições de membros\n' + '• Gerenciamento de canais\n' + '• Controle de mensagens')
                    .addFields(
                        {
                            name: 'Punições',
                            value: '• `/ban @user [motivo]` - Bane usuário\n' + '• `/kick @user [motivo]` - Expulsa usuário\n' + '• `/mute @user [tempo] [motivo]` - Silencia\n' + '• `/warn @user [motivo]` - Adverte',
                            inline: false
                        },
                        {
                            name: 'Gerenciamento',
                            value: '• `/clear [quantidade]` - Limpa mensagens\n' + '• `/lock [motivo]` - Tranca canal\n' + '• `/unlock` - Destranca canal',
                            inline: false
                        }
                    ),

                // Utilidades
                new EmbedBuilder()
                    .setColor(HELP_CONFIG.COLORS.UTILS)
                    .setTitle(`${HELP_CONFIG.EMOJIS.UTILS} Comandos de Utilidade`)
                    .setDescription('**Comandos úteis para o dia a dia**\n\n' + 'Aqui você encontra comandos para:\n' + '• Informações do servidor\n' + '• Informações de usuários\n' + '• Status do bot')
                    .addFields(
                        {
                            name: 'Informações',
                            value: '• `/help` - Mostra esta ajuda\n' + '• `/serverinfo` - Info do servidor\n' + '• `/userinfo [@user]` - Info do usuário\n' + '• `/avatar [@user]` - Mostra avatar',
                            inline: false
                        },
                        {
                            name: 'Status',
                            value: '• `/ping` - Latência do bot\n' + '• `/stats` - Estatísticas\n' + '• `/invite` - Cria convite',
                            inline: false
                        }
                    )
            ];

            // Adiciona footer em todas as embeds
            embeds.forEach((embed, index) => {
                embed
                    .setTimestamp()
                    .setFooter({ 
                        text: `Página ${index + 1} de ${embeds.length} • Solicitado por ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    });
            });

            let currentPage = 0;

            // Botões de navegação
            const getButtons = (page) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('first')
                            .setEmoji(HELP_CONFIG.EMOJIS.FIRST)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setEmoji(HELP_CONFIG.EMOJIS.PREV)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('home')
                            .setEmoji(HELP_CONFIG.EMOJIS.HOME)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setEmoji(HELP_CONFIG.EMOJIS.NEXT)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === embeds.length - 1),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setEmoji(HELP_CONFIG.EMOJIS.LAST)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === embeds.length - 1)
                    );
            };

            // Função para atualizar a mensagem
            const updateMessage = async (interaction, newPage) => {
                try {
                    await interaction.deferUpdate();
                    await interaction.editReply({
                        embeds: [embeds[newPage]],
                        components: [getButtons(newPage)]
                    });
                    return true;
                } catch (error) {
                    console.error('Erro ao atualizar mensagem:', error);
                    return false;
                }
            };

            // Envia a mensagem inicial
            const message = await interaction.reply({
                embeds: [embeds[currentPage]],
                components: [getButtons(currentPage)],
                ephemeral: true,
                fetchReply: true
            }).catch(error => {
                console.error('Erro ao enviar mensagem inicial:', error);
                return null;
            });

            if (!message) return;

            // Cria o coletor de interações
            const collector = message.createMessageComponentCollector({ 
                time: HELP_CONFIG.TIMEOUT
            });

            // Handler para os botões
            collector.on('collect', async i => {
                try {
                    if (i.user.id !== interaction.user.id) {
                        await i.reply({ 
                            content: '❌ Apenas quem usou o comando pode interagir!', 
                            ephemeral: true 
                        });
                        return;
                    }

                    // Atualiza a página baseado no botão
                    const oldPage = currentPage;
                    switch (i.customId) {
                        case 'first':
                            currentPage = 0;
                            break;
                        case 'prev':
                            currentPage = Math.max(0, currentPage - 1);
                            break;
                        case 'home':
                            currentPage = 0;
                            break;
                        case 'next':
                            currentPage = Math.min(embeds.length - 1, currentPage + 1);
                            break;
                        case 'last':
                            currentPage = embeds.length - 1;
                            break;
                    }

                    // Só atualiza se a página mudou
                    if (oldPage !== currentPage) {
                        await updateMessage(i, currentPage);
                    } else {
                        await i.deferUpdate();
                    }
                } catch (error) {
                    console.error('Erro ao processar interação:', error);
                    try {
                        if (!i.deferred && !i.replied) {
                            await i.deferUpdate();
                        }
                    } catch (e) {
                        console.error('Erro ao tentar recuperar de falha:', e);
                    }
                }
            });

            // Handler para quando o tempo expira
            collector.on('end', async () => {
                try {
                    const buttons = getButtons(currentPage);
                    buttons.components.forEach(button => button.setDisabled(true));
                    
                    await interaction.editReply({
                        embeds: [embeds[currentPage]],
                        components: [buttons],
                        content: '⚠️ Menu expirado. Use `/help` novamente para ver os comandos.'
                    });
                } catch (error) {
                    console.error('Erro ao desativar botões:', error);
                }
            });

        } catch (error) {
            console.error('Erro ao executar comando help:', error);
            await interaction.reply({ 
                content: '❌ Ocorreu um erro ao mostrar a ajuda. Por favor, tente novamente.', 
                ephemeral: true 
            }).catch(() => {});
        }
    },
};
