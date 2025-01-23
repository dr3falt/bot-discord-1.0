import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';
import embedBuilder from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Destranca um canal ou vários canais')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal para destrancar (deixe vazio para destrancar todos)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo do desbloqueio')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('silencioso')
                .setDescription('Se verdadeiro, não envia mensagem no canal')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Verifica permissões
            const hasPermission = await checkPermissions(
                interaction.user.id, 
                interaction.guild.id,  'admin',
                interaction.member
            );

            console.log('Verificando permissões para:', interaction.user.tag);
            console.log('ID do usuário:', interaction.user.id);
            console.log('ID do servidor:', interaction.guild.id);
            console.log('Tem permissão:', hasPermission);

            if (!hasPermission) {
                const errorEmbed = embedBuilder.error( 'Sem Permissão', 'Você precisa ser um administrador para usar este comando.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const channel = interaction.options.getChannel('canal');
            const reason = interaction.options.getString('motivo') || 'Nenhum motivo especificado';
            const silent = interaction.options.getBoolean('silencioso') || false;
            
            // Filtra apenas canais de texto
            const channels = channel ? [channel] : Array.from(interaction.guild.channels.cache.values()).filter(c => 
                c.type === 0 && // GUILD_TEXT
                c.manageable // Bot pode gerenciar o canal
            );

            await interaction.deferReply({ ephemeral: true });

            let unlocked = 0;
            let failed = 0;
            let skipped = 0;

            // Processa cada canal
            for (const targetChannel of channels) {
                try {
                    // Verifica se o canal já está desbloqueado
                    const currentPerms = targetChannel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
                    if (!currentPerms?.deny.has(PermissionFlagsBits.SendMessages)) {
                        skipped++;
                        continue;
                    }

                    // Remove as restrições
                    await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                        SendMessages: null,
                        AddReactions: null
                    });

                    // Envia mensagem de desbloqueio se não for silencioso
                    if (!silent) {
                        const unlockEmbed = embedBuilder.custom({
                            title: '🔓 Canal Desbloqueado',
                            description: [
                                `Este canal foi desbloqueado por ${interaction.user}.`,
                                `**Motivo:** ${reason}`
                            ].join('\n'),
                            color: 0x00FF00
                        });

                        await targetChannel.send({ embeds: [unlockEmbed] });
                    }

                    unlocked++;
                } catch (error) {
                    console.error(`Erro ao destrancar canal ${targetChannel.name}:`, error);
                    failed++;
                }
            }

            // Envia resposta final
            const resultEmbed = embedBuilder.custom({
                title: '🔓 Canais Desbloqueados',
                description: [
                    `✅ **${unlocked}** canais desbloqueados com sucesso`,
                    failed > 0 ? `❌ **${failed}** canais falharam ao desbloquear` : '',
                    skipped > 0 ? `⏭️ **${skipped}** canais já estavam desbloqueados` : '',
                    `\n**Motivo:** ${reason}`
                ].filter(Boolean).join('\n'),
                color: failed > 0 ? 0xFFA500 : 0x00FF00
            });

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Erro ao executar comando unlock:', error);
            const errorEmbed = embedBuilder.error( 'Erro ao Desbloquear', 'Ocorreu um erro ao tentar desbloquear os canais. Por favor, tente novamente.'
            );
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};
