import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Events  } from 'discord.js';;
import JsonDatabase from '../utils/jsonDatabase.js';;
import statusManager from '../utils/statusManager.js';;
import path from 'path';;

// Databases
const configDb = new JsonDatabase(path.join(__dirname, '../database/config.json'));
const statsDb = new JsonDatabase(path.join(__dirname, '../database/stats.json'));

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            console.log(`✅ Bot logado como ${client.user.tag}`);
            console.log('🔍 Verificando intents e eventos...');
            
            // Verifica se o intent de membros está ativado
            if (!client.guilds.cache.first()?.members.cache.size) {
                console.warn('⚠️ O intent GUILD_MEMBERS pode não estar ativado. Isso é necessário para o autorole e welcome funcionarem.');
                console.warn('📝 Ative o intent GUILD_MEMBERS no portal do Discord Developer.');
            }

            // Lista eventos registrados
            const events = client.eventNames();
            console.log('📋 Eventos registrados:', events);

            // Verifica eventos específicos
            const hasGuildMemberAdd = events.includes('guildMemberAdd');
            const hasGuildMemberRemove = events.includes('guildMemberRemove');

            if (!hasGuildMemberAdd) {
                console.warn('⚠️ Evento guildMemberAdd não encontrado! O welcome e autorole podem não funcionar.');
            }

            if (!hasGuildMemberRemove) {
                console.warn('⚠️ Evento guildMemberRemove não encontrado! As mensagens de saída podem não funcionar.');
            }

            // Mostra status dos eventos principais
            console.log('📊 Status dos Eventos:');
            console.log(`- GuildMemberAdd: ${hasGuildMemberAdd ? '✅' : '❌'}`);
            console.log(`- GuildMemberRemove: ${hasGuildMemberRemove ? '✅' : '❌'}`);

            // Carrega configurações
            const config = await configDb.read();

            // Inicializa o gerenciador de status
            await statusManager.initialize(client);

            // Carrega configurações para cada servidor
            for (const guild of client.guilds.cache.values()) {
                try {
                    const guildId = guild.id;
                    
                    // Verifica se o servidor já tem configurações
                    if (!config[guildId]) {
                        config[guildId] = {
                            prefix: '!',
                            welcome: {
                                enabled: false,
                                channelId: null,
                                message: 'Bem-vindo(a) {user} ao {server}!'
                            },
                            leave: {
                                enabled: false,
                                channelId: null,
                                message: 'Até mais, {user}!'
                            },
                            autoRole: {
                                enabled: false,
                                roleId: null
                            },
                            verification: {
                                enabled: false,
                                roleId: null,
                                dmMessage: null
                            },
                            logs: {
                                enabled: false,
                                channelId: null
                            },
                            automod: {
                                links: {
                                    enabled: false,
                                    allowedDomains: []
                                },
                                spam: {
                                    enabled: false,
                                    maxMessages: 5,
                                    timeWindow: 5000
                                },
                                invites: {
                                    enabled: false
                                }
                            }
                        };

                        // Salva as configurações padrão
                        await configDb.write(config);
                    }

                    // Inicializa estatísticas do servidor se não existirem
                    const stats = await statsDb.read();
                    if (!stats[guildId]) {
                        stats[guildId] = {
                            commands: {}
                        };
                        await statsDb.write(stats);
                    }

                    console.log(`✅ Configurações carregadas para: ${guild.name}`);
                } catch (error) {
                    console.error(`❌ Erro ao carregar configurações para ${guild.name}:`, error);
                }
            }

        } catch (error) {
            console.error('❌ Erro no evento ready:', error);
        }
    }
};
