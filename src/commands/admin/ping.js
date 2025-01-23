import { SlashCommandBuilder, EmbedBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Mostra a latência do bot e tempo de resposta da API'),
        
    async execute(interaction) {
        try {
            const sent = await interaction.reply({ content: 'Calculando ping...', fetchReply: true });
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = interaction.client.ws.ping;

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: '📡 Latência do Bot', value: `${latency}ms`, inline: true },
                    { name: '🌐 Latência da API', value: `${apiLatency}ms`, inline: true }
                )
                .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('Erro ao executar o comando ping:', error);
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: '❌ Ocorreu um erro ao verificar o ping.',
                    ephemeral: true 
                });
            }
        }
    },
};
