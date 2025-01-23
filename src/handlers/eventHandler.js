import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import { Events } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class EventHandler {
    constructor(client) {
        this.client = client;
        this.loadedEvents = new Map();
    }

    validateEvent(event, file) {
        if (!event.name) {
            throw new Error(`Evento em ${file} não possui a propriedade 'name'`);
        }
        if (!event.execute) {
            throw new Error(`Evento em ${file} não possui a função 'execute'`);
        }
        if (typeof event.execute !== 'function') {
            throw new Error(`A propriedade 'execute' em ${file} não é uma função`);
        }
        if (!Object.values(Events).includes(event.name)) {
            console.warn(`⚠️ Aviso: Evento ${event.name} em ${file} não é um evento padrão do Discord.js`);
        }
    }

    async loadEvents() {
        try {
            console.log('📂 Iniciando carregamento de eventos...');
            
            const eventsPath = path.join(__dirname, '..', 'events');
            if (!fs.existsSync(eventsPath)) {
                throw new Error(`Diretório de eventos não encontrado: ${eventsPath}`);
            }

            const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
            let totalEvents = eventFiles.length;
            let loadedEvents = 0;
            let failedEvents = 0;

            // Remove eventos anteriores
            for (const [eventName, eventInfo] of this.loadedEvents) {
                if (eventInfo.once) {
                    this.client.removeAllListeners(eventName);
                } else {
                    this.client.off(eventName, eventInfo.execute);
                }
            }
            this.loadedEvents.clear();

            for (const file of eventFiles) {
                try {
                    const filePath = path.join(eventsPath, file);
                    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
                    const eventModule = await import(fileUrl);

                    if (!eventModule.default) {
                        console.error(`❌ Evento inválido em ${file}: Falta exportação padrão`);
                        failedEvents++;
                        continue;
                    }

                    const event = eventModule.default;

                    try {
                        this.validateEvent(event, file);
                    } catch (validationError) {
                        console.error(`❌ Validação falhou para ${file}:`, validationError.message);
                        failedEvents++;
                        continue;
                    }

                    // Wrapper para capturar erros na execução do evento
                    const safeExecute = async (...args) => {
                        try {
                            await event.execute(...args);
                        } catch (error) {
                            console.error(`❌ Erro ao executar evento ${event.name}:`, error);
                        }
                    };

                    if (event.once) {
                        this.client.once(event.name, safeExecute);
                    } else {
                        this.client.on(event.name, safeExecute);
                    }

                    this.loadedEvents.set(event.name, {
                        execute: safeExecute,
                        once: event.once
                    });

                    loadedEvents++;
                    console.log(`📥 Evento carregado: ${event.name} (${file})`);
                } catch (error) {
                    console.error(`❌ Erro ao carregar evento ${file}:`, error);
                    failedEvents++;
                }
            }

            console.log(`\n📊 Status do carregamento de eventos:`);
            console.log(`   Total de eventos: ${totalEvents}`);
            console.log(`   Eventos carregados: ${loadedEvents}`);
            console.log(`   Eventos com erro: ${failedEvents}\n`);

            if (loadedEvents === 0) {
                throw new Error('Nenhum evento foi carregado com sucesso!');
            }

            return true;
        } catch (error) {
            console.error('❌ Erro fatal ao carregar eventos:', error);
            return false;
        }
    }

    hasEvent(eventName) {
        return this.loadedEvents.has(eventName);
    }

    getLoadedEvents() {
        return Array.from(this.loadedEvents.keys());
    }
}
