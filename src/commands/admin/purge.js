import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Exclui um número específico de mensagens em um canal')
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('O número de mensagens a excluir')
                .setRequired(true)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('quantidade');
        if (amount < 1 || amount > 100) {
            return interaction.reply('Por favor, insira um número entre 1 e 100.');
        }
        await interaction.channel.bulkDelete(amount, true);
        await interaction.reply(`${amount} mensagens foram excluídas.`);
    },
};
