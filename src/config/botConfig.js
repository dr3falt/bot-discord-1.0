export default {
    // Configurações de permissões
    permissions: {
        levels: {
            OWNER: 1000,
            ADMIN: 100,
            MOD: 50,
            HELPER: 25,
            MEMBER: 0
        },
        defaults: {
            admin: {
                name: 'Administrador',
                commands: ['*'],
                level: 100
            },
            mod: {
                name: 'Moderador',
                commands: ['kick', 'ban', 'mute', 'warn', 'clear', 'poll', 'welcome', 'stats'],
                level: 50
            },
            helper: {
                name: 'Ajudante',
                commands: ['warn', 'mute', 'clear'],
                level: 25
            },
            member: {
                name: 'Membro',
                commands: ['help', 'serverinfo', 'userinfo'],
                level: 0
            }
        }
    },

    // Configurações de estatísticas
    stats: {
        maxHistoryDays: 30,
        graphColors: {
            joins: '#2ecc71',
            leaves: '#e74c3c',
            messages: '#3498db',
            members: '#f1c40f',
            background: '#2f3136',
            grid: '#ffffff33'
        },
        defaultGraphDimensions: {
            width: 800,
            height: 400
        },
        fonts: {
            title: {
                family: 'Arial',
                size: 20,
                color: '#ffffff'
            },
            axis: {
                family: 'Arial',
                size: 12,
                color: '#ffffff'
            },
            legend: {
                family: 'Arial',
                size: 14,
                color: '#ffffff'
            }
        }
    },

    // Configurações de mensagens automáticas
    autoMessages: {
        welcome: {
            color: '#2ecc71',
            defaultMessage: 'Bem-vindo(a) {user} ao {server}! 🎉\nVocê é nosso {count}º membro!'
        },
        leave: {
            color: '#e74c3c',
            defaultMessage: '{user} saiu do servidor! 👋\nAgora temos {count} membros.'
        },
        ban: {
            color: '#992d22',
            defaultMessage: '{user} foi banido do servidor!\nMotivo: {reason}'
        }
    },

    // Configurações de cache
    cache: {
        permissions: {
            ttl: 300000, // 5 minutos
            checkPeriod: 600000 // 10 minutos
        }
    },

    // Configurações de embeds
    embeds: {
        colors: {
            success: '#43b581',
            error: '#f04747',
            info: '#7289da',
            warning: '#faa61a',
            welcome: '#2ecc71',
            leave: '#e74c3c',
            ban: '#992d22',
            poll: '#3498db',
            stats: '#9b59b6',
            help: '#1abc9c'
        },
        footer: {
            text: ' 2024 Bot Security System',
            icon: 'https://i.imgur.com/YOUR_ICON.png' // Substitua pela URL do seu ícone
        },
        welcome: {
            banner: 'https://i.imgur.com/YOUR_BANNER.png', // Substitua pela URL do seu banner
            thumbnail: true
        },
        thumbnails: {
            success: 'https://i.imgur.com/SUCCESS_ICON.png',
            error: 'https://i.imgur.com/ERROR_ICON.png',
            warning: 'https://i.imgur.com/WARNING_ICON.png',
            info: 'https://i.imgur.com/INFO_ICON.png'
        },
        style: {
            borderRadius: '10px',
            padding: '20px',
            font: {
                title: {
                    name: 'Whitney',
                    size: '16px',
                    weight: 'bold'
                },
                description: {
                    name: 'Whitney',
                    size: '14px',
                    weight: 'normal'
                },
                fields: {
                    name: 'Whitney',
                    size: '14px',
                    weight: 'medium'
                }
            }
        }
    },

    // Configurações de comandos
    commands: {
        poll: {
            maxOptions: 10,
            minOptions: 2,
            maxTitleLength: 256,
            maxDescriptionLength: 1024,
            timeout: {
                min: 60000, // 1 minuto
                max: 604800000, // 1 semana
                default: 86400000 // 24 horas
            },
            emojis: {
                numbers: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
                yes: '✅',
                no: '❌'
            }
        },
        stats: {
            maxGraphDays: 30,
            minGraphDays: 1,
            defaultDays: 7,
            graphTypes: {
                members: {
                    name: 'Membros',
                    color: '#f1c40f'
                },
                messages: {
                    name: 'Mensagens',
                    color: '#3498db'
                },
                voice: {
                    name: 'Tempo em Call',
                    color: '#e91e63'
                }
            }
        },
        help: {
            categories: {
                ADMIN: {
                    name: 'Administração',
                    emoji: '⚙️'
                },
                MOD: {
                    name: 'Moderação',
                    emoji: '🛡️'
                },
                UTIL: {
                    name: 'Utilidades',
                    emoji: '🔧'
                },
                INFO: {
                    name: 'Informação',
                    emoji: 'ℹ️'
                },
                FUN: {
                    name: 'Diversão',
                    emoji: '🎮'
                }
            }
        }
    },

    // Configurações de logs
    logs: {
        colors: {
            memberJoin: '#43b581',
            memberLeave: '#f04747',
            memberUpdate: '#faa61a',
            messageDelete: '#f04747',
            messageEdit: '#faa61a',
            channelCreate: '#43b581',
            channelDelete: '#f04747',
            channelUpdate: '#faa61a',
            roleCreate: '#43b581',
            roleDelete: '#f04747',
            roleUpdate: '#faa61a',
            ban: '#992d22',
            unban: '#43b581',
            warn: '#faa61a'
        },
        format: {
            timestamp: 'DD/MM/YYYY HH:mm:ss',
            timezone: 'America/Sao_Paulo'
        }
    }
};
