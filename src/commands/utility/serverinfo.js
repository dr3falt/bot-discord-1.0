import { SlashCommandBuilder, EmbedBuilder  } from 'discord.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';
import embedBuilder from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Mostra informações detalhadas do servidor'),
    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id, 
                interaction.guild.id,  'member', // Nível mínimo para ver info do servidor
                interaction.member
            );

            console.log('Verificando permissões para:', interaction.user.tag);
            console.log('ID do usuário:', interaction.user.id);
            console.log('ID do servidor:', interaction.guild.id);
            console.log('Tem permissão:', hasPermission);

            if (!hasPermission) {
                const errorEmbed = embedBuilder.error( 'Sem Permissão', 'Você não tem permissão para usar este comando.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const guild = interaction.guild;
            
            // Busca informações do servidor
            const owner = await guild.fetchOwner();
            
            // Contagem de membros
            const totalMembers = guild.memberCount;
            const humanMembers = guild.members.cache.filter(member => !member.user.bot).size;
            const botMembers = guild.members.cache.filter(member => member.user.bot).size;
            const onlineMembers = guild.members.cache.filter(member => member.presence?.status === 'online').size;
            
            // Contagem de canais
            const totalChannels = guild.channels.cache.size;
            const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
            const categories = guild.channels.cache.filter(c => c.type === 4).size;
            
            // Informações de boost
            const boostLevel = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount;
            
            // Cria o embed com as informações
            const embed = embedBuilder.custom({
                title: `📊 Informações do Servidor ${guild.name}`,
                thumbnail: guild.iconURL({ dynamic: true }),
                fields: [
                    {
                        name: '📝 Informações Gerais',
                        value: [
                            `👑 Dono: ${owner.user.tag}`,
                            `🆔 ID: ${guild.id}`,
                            `📅 Criado em: <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                            `🌍 Região: ${guild.preferredLocale}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '👥 Membros',
                        value: [
                            `👤 Total: ${totalMembers}`,
                            `🧑 Humanos: ${humanMembers}`,
                            `🤖 Bots: ${botMembers}`,
                            `🟢 Online: ${onlineMembers}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💬 Canais',
                        value: [
                            `📊 Total: ${totalChannels}`,
                            `💭 Texto: ${textChannels}`,
                            `🔊 Voz: ${voiceChannels}`,
                            `📂 Categorias: ${categories}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🚀 Boost',
                        value: [
                            `📈 Nível: ${boostLevel}`,
                            `💝 Boosts: ${boostCount}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🛡️ Moderação',
                        value: [
                            `🔒 Nível de Verificação: ${guild.verificationLevel}`,
                            `⚠️ Filtro de Conteúdo: ${guild.explicitContentFilter}`,
                            `🔔 Notificações: ${guild.defaultMessageNotifications}`
                        ].join('\n'),
                        inline: false
                    }
                ],
                timestamp: true,
                color: '#2F3136'
            });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao executar comando serverinfo:', error);
            const errorEmbed = embedBuilder.error( 'Erro ao Mostrar Informações', 'Ocorreu um erro ao tentar mostrar as informações do servidor. Por favor, tente novamente.'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
