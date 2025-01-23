import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client, Collection, GatewayIntentBits, ActivityType, Partials } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pkg from 'wio.db';
const { JsonDB } = pkg;

import CommandHandler from '../handlers/commandHandler.js';
import ButtonHandler from '../handlers/buttonHandler.js';
import MenuHandler from '../handlers/menuHandler.js';
import ModalHandler from '../handlers/modalHandler.js';
import EventHandler from '../handlers/eventHandler.js';
import errorHandler from '../handlers/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Cores para o console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    red: '\x1b[31m'
};

// Função para criar uma caixa de texto estilizada
function createBox(title, content) {
    const lines = content.split('\n');
    const maxLength = Math.max(title.length, ...lines.map(line => line.length));
    const padding = 2;
    const totalWidth = maxLength + padding * 2;

    const top = `╔${'═'.repeat(totalWidth)}╗`;
    const titleLine = `║${' '.repeat(padding)}${title}${' '.repeat(totalWidth - title.length - padding)}║`;
    const separator = `╠${'═'.repeat(totalWidth)}╣`;
    const bottom = `╚${'═'.repeat(totalWidth)}╝`;

    const contentLines = lines.map(line => 
        `║${' '.repeat(padding)}${line}${' '.repeat(totalWidth - line.length - padding)}║`
    );

    return [top, titleLine, separator, ...contentLines, bottom].join('\n');
}

// Verifica variáveis de ambiente
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const ownerId = process.env.OWNER_ID;
const isDev = process.env.NODE_ENV === 'development';

if (!token || !clientId || !ownerId) {
    console.error(`${colors.red}❌ Erro: Variáveis de ambiente não configuradas${colors.reset}`);
    console.log('Verifique se você configurou corretamente o arquivo .env com:');
    console.log('- TOKEN');
    console.log('- CLIENT_ID');
    console.log('- OWNER_ID');
    process.exit(1);
}

console.clear();
console.log(`${colors.bright}${colors.cyan}${createBox('Bot Initialization', 'Starting bot services...')}${colors.reset}\n`);

// Configuração do cliente
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// Inicialização dos handlers
const commandHandler = new CommandHandler(client);
const buttonHandler = new ButtonHandler(client);
const menuHandler = new MenuHandler(client);
const modalHandler = new ModalHandler(client);
const eventHandler = new EventHandler(client);

// Carrega os handlers
async function initializeHandlers() {
    try {
        console.log('🔄 Iniciando carregamento dos handlers...\n');

        console.log('📦 Carregando eventos...');
        await eventHandler.loadEvents();

        console.log('\n📦 Carregando comandos...');
        await commandHandler.loadCommands();
        
        console.log('\n📦 Carregando botões...');
        await buttonHandler.loadButtons();
        
        console.log('\n📦 Carregando menus...');
        await menuHandler.loadMenus();
        
        console.log('\n📦 Carregando modais...');
        await modalHandler.loadModals();
        
        console.log('\n🛡️ Configurando handler de erros...');
        errorHandler(client);

        console.log('\n✅ Todos os handlers foram carregados com sucesso!\n');
    } catch (error) {
        console.error('❌ Erro fatal ao carregar handlers:', error);
        process.exit(1);
    }
}

// Evento ready
client.once('ready', async () => {
    try {
        console.log(`\n🤖 Bot iniciado como ${client.user.tag}`);
        
        // Carregar handlers
        await initializeHandlers();

        // Coletar estatísticas
        const guilds = client.guilds.cache.size;
        const users = client.users.cache.size;
        const channels = client.channels.cache.size;

        console.log(`\n📊 Estatísticas do Bot:`);
        console.log(`├─ Servidores: ${guilds}`);
        console.log(`├─ Usuários: ${users}`);
        console.log(`└─ Canais: ${channels}`);

        // Definir status do bot
        client.user.setPresence({
            activities: [{ 
                name: `${guilds} servidores | /help`, 
                type: ActivityType.Watching 
            }],
            status: 'online'
        });

        console.log('\n🎉 Bot está pronto para uso!');
    } catch (error) {
        console.error('❌ Erro no evento ready:', error);
        process.exit(1);
    }
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    process.exit(1);
});

// Login do bot
console.log('🔑 Iniciando login do bot...');
client.login(token).catch(error => {
    console.error('❌ Erro ao fazer login:', error);
    process.exit(1);
});