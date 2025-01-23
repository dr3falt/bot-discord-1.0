import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits  } from 'discord.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';

const configDb = new JsonDatabase(path.join(__dirname, '../../database/config.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configura o sistema de moderação automática')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('antilink')
                .setDescription('Configura o sistema anti-link')
                .addBooleanOption(option =>
                    option.setName('ativar')
                        .setDescription('Ativar ou desativar o sistema anti-link')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('punicao')
                        .setDescription('Tipo de punição')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Deletar Mensagem', value: 1 },
                            { name: 'Avisar Usuário', value: 2 },
                            { name: 'Timeout (5 min)', value: 3 },
                            { name: 'Kick', value: 4 },
                            { name: 'Ban', value: 5 }
                        ))
                .addStringOption(option =>
                    option.setName('whitelist')
                        .setDescription('Links permitidos (separados por vírgula)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('antispam')
                .setDescription('Configura o sistema anti-spam')
                .addBooleanOption(option =>
                    option.setName('ativar')
                        .setDescription('Ativar ou desativar o sistema anti-spam')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('limite')
                        .setDescription('Número máximo de mensagens por minuto')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(60))
                .addIntegerOption(option =>
                    option.setName('punicao')
                        .setDescription('Tipo de punição')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Deletar Mensagens', value: 1 },
                            { name: 'Avisar Usuário', value: 2 },
                            { name: 'Timeout (5 min)', value: 3 },
                            { name: 'Kick', value: 4 },
                            { name: 'Ban', value: 5 }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('antiinvite')
                .setDescription('Configura o sistema anti-invite do Discord')
                .addBooleanOption(option =>
                    option.setName('ativar')
                        .setDescription('Ativar ou desativar o sistema anti-invite')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('punicao')
                        .setDescription('Tipo de punição')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Deletar Mensagem', value: 1 },
                            { name: 'Avisar Usuário', value: 2 },
                            { name: 'Timeout (5 min)', value: 3 },
                            { name: 'Kick', value: 4 },
                            { name: 'Ban', value: 5 }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Mostra o status atual da moderação automática')),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const config = await configDb.read();
            
            if (!config[interaction.guildId]) {
                config[interaction.guildId] = {};
            }

            if (!config[interaction.guildId].automod) {
                config[interaction.guildId].automod = {
                    antilink: { enabled: false },
                    antispam: { enabled: false },
                    antiinvite: { enabled: false }
                };
            }

            switch (subcommand) {
                case 'antilink': {
                    const ativar = interaction.options.getBoolean('ativar');
                    const punicao = interaction.options.getInteger('punicao');
                    const whitelist = interaction.options.getString('whitelist')?.split(',').map(link => link.trim()) || [];

                    config[interaction.guildId].automod.antilink = {
                        enabled: ativar,
                        punishment: punicao,
                        whitelist: whitelist
                    };

                    await configDb.write(config);

                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('🔗 Anti-Link Configurado')
                        .setDescription(`Sistema anti-link foi ${ativar ? 'ativado' : 'desativado'}`)
                        .addFields(
                            { name: 'Punição', value: this.getPunishmentName(punicao), inline: true },
                            { name: 'Links Permitidos', value: whitelist.length ? whitelist.join('\n') : 'Nenhum', inline: true }
                        );

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'antispam': {
                    const ativar = interaction.options.getBoolean('ativar');
                    const limite = interaction.options.getInteger('limite');
                    const punicao = interaction.options.getInteger('punicao');

                    config[interaction.guildId].automod.antispam = {
                        enabled: ativar,
                        limit: limite,
                        punishment: punicao
                    };

                    await configDb.write(config);

                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('🔄 Anti-Spam Configurado')
                        .setDescription(`Sistema anti-spam foi ${ativar ? 'ativado' : 'desativado'}`)
                        .addFields(
                            { name: 'Limite', value: `${limite} mensagens/minuto`, inline: true },
                            { name: 'Punição', value: this.getPunishmentName(punicao), inline: true }
                        );

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'antiinvite': {
                    const ativar = interaction.options.getBoolean('ativar');
                    const punicao = interaction.options.getInteger('punicao');

                    config[interaction.guildId].automod.antiinvite = {
                        enabled: ativar,
                        punishment: punicao
                    };

                    await configDb.write(config);

                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('📨 Anti-Invite Configurado')
                        .setDescription(`Sistema anti-invite foi ${ativar ? 'ativado' : 'desativado'}`)
                        .addFields(
                            { name: 'Punição', value: this.getPunishmentName(punicao), inline: true }
                        );

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }

                case 'status': {
                    const automod = config[interaction.guildId].automod;
                    const embed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle('🛡️ Status da Moderação Automática')
                        .addFields(
                            {
                                name: '🔗 Anti-Link',
                                value: automod.antilink.enabled
                                    ? `✅ Ativado\nPunição: ${this.getPunishmentName(automod.antilink.punishment)}\nWhitelist: ${automod.antilink.whitelist?.join(', ') || 'Nenhum'}`
                                    : '❌ Desativado',
                                inline: false
                            },
                            {
                                name: '🔄 Anti-Spam',
                                value: automod.antispam.enabled
                                    ? `✅ Ativado\nLimite: ${automod.antispam.limit} msgs/min\nPunição: ${this.getPunishmentName(automod.antispam.punishment)}`
                                    : '❌ Desativado',
                                inline: false
                            },
                            {
                                name: '📨 Anti-Invite',
                                value: automod.antiinvite.enabled
                                    ? `✅ Ativado\nPunição: ${this.getPunishmentName(automod.antiinvite.punishment)}`
                                    : '❌ Desativado',
                                inline: false
                            }
                        );

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    break;
                }
            }

        } catch (error) {
            console.error('Erro ao executar comando automod:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao executar o comando.',
                ephemeral: true
            }).catch(() => {});
        }
    },

    getPunishmentName(value) {
        const punishments = {
            1: 'Deletar Mensagem',
            2: 'Avisar Usuário',
            3: 'Timeout (5 min)',
            4: 'Kick',
            5: 'Ban'
        };
        return punishments[value] || 'Desconhecido';
    }
};
