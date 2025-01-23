import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Cria um convite para o servidor')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal para criar o convite (opcional)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('tempo')
                .setDescription('Tempo de duração do convite em horas (opcional, máximo 24h)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(24))
        .addIntegerOption(option =>
            option.setName('usos')
                .setDescription('Número máximo de usos (opcional, máximo 100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)),

    async execute(interaction) {
        try {
            // Verifica se o usuário tem permissão para criar convites
            if (!interaction.member.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
                return await interaction.reply({
                    content: '❌ Você não tem permissão para criar convites.',
                    ephemeral: true
                });
            }

            // Obtém os parâmetros
            const channel = interaction.options.getChannel('canal') || interaction.channel;
            const hours = interaction.options.getInteger('tempo') || 24;
            const maxUses = interaction.options.getInteger('usos') || 0;

            // Verifica se o bot tem permissão no canal
            if (!channel.permissionsFor(interaction.client.user).has(PermissionFlagsBits.CreateInstantInvite)) {
                return await interaction.reply({
                    content: '❌ Não tenho permissão para criar convites neste canal.',
                    ephemeral: true
                });
            }

            // Cria o convite
            const invite = await channel.createInvite({
                maxAge: hours * 3600, // Converte horas para segundos
                maxUses: maxUses,
                unique: true,
                reason: `Convite criado por ${interaction.user.tag}`
            });

            // Cria a embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎫 Convite Criado!')
                .setDescription(`**Link do convite:** ${invite.url}`)
                .addFields(
                    { 
                        name: '📍 Canal',
                        value: `${channel}`,
                        inline: true
                    },
                    { 
                        name: '⏰ Duração',
                        value: `${hours} hora${hours === 1 ? '' : 's'}`,
                        inline: true
                    },
                    { 
                        name: '👥 Usos Máximos',
                        value: maxUses === 0 ? 'Ilimitado' : `${maxUses} uso${maxUses === 1 ? '' : 's'}`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Criado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // Envia a resposta
            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Erro ao criar convite:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao criar o convite.',
                ephemeral: true
            });
        }
    },
};
