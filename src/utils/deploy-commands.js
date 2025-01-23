import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Cores para o console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function loadCommands() {
    const commands = [];
    const commandsByCategory = {};

    console.log(`${colors.cyan}📂 Carregando comandos...${colors.reset}\n`);

    try {
        // Carrega os comandos da pasta commands
        const foldersPath = join(__dirname, '..', 'commands');
        const commandFolders = await fs.readdir(foldersPath);

        for (const folder of commandFolders) {
            const commandsPath = join(foldersPath, folder);
            const folderStat = await fs.stat(commandsPath);
            
            if (!folderStat.isDirectory()) continue;
            
            const commandFiles = (await fs.readdir(commandsPath))
                .filter(file => file.endsWith('.js'));
            
            commandsByCategory[folder] = [];

            for (const file of commandFiles) {
                try {
                    const filePath = join(commandsPath, file);
                    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
                    const commandModule = await import(fileUrl);
                    
                    if (!commandModule.default?.data || !commandModule.default?.execute) {
                        console.error(`${colors.red}❌ Erro ao carregar ${file}: Comando inválido - faltando data ou execute${colors.reset}`);
                        continue;
                    }

                    commands.push(commandModule.default.data.toJSON());
                    commandsByCategory[folder].push(commandModule.default.data.name);
                    console.log(`${colors.green}✅ Carregado: ${file}${colors.reset}`);
                } catch (error) {
                    console.error(`${colors.red}❌ Erro ao carregar ${file}: ${error.message}${colors.reset}`);
                }
            }
        }

        // Exibe resumo dos comandos por categoria
        console.log('\n📊 Comandos por Categoria:');
        for (const [category, cmds] of Object.entries(commandsByCategory)) {
            if (cmds.length > 0) {
                console.log(`\n${colors.bright}${category} (${cmds.length}):${colors.reset}`);
                console.log(`└─ ${cmds.join(', ')}`);
            }
        }

        return { commands, commandsByCategory };
    } catch (error) {
        console.error(`${colors.red}❌ Erro ao carregar comandos:${colors.reset}`, error);
        process.exit(1);
    }
}

async function deployCommands() {
    try {
        if (!process.env.TOKEN || !process.env.CLIENT_ID) {
            console.error(`${colors.red}❌ Erro: TOKEN ou CLIENT_ID não encontrados no arquivo .env${colors.reset}`);
            process.exit(1);
        }

        const { commands, commandsByCategory } = await loadCommands();
        
        if (commands.length === 0) {
            console.error(`${colors.red}❌ Nenhum comando encontrado para deploy${colors.reset}`);
            return;
        }

        console.log(`\n${colors.yellow}🔄 Atualizando ${commands.length} comandos...${colors.reset}`);

        const rest = new REST().setToken(process.env.TOKEN);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`\n${colors.green}✅ Deploy realizado com sucesso! ${data.length} comandos atualizados${colors.reset}`);
        process.exit(0); // Adicionando finalização explícita com código de sucesso
    } catch (error) {
        console.error(`${colors.red}❌ Erro durante o deploy:${colors.reset}`, error);
        process.exit(1);
    }
}

// Executa o deploy e trata erros não capturados
deployCommands().catch(error => {
    console.error(`${colors.red}❌ Erro fatal durante o deploy:${colors.reset}`, error);
    process.exit(1);
});
