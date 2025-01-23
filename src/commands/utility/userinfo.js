import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';
import embedBuilder from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Mostra informações detalhadas de um usuário')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('O usuário para ver informações')),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id, 
                interaction.guild.id,  'member', // Nível mínimo para ver info de usuário
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

            const target = interaction.options.getUser('usuario') ?? interaction.user;
            const member = interaction.guild.members.cache.get(target.id);

            if (!member) {
                const errorEmbed = embedBuilder.error( 'Usuário não Encontrado', 'O usuário especificado não foi encontrado no servidor.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .join(', ') || 'Nenhum cargo';

            const permissions = member.permissions.toArray()
                .map(perm => `\`${perm}\``)
                .join(', ');

            const embed = embedBuilder.custom({
                title: `👤 Informações de ${target.tag}`,
                thumbnail: target.displayAvatarURL({ dynamic: true, size: 1024 }),
                fields: [
                    {
                        name: '📝 Informações Gerais',
                        value: [
                            `🆔 ID: ${target.id}`,
                            `🎮 Nickname: ${member.nickname || 'Nenhum'}`,
                            `🤖 Bot: ${target.bot ? 'Sim' : 'Não'}`,
                            `🎭 Status: ${member.presence?.status || 'Offline'}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📅 Datas',
                        value: [
                            `📆 Conta Criada: <t:${Math.floor(target.createdTimestamp / 1000)}:F>`,
                            `📥 Entrou no Servidor: <t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: `👥 Cargos [${member.roles.cache.size - 1}]`,
                        value: roles.length > 1024 ? roles.substring(0, 1021) + '...' : roles,
                        inline: false
                    },
                    {
                        name: '⚡ Permissões Principais',
                        value: permissions.length > 1024 ? permissions.substring(0, 1021) + '...' : permissions,
                        inline: false
                    }
                ],
                color: member.displayHexColor,
                timestamp: true,
                footer: { text: `Solicitado por ${interaction.user.tag}`, icon_url: interaction.user.displayAvatarURL() }
            });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao executar comando userinfo:', error);
            const errorEmbed = embedBuilder.error( 'Erro ao Mostrar Informações', 'Ocorreu um erro ao tentar mostrar as informações do usuário. Por favor, tente novamente.'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
