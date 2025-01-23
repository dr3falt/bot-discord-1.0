import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder } from 'discord.js';
import { JsonDatabase } from '../../utils/jsonDatabase.js';
import path from 'path';

const db = new JsonDatabase(path.join(__dirname, '../../database/permissions.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('setowner')
        .setDescription('Define o dono do bot')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('O usuário para definir como dono')
                .setRequired(true)),

    async execute(interaction) {
        const perms = await db.read();
        
        // Verificar se já existe um dono
        if (perms.ownerId && perms.ownerId !== interaction.user.id) {
            return await interaction.reply({
                content: 'Apenas o dono atual pode transferir a propriedade do bot.',
                ephemeral: true
            });
        }

        const newOwner = interaction.options.getUser('usuario');

        await db.update({
            guildId: interaction.guild.id,
            ownerId: newOwner.id
        });

        await interaction.reply({
            content: `${newOwner.tag} foi definido como dono do bot.`,
            ephemeral: true
        });
    },
};
