import { SlashCommandBuilder  } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll a dice')
        .addNumberOption(option =>
            option.setName('sides')
                .setDescription('Number of sides on the dice (default: 6)')
                .setMinValue(2)
                .setMaxValue(100))
        .addNumberOption(option =>
            option.setName('count')
                .setDescription('Number of dice to roll (default: 1)')
                .setMinValue(1)
                .setMaxValue(10)),
    async execute(interaction) {
        const sides = interaction.options.getNumber('sides') ?? 6;
        const count = interaction.options.getNumber('count') ?? 1;

        const rolls = [];
        let total = 0;

        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
        }

        const response = count === 1
            ? `🎲 You rolled a ${rolls[0]}!`
            : `🎲 You rolled ${count} ${sides}-sided dice:\n` +
              `Rolls: ${rolls.join(', ')}\n` +
              `Total: ${total}`;

        await interaction.reply(response);
    },
};
