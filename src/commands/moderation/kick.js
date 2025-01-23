import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import embedBuilder from '../../utils/embedBuilder.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';

// Banco de dados para logs de moderação
const logsDb = new JsonDatabase(path.join(__dirname, '../../database/modlogs.json'));
const configDb = new JsonDatabase(path.join(__dirname, '../../database/config.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa um membro do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('O usuário a ser expulso')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo da expulsão')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('silencioso')
                .setDescription('Se verdadeiro, apenas você verá a mensagem de confirmação')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('usuario');
            const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';
            const silent = interaction.options.getBoolean('silencioso') || false;

            // Verifica se o usuário está tentando se expulsar
            if (user.id === interaction.user.id) {
                const selfKickEmbed = embedBuilder.error( 'Erro', 'Você não pode expulsar a si mesmo!'
                );
                return await interaction.reply({ embeds: [selfKickEmbed], ephemeral: true });
            }

            // Verifica se o usuário está no servidor
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) {
                const notFoundEmbed = embedBuilder.error( 'Erro', 'Não foi possível encontrar este usuário no servidor!'
                );
                return await interaction.reply({ embeds: [notFoundEmbed], ephemeral: true });
            }

            // Verifica se o usuário tem cargo maior que o autor do comando
            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                const higherRoleEmbed = embedBuilder.error( 'Erro', 'Você não pode expulsar alguém com cargo igual ou superior ao seu!'
                );
                return await interaction.reply({ embeds: [higherRoleEmbed], ephemeral: true });
            }

            // Verifica se o bot pode expulsar o usuário
            if (!member.kickable) {
                const cantKickEmbed = embedBuilder.error( 'Erro', 'Não posso expulsar este usuário! Ele pode ter um cargo maior que o meu.'
                );
                return await interaction.reply({ embeds: [cantKickEmbed], ephemeral: true });
            }

            // Tenta enviar DM para o usuário antes de expulsar
            try {
                const dmEmbed = embedBuilder.custom({
                    title: '👢 Você foi Expulso',
                    description: `Você foi expulso do servidor **${interaction.guild.name}**`,
                    fields: [
                        { name: '📝 Motivo', value: reason },
                        { name: '🛡️ Moderador', value: interaction.user.tag }
                    ],
                    color: '#FFA500'
                });
                
                await user.send({ embeds: [dmEmbed] }).catch(() => null);
            } catch (error) {
                console.log(`Não foi possível enviar DM para ${user.tag}`);
            }

            // Expulsa o usuário
            await member.kick(`${reason} | Expulso por ${interaction.user.tag}`);

            // Registra a expulsão nos logs
            const logs = await logsDb.read() || {};
            if (!logs[interaction.guild.id]) logs[interaction.guild.id] = [];
            
            logs[interaction.guild.id].push({
                type: 'kick',
                userId: user.id,
                moderatorId: interaction.user.id,
                reason: reason,
                date: new Date().toISOString()
            });

            await logsDb.write(logs);

            // Registrar no canal de logs
            const config = await logsDb.read();
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel && logChannel.isTextBased()) {
                await logChannel.send(`${user.tag} foi expulso por ${interaction.user.tag}. Motivo: ${reason}`);
            }

            // Enviar mensagem de saída
            const welcomeConfig = await configDb.read();
            const leaveChannel = interaction.guild.channels.cache.get(welcomeConfig.leaveChannelId);
            if (leaveChannel && leaveChannel.isTextBased()) {
                const leaveMessage = welcomeConfig.leaveMessage.replace('{user}', user.tag);
                await leaveChannel.send(leaveMessage);
            }

            // Cria o embed de confirmação
            const kickEmbed = embedBuilder.custom({
                title: '👢 Usuário Expulso',
                fields: [
                    { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '🛡️ Moderador', value: `${interaction.user.tag}`, inline: true },
                    { name: '📝 Motivo', value: reason }
                ],
                color: '#FFA500',
                thumbnail: user.displayAvatarURL({ dynamic: true })
            });

            // Responde à interação
            await interaction.reply({ 
                embeds: [kickEmbed], 
                ephemeral: silent 
            });

        } catch (error) {
            console.error('Erro ao expulsar usuário:', error);
            const errorEmbed = embedBuilder.error( 'Erro', 'Ocorreu um erro ao tentar expulsar o usuário.'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
