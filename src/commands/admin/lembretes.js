import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder  } from 'discord.js';
import reminderManager from '../../utils/ReminderManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lembretes')
        .setDescription('Gerencia os lembretes do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription('Lista todos os lembretes pendentes')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('completar')
                .setDescription('Marca um lembrete como concluído')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID do lembrete')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar')
                .setDescription('Adiciona um novo lembrete')
                .addStringOption(option =>
                    option
                        .setName('mensagem')
                        .setDescription('Mensagem do lembrete')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('tipo')
                        .setDescription('Tipo do lembrete')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Boas-vindas', value: 'welcome' },
                            { name: 'Cargos Automáticos', value: 'autorole' },
                            { name: 'Logs', value: 'logs' },
                            { name: 'Anti-Raid', value: 'antiraid' },
                            { name: 'Outro', value: 'other' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('horas')
                        .setDescription('Em quantas horas o lembrete deve ser enviado')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(168) // 1 semana
                )
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'listar': {
                    const reminders = await reminderManager.getPendingReminders(interaction.guildId);
                    
                    if (reminders.length === 0) {
                        await interaction.reply({
                            content: '✅ Não há lembretes pendentes!',
                            ephemeral: true
                        });
                        return;
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('📋 Lembretes Pendentes')
                        .setColor('#3498db')
                        .setDescription(
                            reminders
                                .map(r => {
                                    const dueDate = new Date(r.dueDate);
                                    return `**ID:** ${r.id}\n**Tipo:** ${r.type}\n**Mensagem:** ${r.message}\n**Vence em:** <t:${Math.floor(dueDate.getTime() / 1000)}:R>\n`;
                                })
                                .join('\n---\n')
                        );

                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                    break;
                }

                case 'completar': {
                    const reminderId = interaction.options.getString('id');
                    const success = await reminderManager.completeReminder(interaction.guildId, reminderId);

                    if (success) {
                        await interaction.reply({
                            content: '✅ Lembrete marcado como concluído!',
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: '❌ Lembrete não encontrado.',
                            ephemeral: true
                        });
                    }
                    break;
                }

                case 'adicionar': {
                    const message = interaction.options.getString('mensagem');
                    const type = interaction.options.getString('tipo');
                    const hours = interaction.options.getInteger('horas');

                    const dueDate = new Date(Date.now() + hours * 60 * 60 * 1000);
                    
                    const reminder = await reminderManager.addReminder(
                        interaction.guildId,
                        interaction.channel.id,
                        type,
                        message,
                        dueDate
                    );

                    const embed = new EmbedBuilder()
                        .setTitle('⏰ Novo Lembrete Adicionado')
                        .setColor('#2ecc71')
                        .setDescription(message)
                        .addFields(
                            { name: 'Tipo', value: type, inline: true },
                            { name: 'Vence em', value: `<t:${Math.floor(dueDate.getTime() / 1000)}:R>`, inline: true },
                            { name: 'ID', value: reminder.id, inline: true }
                        );

                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                    break;
                }
            }
        } catch (error) {
            console.error('Erro no comando lembretes:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                ephemeral: true
            });
        }
    }
};
