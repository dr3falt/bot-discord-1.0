// membroscontagem.js
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits  } from 'discord.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('membros')
        .setDescription('Mostra informações sobre os membros do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id,
                interaction.guild.id, 'mod',
                interaction.member
            );

            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ Você não tem permissão para usar este comando.',
                    ephemeral: true
                });
            }

            const guild = interaction.guild;
            
            // Obtém contagens
            const totalMembers = guild.memberCount;
            const humans = guild.members.cache.filter(member => !member.user.bot).size;
            const bots = guild.members.cache.filter(member => member.user.bot).size;
            const online = guild.members.cache.filter(member => member.presence?.status === 'online').size;
            const idle = guild.members.cache.filter(member => member.presence?.status === 'idle').size;
            const dnd = guild.members.cache.filter(member => member.presence?.status === 'dnd').size;
            const offline = guild.members.cache.filter(member => !member.presence || member.presence.status === 'offline').size;

            // Cria embed
            const embed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle(`📊 Estatísticas de Membros - ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    { 
                        name: '👥 Total de Membros',
                        value: `${totalMembers}`,
                        inline: true
                    },
                    { 
                        name: '👤 Humanos',
                        value: `${humans}`,
                        inline: true
                    },
                    { 
                        name: '🤖 Bots',
                        value: `${bots}`,
                        inline: true
                    },
                    { 
                        name: '\u200B',
                        value: '\u200B',
                        inline: false
                    },
                    { 
                        name: '🟢 Online',
                        value: `${online}`,
                        inline: true
                    },
                    { 
                        name: '🌙 Ausente',
                        value: `${idle}`,
                        inline: true
                    },
                    { 
                        name: '🔴 Não Perturbe',
                        value: `${dnd}`,
                        inline: true
                    },
                    { 
                        name: '⚫ Offline',
                        value: `${offline}`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // Envia a embed
            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro no comando membros:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                ephemeral: true
            });
        }
    },
};
