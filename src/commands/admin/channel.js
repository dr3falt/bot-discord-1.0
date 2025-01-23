import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField  } from 'discord.js';
import { checkPermissions  } from '../../utils/checkPermissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Gerencia canais do servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Cria um novo canal')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome do canal')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo do canal')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Texto', value: 'text' },
                            { name: 'Voz', value: 'voice' },
                            { name: 'Anúncio', value: 'news' },
                            { name: 'Palco', value: 'stage' }
                        ))
                .addChannelOption(option =>
                    option.setName('categoria')
                        .setDescription('Categoria do canal')
                        .addChannelTypes(ChannelType.GuildCategory)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Deleta um canal')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('O canal para deletar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('Bloqueia um canal')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('O canal para bloquear')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Desbloqueia um canal')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('O canal para desbloquear')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slowmode')
                .setDescription('Define o modo lento de um canal')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('O canal para configurar')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('segundos')
                        .setDescription('Segundos entre mensagens (0 para desativar)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(21600))), // 6 horas

    async execute(interaction) {
        if (!(await checkPermissions(interaction.user.id, interaction.guild.id, 'admin'))) {
            return await interaction.reply({
                content: 'Você precisa ser um administrador para usar este comando.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'create') {
                const name = interaction.options.getString('nome');
                const type = interaction.options.getString('tipo');
                const category = interaction.options.getChannel('categoria');

                let channelType;
                switch (type) {
                    case 'text': channelType = ChannelType.GuildText; break;
                    case 'voice': channelType = ChannelType.GuildVoice; break;
                    case 'news': channelType = ChannelType.GuildAnnouncement; break;
                    case 'stage': channelType = ChannelType.GuildStageVoice; break;
                }

                const channel = await interaction.guild.channels.create({
                    name: name,
                    type: channelType,
                    parent: category,
                    reason: `Criado por ${interaction.user.tag}`
                });

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Canal Criado')
                    .setDescription(`Canal ${channel} criado com sucesso!`)
                    .addFields(
                        { name: 'Nome', value: name, inline: true },
                        { name: 'Tipo', value: type, inline: true },
                        { name: 'Categoria', value: category ? category.name : 'Nenhuma', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            else if (subcommand === 'delete') {
                const channel = interaction.options.getChannel('canal');
                
                await channel.delete(`Deletado por ${interaction.user.tag}`);
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('✅ Canal Deletado')
                    .setDescription(`O canal \`${channel.name}\` foi deletado com sucesso!`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            else if (subcommand === 'lock') {
                const channel = interaction.options.getChannel('canal');
                
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: false,
                    AddReactions: false
                });

                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🔒 Canal Bloqueado')
                    .setDescription(`O canal ${channel} foi bloqueado com sucesso!`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await channel.send({ embeds: [embed] });
            }

            else if (subcommand === 'unlock') {
                const channel = interaction.options.getChannel('canal');
                
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: null,
                    AddReactions: null
                });

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🔓 Canal Desbloqueado')
                    .setDescription(`O canal ${channel} foi desbloqueado com sucesso!`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await channel.send({ embeds: [embed] });
            }

            else if (subcommand === 'slowmode') {
                const channel = interaction.options.getChannel('canal');
                const seconds = interaction.options.getInteger('segundos');
                
                await channel.setRateLimitPerUser(seconds);

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('⏱️ Modo Lento Configurado')
                    .setDescription(`Modo lento do canal ${channel} configurado para ${seconds} segundos.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Erro ao executar comando channel:', error);
            await interaction.reply({
                content: 'Houve um erro ao executar o comando. Verifique as permissões do bot.',
                ephemeral: true
            });
        }
    },
};
