import { SlashCommandBuilder, PermissionFlagsBits  } from 'discord.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';
import embedBuilder from '../../utils/embedBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Tranca um canal ou vários canais')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal para trancar (deixe vazio para trancar todos)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo do bloqueio')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('bypass')
                .setDescription('Cargo que poderá falar mesmo com o canal bloqueado')
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
            const bypassRole = interaction.options.getRole('bypass');
            const silent = interaction.options.getBoolean('silencioso') || false;
            
            // Filtra apenas canais de texto
            const channels = channel ? [channel] : Array.from(interaction.guild.channels.cache.values()).filter(c => 
                c.type === 0 && // GUILD_TEXT
                c.manageable // Bot pode gerenciar o canal
            );

            await interaction.deferReply({ ephemeral: true });

            let locked = 0;
            let failed = 0;
            let skipped = 0;

            // Processa cada canal
            for (const targetChannel of channels) {
                try {
                    // Verifica se o canal já está bloqueado
                    const currentPerms = targetChannel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
                    if (currentPerms?.deny.has(PermissionFlagsBits.SendMessages)) {
                        skipped++;
                        continue;
                    }

                    // Configura as permissões
                    const permissionUpdates = [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
                        }
                    ];

                    // Adiciona bypass role se especificada
                    if (bypassRole) {
                        permissionUpdates.push({
                            id: bypassRole.id,
                            allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
                        });
                    }

                    // Aplica as permissões
                    await targetChannel.permissionOverwrites.set(permissionUpdates);

                    // Envia mensagem de bloqueio se não for silencioso
                    if (!silent) {
                        const lockEmbed = embedBuilder.custom({
                            title: '🔒 Canal Bloqueado',
                            description: [
                                `Este canal foi bloqueado por ${interaction.user}.`,
                                `**Motivo:** ${reason}`,
                                bypassRole ? `\n**Bypass:** ${bypassRole}` : ''
                            ].join('\n'),
                            color: 0xFF0000
                        });

                        await targetChannel.send({ embeds: [lockEmbed] });
                    }

                    locked++;
                } catch (error) {
                    console.error(`Erro ao bloquear canal ${targetChannel.name}:`, error);
                    failed++;
                }
            }

            // Envia resposta final
            const resultEmbed = embedBuilder.custom({
                title: '🔒 Canais Bloqueados',
                description: [
                    `✅ **${locked}** canais bloqueados com sucesso`,
                    failed > 0 ? `❌ **${failed}** canais falharam ao bloquear` : '',
                    skipped > 0 ? `⏭️ **${skipped}** canais já estavam bloqueados` : '',
                    `\n**Motivo:** ${reason}`,
                    bypassRole ? `**Bypass:** ${bypassRole}` : ''
                ].filter(Boolean).join('\n'),
                color: failed > 0 ? 0xFFA500 : 0x00FF00
            });

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Erro ao executar comando lock:', error);
            const errorEmbed = embedBuilder.error( 'Erro ao Bloquear', 'Ocorreu um erro ao tentar bloquear os canais. Por favor, tente novamente.'
            );
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};
