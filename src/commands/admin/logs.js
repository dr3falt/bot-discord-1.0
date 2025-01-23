import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';

const db = new JsonDatabase(path.join(__dirname, '../../data/config.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configura o canal de logs')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal para enviar os logs')
                .setRequired(true)),

    async execute(interaction) {
        // Verificar permissões
        if (!(await checkPermissions(interaction.user.id, interaction.guild.id, 'admin'))) {
            return await interaction.reply({
                content: 'Você precisa ser um administrador para usar este comando.',
                ephemeral: true
            });
        }

        const logChannel = interaction.options.getChannel('canal');
        
        // Verificar se é um canal de texto
        if (!logChannel.isTextBased()) {
            return await interaction.reply({
                content: 'Por favor, selecione um canal de texto.',
                ephemeral: true
            });
        }

        try {
            const config = await db.read();
            config.logChannelId = logChannel.id;
            await db.write(config);

            await interaction.reply({
                content: `Canal de logs definido para ${logChannel}.`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'Houve um erro ao configurar o canal de logs.',
                ephemeral: true
            });
        }
    },
};
