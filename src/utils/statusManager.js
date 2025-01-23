import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { ActivityType  } from 'discord.js';;
import JsonDatabase from './jsonDatabase.js';;
import path from 'path';;

class StatusManager {
    constructor() {
        this.configDb = new JsonDatabase(path.join(__dirname, '../database/config.json'));
        this.statusList = [];
        this.currentIndex = 0;
        this.updateInterval = null;
    }

    async initialize(client) {
        try {
            const config = await this.configDb.read();
            
            // Carrega os status do config.json
            if (config.status && Array.isArray(config.status)) {
                this.statusList = config.status.map(status => ({
                    type: this.getActivityType(status.type),
                    text: status.text
                }));
            }

            // Se não houver status configurados, usa os padrões
            if (this.statusList.length === 0) {
                this.statusList = [
                    {
                        type: ActivityType.Playing,
                        text: 'Protegendo seu servidor '
                    },
                    {
                        type: ActivityType.Watching,
                        text: 'Vendas '
                    },
                    {
                        type: ActivityType.Listening,
                        text: 'seus comandos '
                    },
                    {
                        type: ActivityType.Playing,
                        text: `${client.guilds.cache.size} servidores `
                    }
                ];
            }

            // Inicia o ciclo de status
            this.startStatusCycle(client);
            
            console.log(' Sistema de status iniciado');
        } catch (error) {
            console.error(' Erro ao inicializar status:', error);
        }
    }

    getActivityType(type) {
        // Converte string para ActivityType
        switch (String(type).toLowerCase()) {
            case 'playing': return ActivityType.Playing;
            case 'streaming': return ActivityType.Streaming;
            case 'listening': return ActivityType.Listening;
            case 'watching': return ActivityType.Watching;
            case 'competing': return ActivityType.Competing;
            case 'custom': return ActivityType.Custom;
            // Se for número, usa diretamente
            default: return isNaN(type) ? ActivityType.Custom : Number(type);
        }
    }

    startStatusCycle(client) {
        // Limpa intervalo anterior se existir
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Atualiza o status inicial
        this.updateStatus(client);

        // Inicia o ciclo de atualização (a cada 2 minutos)
        this.updateInterval = setInterval(() => {
            this.updateStatus(client);
        }, 2 * 60 * 1000);
    }

    updateStatus(client) {
        const status = this.statusList[this.currentIndex];
        
        client.user.setPresence({
            activities: [{
                name: status.text,
                type: status.type
            }],
            status: 'online'
        });

        // Avança para o próximo status
        this.currentIndex = (this.currentIndex + 1) % this.statusList.length;
    }

    // Método para adicionar um novo status
    async addStatus(type, text) {
        const newStatus = {
            type: this.getActivityType(type),
            text: text
        };

        this.statusList.push(newStatus);
        
        // Atualiza o config.json com os novos status
        try {
            const config = await this.configDb.read();
            // Salva no formato original
            if (!config.status) config.status = [];
            config.status.push({
                type: String(type).toUpperCase(),
                text: text
            });
            await this.configDb.write(config);
        } catch (error) {
            console.error(' Erro ao salvar novo status:', error);
            throw error;
        }
    }

    // Método para remover um status
    async removeStatus(index) {
        if (index >= 0 && index < this.statusList.length) {
            this.statusList.splice(index, 1);
            
            // Atualiza o config.json
            try {
                const config = await this.configDb.read();
                config.status.splice(index, 1);
                await this.configDb.write(config);
            } catch (error) {
                console.error(' Erro ao remover status:', error);
                throw error;
            }
        }
    }

    // Método para listar todos os status
    getStatusList() {
        return this.statusList;
    }
}

export default new StatusManager();
