import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import { Collection } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CommandHandler {
    constructor(client) {
        this.client = client;
        this.commands = new Collection();
        this.client.commands = this.commands; // Garante que os comandos estejam acessíveis no cliente
    }

    validateCommand(command, file) {
        if (!command.data) {
            throw new Error(`Comando em ${file} não possui a propriedade 'data'`);
        }
        if (!command.execute) {
            throw new Error(`Comando em ${file} não possui a função 'execute'`);
        }
        if (typeof command.execute !== 'function') {
            throw new Error(`A propriedade 'execute' em ${file} não é uma função`);
        }
        if (!command.data.name) {
            throw new Error(`Comando em ${file} não possui um nome definido`);
        }
        if (!command.data.description) {
            throw new Error(`Comando em ${file} não possui uma descrição definida`);
        }
    }

    async loadCommands() {
        try {
            console.log('📂 Iniciando carregamento de comandos...');
            
            const commandsPath = path.join(__dirname, '..', 'commands');
            if (!fs.existsSync(commandsPath)) {
                throw new Error(`Diretório de comandos não encontrado: ${commandsPath}`);
            }

            const commandFolders = fs.readdirSync(commandsPath);
            let totalCommands = 0;
            let loadedCommands = 0;
            let failedCommands = 0;

            // Limpa a coleção de comandos antes de recarregar
            this.commands.clear();

            for (const folder of commandFolders) {
                if (folder === 'prefix') continue;

                const folderPath = path.join(commandsPath, folder);
                if (!fs.statSync(folderPath).isDirectory()) continue;

                const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
                totalCommands += commandFiles.length;

                for (const file of commandFiles) {
                    try {
                        const filePath = path.join(folderPath, file);
                        const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
                        
                        const commandModule = await import(fileUrl);
                        
                        if (!commandModule.default) {
                            console.error(`❌ Comando inválido em ${folder}/${file}: Falta exportação padrão`);
                            failedCommands++;
                            continue;
                        }

                        const command = commandModule.default;

                        try {
                            this.validateCommand(command, `${folder}/${file}`);
                        } catch (validationError) {
                            console.error(`❌ Validação falhou para ${folder}/${file}:`, validationError.message);
                            failedCommands++;
                            continue;
                        }

                        // Verifica se já existe um comando com o mesmo nome
                        if (this.commands.has(command.data.name)) {
                            console.error(`❌ Comando duplicado encontrado: ${command.data.name} em ${folder}/${file}`);
                            failedCommands++;
                            continue;
                        }

                        this.commands.set(command.data.name, command);
                        loadedCommands++;
                        
                        console.log(`✅ Comando carregado: ${folder}/${file}`);
                    } catch (error) {
                        console.error(`❌ Erro ao carregar comando ${folder}/${file}:`, error);
                        failedCommands++;
                    }
                }
            }

            console.log(`\n📊 Status do carregamento de comandos:`);
            console.log(`   Total de comandos: ${totalCommands}`);
            console.log(`   Comandos carregados: ${loadedCommands}`);
            console.log(`   Comandos com erro: ${failedCommands}\n`);

            if (loadedCommands === 0) {
                throw new Error('Nenhum comando foi carregado com sucesso!');
            }

            return true;
        } catch (error) {
            console.error('❌ Erro fatal ao carregar comandos:', error);
            return false;
        }
    }

    async reloadCommand(commandName) {
        try {
            const command = this.commands.get(commandName);
            if (!command) {
                return false;
            }

            // Remove o comando da coleção
            this.commands.delete(commandName);

            // Recarrega o comando
            await this.loadCommands();

            return true;
        } catch (error) {
            console.error(`❌ Erro ao recarregar comando ${commandName}:`, error);
            return false;
        }
    }

    getCommand(name) {
        return this.commands.get(name);
    }

    hasCommand(name) {
        return this.commands.has(name);
    }

    getAllCommands() {
        return Array.from(this.commands.values());
    }
}

export default CommandHandler;
