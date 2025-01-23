import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';

const pollDb = new JsonDatabase(path.join(__dirname, '../../database/polls.json'));
const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export default {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Sistema avançado de enquetes')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Cria uma nova enquete')
                .addStringOption(option =>
                    option.setName('titulo')
                        .setDescription('Título da enquete')
                        .setRequired(true)
                        .setMaxLength(256))
                .addStringOption(option =>
                    option.setName('opcoes')
                        .setDescription('Opções separadas por vírgula (ex: Sim, Não, Talvez)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('descricao')
                        .setDescription('Descrição adicional da enquete')
                        .setRequired(false)
                        .setMaxLength(1024))
                .addIntegerOption(option =>
                    option.setName('duracao')
                        .setDescription('Duração da enquete em horas (0 = sem limite)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(720))
                .addBooleanOption(option =>
                    option.setName('multiplo')
                        .setDescription('Permitir votar em múltiplas opções')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Define o canal de enquetes')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('Canal para enquetes')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Encerra uma enquete')
                .addStringOption(option =>
                    option.setName('mensagem_id')
                        .setDescription('ID da mensagem da enquete')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'config':
                    await handleConfig(interaction);
                    break;
                case 'create':
                    await handleCreate(interaction);
                    break;
                case 'end':
                    await handleEnd(interaction);
                    break;
            }
        } catch (error) {
            console.error('Erro no comando poll:', error);
            const errorMessage = error.message || 'Ocorreu um erro desconhecido.';
            
            try {
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: `❌ Erro: ${errorMessage}`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `❌ Erro: ${errorMessage}`,
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Erro ao enviar mensagem de erro:', replyError);
            }
        }
    }
};

async function handleConfig(interaction) {
    const channel = interaction.options.getChannel('canal');

    // Verificações do canal
    if (!channel.isTextBased()) {
        throw new Error('O canal selecionado deve ser um canal de texto.');
    }

    // Verifica permissões do bot no canal
    const permissions = channel.permissionsFor(interaction.client.user);
    if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks', 'AddReactions'])) {
        throw new Error('Não tenho todas as permissões necessárias neste canal. Preciso de: Ver Canal, Enviar Mensagens, Incorporar Links e Adicionar Reações.');
    }

    // Salva configuração
    const config = await pollDb.read();
    if (!config[interaction.guild.id]) {
        config[interaction.guild.id] = {};
    }

    config[interaction.guild.id].pollChannel = channel.id;
    await pollDb.write(config);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Canal de Enquetes Configurado')
        .setDescription(`Canal definido para ${channel}`)
        .addFields({
            name: 'Permissões Verificadas',
            value: '✅ Ver Canal\n✅ Enviar Mensagens\n✅ Incorporar Links\n✅ Adicionar Reações'
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCreate(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Carrega configuração
    const config = await pollDb.read();
    const channelId = config[interaction.guild.id]?.pollChannel;

    if (!channelId) {
        throw new Error('Configure primeiro o canal de enquetes usando `/poll config`');
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
        throw new Error('Canal de enquetes não encontrado. Configure novamente.');
    }

    // Coleta e valida opções
    const title = interaction.options.getString('titulo');
    const description = interaction.options.getString('descricao');
    const duration = interaction.options.getInteger('duracao') || 0;
    const allowMultiple = interaction.options.getBoolean('multiplo') || false;

    const options = interaction.options.getString('opcoes')
        .split(',')
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0);

    if (options.length < 2) {
        throw new Error('A enquete precisa ter pelo menos 2 opções.');
    }
    if (options.length > 10) {
        throw new Error('A enquete pode ter no máximo 10 opções.');
    }

    // Cria embed da enquete
    const endTime = duration > 0 ? Date.now() + (duration * 3600000) : null;
    const pollEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 ' + title)
        .setDescription(description || '')
        .addFields(
            {
                name: 'Opções',
                value: options.map((opt, i) => `${EMOJIS[i]} ${opt}`).join('\n')
            },
            {
                name: 'Informações',
                value: [
                    `👤 **Criado por:** ${interaction.user}`,
                    `🔄 **Múltiplas escolhas:** ${allowMultiple ? 'Sim' : 'Não'}`,
                    endTime ? `⏰ **Termina em:** <t:${Math.floor(endTime / 1000)}:R>` : '⏰ **Duração:** Indefinida'
                ].join('\n')
            }
        )
        .setFooter({ 
            text: allowMultiple ?  'Você pode votar em várias opções!' :  'Você só pode votar em uma opção!' 
        })
        .setTimestamp();

    try {
        // Envia a enquete
        const pollMessage = await channel.send({ embeds: [pollEmbed] });

        // Adiciona reações
        for (let i = 0; i < options.length; i++) {
            await pollMessage.react(EMOJIS[i]);
        }

        // Salva dados da enquete
        if (!config[interaction.guild.id].polls) {
            config[interaction.guild.id].polls = {};
        }

        config[interaction.guild.id].polls[pollMessage.id] = {
            title,
            options,
            creator: interaction.user.id,
            createdAt: Date.now(),
            endTime,
            allowMultiple,
            active: true
        };

        await pollDb.write(config);

        // Se tiver duração, agenda o término
        if (endTime) {
            setTimeout(() => endPoll(interaction.guild.id, pollMessage.id), duration * 3600000);
        }

        const responseEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Enquete Criada')
            .setDescription(`Sua enquete foi criada com sucesso em ${channel}`)
            .addFields({
                name: 'ID da Mensagem',
                value: `\`${pollMessage.id}\` *(guarde para encerrar a enquete)*`
            });

        await interaction.editReply({ embeds: [responseEmbed] });
    } catch (error) {
        throw new Error(`Erro ao criar enquete: ${error.message}`);
    }
}

async function handleEnd(interaction) {
    const messageId = interaction.options.getString('mensagem_id');
    await interaction.deferReply({ ephemeral: true });

    try {
        const config = await pollDb.read();
        const poll = config[interaction.guild.id]?.polls?.[messageId];

        if (!poll) {
            throw new Error('Enquete não encontrada.');
        }

        if (!poll.active) {
            throw new Error('Esta enquete já está encerrada.');
        }

        const channel = interaction.guild.channels.cache.get(config[interaction.guild.id].pollChannel);
        if (!channel) {
            throw new Error('Canal da enquete não encontrado.');
        }

        const message = await channel.messages.fetch(messageId);
        if (!message) {
            throw new Error('Mensagem da enquete não encontrada.');
        }

        // Calcula resultados
        const results = poll.options.map((option, index) => {
            const reaction = message.reactions.cache.get(EMOJIS[index]);
            return {
                option,
                votes: (reaction?.count || 1) - 1 // -1 para remover o voto do bot
            };
        });

        // Ordena por número de votos
        results.sort((a, b) => b.votes - a.votes);

        // Cria embed com resultados
        const resultsEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle(`📊 Resultados: ${poll.title}`)
            .addFields({
                name: 'Resultados Finais',
                value: results.map((result, i) =>
                    `${i + 1}. ${result.option}: ${result.votes} votos`
                ).join('\n')
            })
            .setFooter({ text: 'Enquete Encerrada' })
            .setTimestamp();

        // Atualiza a mensagem e remove reações
        await message.edit({ embeds: [resultsEmbed] });
        await message.reactions.removeAll();

        // Atualiza status no banco de dados
        poll.active = false;
        poll.results = results;
        poll.endedAt = Date.now();
        poll.endedBy = interaction.user.id;
        await pollDb.write(config);

        const responseEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Enquete Encerrada')
            .setDescription('A enquete foi encerrada e os resultados foram publicados.');

        await interaction.editReply({ embeds: [responseEmbed] });
    } catch (error) {
        throw new Error(`Erro ao encerrar enquete: ${error.message}`);
    }
}

function endPoll(guildId, messageId) {
    // Implementação para encerrar a enquete automaticamente após o tempo definido
}
