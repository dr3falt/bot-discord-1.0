import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const commands = [];
const commandsPath = path.join(__dirname, '..', 'commands');
const commandFolders = fs.readdirSync(commandsPath);

// Carrega todos os comandos
for (const folder of commandFolders) {
    if (folder === 'prefix') continue; // Pula a pasta prefix

    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const filePath = path.join(folderPath, file);
            const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
            const command = await import(fileUrl);

            if (command.default && 'data' in command.default && 'execute' in command.default) {
                commands.push(command.default.data.toJSON());
                console.log(`📥 Comando carregado: ${command.default.data.name} (${folder}/${file})`);
            }
        } catch (error) {
            console.error(`❌ Erro ao carregar comando ${folder}/${file}:`, error);
        }
    }
}

// Configura o REST
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Deploy dos comandos
(async () => {
    try {
        console.log('🔄 Iniciando deploy dos comandos...');

        if (!process.env.TOKEN || !process.env.CLIENT_ID) {
            console.error('❌ Erro: TOKEN ou CLIENT_ID não encontrados no arquivo .env');
            process.exit(1);
        }

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('✅ Deploy dos comandos concluído!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao fazer deploy dos comandos:', error);
        process.exit(1);
    }
})();
