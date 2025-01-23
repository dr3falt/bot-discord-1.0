import { SlashCommandBuilder, EmbedBuilder  } from 'discord.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';
import PunishmentManager from '../../utils/punishmentManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('punishments')
        .setDescription('Gerencia punições de usuários')
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnings')
                .setDescription('Mostra os avisos de um usuário')
                .addUserOption(option =>
                    option.setName('usuário')
                        .setDescription('O usuário para verificar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearwarnings')
                .setDescription('Limpa os avisos de um usuário')
                .addUserOption(option =>
                    option.setName('usuário')
                        .setDescription('O usuário para limpar os avisos')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Muta um usuário')
                .addUserOption(option =>
                    option.setName('usuário')
                        .setDescription('O usuário para mutar')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duração')
                        .setDescription('Duração em minutos')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(40320)) // 4 semanas
                .addStringOption(option =>
                    option.setName('motivo')
                        .setDescription('Motivo do mute')
                        .setRequired(true))),

    async execute(interaction) {
        if (!(await checkPermissions(interaction.user.id, interaction.guild.id, 'admin'))) {
            return await interaction.reply({
                content: 'Você precisa ser um administrador para usar este comando.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('usuário');

        if (subcommand === 'warnings') {
            const warnings = await PunishmentManager.getWarnings(user.id, interaction.guild.id);
            
            if (!warnings || warnings.length === 0) {
                return await interaction.reply({
                    content: `${user} não tem nenhum aviso.`,
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle(`Avisos de ${user.tag}`)
                .setThumbnail(user.displayAvatarURL())
                .setDescription(warnings.map((warn, index) => 
                    `**${index + 1}.** ${warn.reason}\n📅 <t:${Math.floor(warn.timestamp / 1000)}:R>`
                ).join('\n\n'))
                .setFooter({ text: `Total de avisos: ${warnings.length}` });

            await interaction.reply({ embeds: [embed] });
        }

        else if (subcommand === 'clearwarnings') {
            await PunishmentManager.clearWarnings(user.id, interaction.guild.id);
            
            await interaction.reply({
                content: `Todos os avisos de ${user} foram removidos.`,
                ephemeral: true
            });
        }

        else if (subcommand === 'mute') {
            const duration = interaction.options.getInteger('duração') * 60000; // Converte para milissegundos
            const reason = interaction.options.getString('motivo');

            const member = await interaction.guild.members.fetch(user.id);
            if (!member) {
                return await interaction.reply({
                    content: 'Usuário não encontrado no servidor.',
                    ephemeral: true
                });
            }

            const success = await PunishmentManager.muteUser(member, duration, reason);
            
            if (success) {
                const embed = await PunishmentManager.createPunishmentEmbed( 'mute',
                    user,
                    reason,
                    duration
                );
                
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({
                    content: 'Não foi possível mutar o usuário. Verifique as permissões do bot.',
                    ephemeral: true
                });
            }
        }
    },
};
