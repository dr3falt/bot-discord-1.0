import { Collection  } from 'discord.js';;

class CommandManager {
    constructor() {
        this.commands = new Collection();
    }

    // Registra um comando que pode ser usado tanto como slash quanto como prefixo
    registerCommand(commandData) {
        const { name, description, execute, slashExecute, prefixExecute } = commandData;

        // Se não tiver uma execução específica para slash ou prefix, usa a execução padrão
        const finalCommand = {
            name,
            description,
            slashExecute: slashExecute || execute,
            prefixExecute: prefixExecute || execute
        };

        this.commands.set(name, finalCommand);
        return finalCommand;
    }

    // Executa um comando baseado no tipo (slash ou prefix)
    async executeCommand(name, type, ...args) {
        const command = this.commands.get(name);
        if (!command) return false;

        try {
            if (type === 'slash') {
                await command.slashExecute(...args);
            } else {
                await command.prefixExecute(...args);
            }
            return true;
        } catch (error) {
            console.error(`Erro ao executar comando ${name}:`, error);
            return false;
        }
    }

    // Retorna todos os comandos registrados
    getAllCommands() {
        return this.commands;
    }

    // Verifica se um comando existe
    hasCommand(name) {
        return this.commands.has(name);
    }

    // Retorna um comando específico
    getCommand(name) {
        return this.commands.get(name);
    }
}

export default new CommandManager();
