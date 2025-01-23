import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder } from 'discord.js';
import embedBuilder from '../../utils/embedBuilder.js';
import JsonDatabase from '../../utils/jsonDatabase.js';
import path from 'path';
import os from 'os';

const statsDb = new JsonDatabase(path.join(__dirname, '../../database/stats.json'));

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Mostra estatísticas do servidor e do bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('servidor')
                .setDescription('Mostra estatísticas do servidor'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bot')
                .setDescription('Mostra estatísticas do bot')),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const stats = await statsDb.read() || {};
            const guildId = interaction.guild.id;
            
            // Inicializa estatísticas do servidor se não existirem
            if (!stats[guildId]) {
                stats[guildId] = { commands: {}, messages: 0, members: {}, channels: {} };
            }

            const guildStats = stats[guildId];

            if (subcommand === 'servidor') {
                // Estatísticas do servidor
                const guild = interaction.guild;
                const owner = await guild.fetchOwner();
                
                // Membros
                const members = await guild.members.fetch();
                const totalMembers = guild.memberCount;
                const humanMembers = members.filter(member => !member.user.bot).size;
                const botMembers = members.filter(member => member.user.bot).size;
                const onlineMembers = members.filter(member => 
                    member.presence?.status === 'online' || 
                    member.presence?.status === 'idle' || 
                    member.presence?.status === 'dnd'
                ).size;

                // Canais
                const channels = guild.channels.cache;
                const totalChannels = channels.size;
                const textChannels = channels.filter(c => c.type === 0).size;
                const voiceChannels = channels.filter(c => c.type === 2).size;
                const categories = channels.filter(c => c.type === 4).size;
                const threadChannels = channels.filter(c => c.type === 11 || c.type === 12).size;

                // Cargos
                const roles = guild.roles.cache;
                const totalRoles = roles.size;
                const managedRoles = roles.filter(r => r.managed).size;
                const colorRoles = roles.filter(r => r.color !== 0).size;

                // Crescimento
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                const recentMembers = members.filter(member => member.joinedTimestamp > sevenDaysAgo).size;

                // Emojis
                const emojis = guild.emojis.cache;
                const totalEmojis = emojis.size;
                const animatedEmojis = emojis.filter(e => e.animated).size;
                const staticEmojis = totalEmojis - animatedEmojis;

                const embed = embedBuilder.custom({
                    title: '📊 Estatísticas do Servidor',
                    fields: [
                        {
                            name: '👥 Membros',
                            value: [
                                `Total: ${totalMembers}`,
                                `Humanos: ${humanMembers}`,
                                `Bots: ${botMembers}`,
                                `Online: ${onlineMembers}`,
                                `Novos: +${recentMembers} (7 dias)`
                            ].join('\n'),
                            inline: true
                        },
                        {
                            name: '📝 Canais',
                            value: [
                                `Total: ${totalChannels}`,
                                `Texto: ${textChannels}`,
                                `Voz: ${voiceChannels}`,
                                `Categorias: ${categories}`,
                                `Threads: ${threadChannels}`
                            ].join('\n'),
                            inline: true
                        },
                        {
                            name: '🏷️ Cargos',
                            value: [
                                `Total: ${totalRoles}`,
                                `Gerenciados: ${managedRoles}`,
                                `Com Cor: ${colorRoles}`
                            ].join('\n'),
                            inline: true
                        },
                        {
                            name: '😀 Emojis',
                            value: [
                                `Total: ${totalEmojis}`,
                                `Animados: ${animatedEmojis}`,
                                `Estáticos: ${staticEmojis}`
                            ].join('\n'),
                            inline: true
                        },
                        {
                            name: '🔧 Configurações',
                            value: [
                                `Dono: ${owner.user.tag}`,
                                `Criado: <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
                                `Impulsos: ${guild.premiumSubscriptionCount}`,
                                `Nível: ${guild.premiumTier}`
                            ].join('\n'),
                            inline: true
                        }
                    ]
                });

                // Adiciona o ícone do servidor se existir
                if (guild.iconURL()) {
                    embed.setThumbnail(guild.iconURL({ dynamic: true }));
                }

                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'bot') {
                // Estatísticas do bot
                const client = interaction.client;
                
                // Tempo online
                const uptime = process.uptime();
                const days = Math.floor(uptime / 86400);
                const hours = Math.floor((uptime % 86400) / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = Math.floor(uptime % 60);
                
                // Uso de memória
                const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
                const totalMemory = os.totalmem() / 1024 / 1024;
                const freeMemory = os.freemem() / 1024 / 1024;
                
                // Uso de comandos
                const totalCommands = Object.values(guildStats.commands || {}).reduce((a, b) => a + b, 0);
                const topCommands = Object.entries(guildStats.commands || {})
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([cmd, uses], i) => `${i + 1}. ${cmd}: ${uses} usos`);

                const embed = embedBuilder.custom({
                    title: '🤖 Estatísticas do Bot',
                    fields: [
                        {
                            name: '📊 Geral',
                            value: [
                                `Servidores: ${client.guilds.cache.size}`,
                                `Usuários: ${client.users.cache.size}`,
                                `Comandos: ${client.commands.size}`,
                                `Ping: ${client.ws.ping}ms`
                            ].join('\n'),
                            inline: true
                        },
                        {
                            name: '⏰ Uptime',
                            value: [
                                `${days} dias`,
                                `${hours} horas`,
                                `${minutes} minutos`,
                                `${seconds} segundos`
                            ].join('\n'),
                            inline: true
                        },
                        {
                            name: '💾 Memória',
                            value: [
                                `Usado: ${usedMemory.toFixed(2)} MB`,
                                `Total: ${totalMemory.toFixed(2)} MB`,
                                `Livre: ${freeMemory.toFixed(2)} MB`
                            ].join('\n'),
                            inline: true
                        },
                        {
                            name: '📈 Comandos Mais Usados',
                            value: topCommands.length > 0 
                                ? topCommands.join('\n')
                                : 'Nenhum comando usado ainda',
                            inline: false
                        }
                    ],
                    footer: { 
                        text: `Node ${process.version} | Discord.js v14`
                    }
                });

                // Adiciona o avatar do bot se existir
                if (client.user.avatarURL()) {
                    embed.setThumbnail(client.user.avatarURL({ dynamic: true }));
                }

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Erro ao executar comando stats:', error);
            const errorEmbed = embedBuilder.error( 'Erro', 'Ocorreu um erro ao buscar as estatísticas.'
            );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
