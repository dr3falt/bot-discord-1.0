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
        .setName('ban')
        .setDescription('Bane um membro do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('O usuário a ser banido')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo do banimento')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('dias')
                .setDescription('Número de dias de mensagens para deletar')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('silencioso')
                .setDescription('Se verdadeiro, apenas você verá a mensagem de confirmação')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('usuario');
            const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';
            const days = interaction.options.getInteger('dias') || 0;
            const silent = interaction.options.getBoolean('silencioso') || false;

            // Verifica se o usuário está tentando se banir
            if (user.id === interaction.user.id) {
                const selfBanEmbed = embedBuilder.error( 'Erro', 'Você não pode banir a si mesmo!'
                );
                return await interaction.reply({ embeds: [selfBanEmbed], ephemeral: true });
            }

            // Verifica se o bot pode banir o usuário
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (member) {
                // Verifica se o usuário tem cargo maior que o autor do comando
                if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                    const higherRoleEmbed = embedBuilder.error( 'Erro', 'Você não pode banir alguém com cargo igual ou superior ao seu!'
                    );
                    return await interaction.reply({ embeds: [higherRoleEmbed], ephemeral: true });
                }

                // Verifica se o bot pode banir o usuário
                if (!member.bannable) {
                    const cantBanEmbed = embedBuilder.error( 'Erro', 'Não posso banir este usuário! Ele pode ter um cargo maior que o meu.'
                    );
                    return await interaction.reply({ embeds: [cantBanEmbed], ephemeral: true });
                }
            }

            // Tenta banir o usuário
            await interaction.guild.members.ban(user.id, { 
                deleteMessageDays: days, 
                reason: `${reason} | Banido por ${interaction.user.tag}`
            });

            // Registra o banimento nos logs
            const logs = await logsDb.read() || {};
            if (!logs[interaction.guild.id]) logs[interaction.guild.id] = [];
            
            logs[interaction.guild.id].push({
                type: 'ban',
                userId: user.id,
                moderatorId: interaction.user.id,
                reason: reason,
                date: new Date().toISOString(),
                messagesDays: days
            });

            await logsDb.write(logs);

            // Registrar no canal de logs
            const config = await logsDb.read();
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel && logChannel.isTextBased()) {
                await logChannel.send(`${user.tag} foi banido por ${interaction.user.tag}. Motivo: ${reason}`);
            }

            // Enviar mensagem de banimento
            const welcomeConfig = await configDb.read();
            const banChannel = interaction.guild.channels.cache.get(welcomeConfig.banChannelId);
            if (banChannel && banChannel.isTextBased()) {
                const banMessage = welcomeConfig.banMessage.replace('{user}', user.tag).replace('{reason}', reason);
                await banChannel.send(banMessage);
            }

            // Cria o embed de confirmação
            const banEmbed = embedBuilder.custom({
                title: '🔨 Usuário Banido',
                fields: [
                    { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '🛡️ Moderador', value: `${interaction.user.tag}`, inline: true },
                    { name: '📝 Motivo', value: reason },
                    { name: '🗑️ Mensagens Deletadas', value: `${days} dias` }
                ],
                color: '#FF0000',
                thumbnail: user.displayAvatarURL({ dynamic: true })
            });

            // Tenta enviar DM para o usuário banido
            try {
                const dmEmbed = embedBuilder.custom({
                    title: '🔨 Você foi Banido',
                    description: `Você foi banido do servidor **${interaction.guild.name}**`,
                    fields: [
                        { name: '📝 Motivo', value: reason },
                        { name: '🛡️ Moderador', value: interaction.user.tag }
                    ],
                    color: '#FF0000'
                });
                
                await user.send({ embeds: [dmEmbed] }).catch(() => null);
            } catch (error) {
                console.log(`Não foi possível enviar DM para ${user.tag}`);
            }

            // Responde à interação
            await interaction.reply({ 
                embeds: [banEmbed], 
                ephemeral: silent 
            });

        } catch (error) {
            console.error('Erro ao banir usuário:', error);
            const errorEmbed = embedBuilder.error( 'Erro', 'Ocorreu um erro ao tentar banir o usuário.'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
