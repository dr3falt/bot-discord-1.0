import { Events } from 'discord.js';
import { BotConfigManager } from '../utils/botConfigManager.js';
import { createLogger } from '../utils/logger.js';
import { RateLimiter } from '../utils/rateLimiter.js';
import { JsonDatabase } from '../utils/jsonDatabase.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constantes
const COOLDOWN_TIME = 5000; // 5 segundos de cooldown

// Initialize utilities
const configManager = new BotConfigManager();
const logger = createLogger('ReactionRoles');
const rateLimiter = new RateLimiter('reactionroles', COOLDOWN_TIME); // 5 segundos de cooldown
const reactionRolesDb = new JsonDatabase(path.join(__dirname, '../database/reactionRoles.json'));

// Cache for reaction role configurations
let reactionRolesCache = new Map();

// Enums de tipos de erro
const ERROR_MESSAGES = {
    RATE_LIMIT: 'Você atingiu o limite de requisições. Tente novamente em breve.',
    ROLE_NOT_FOUND: 'Cargo não encontrado no servidor.',
    DM_ERROR: 'Erro ao tentar enviar DM para o usuário.',
    GENERAL_ERROR: 'Ocorreu um erro ao processar a reação. Tente novamente ou contate um administrador.',
};

// Função para carregar as configurações
async function loadConfigurations() {
    try {
        const data = await reactionRolesDb.read() || {};
        reactionRolesCache.clear();
        
        for (const [messageId, config] of Object.entries(data)) {
            reactionRolesCache.set(messageId, config);
        }

        logger.info(`Carregadas ${reactionRolesCache.size} configurações de reaction roles`);
    } catch (error) {
        logger.error('Erro ao carregar configurações:', error);
    }
}

// Inicializa as configurações
loadConfigurations().catch(error => logger.error('Erro ao inicializar as configurações', error));

// Função para criar um evento estruturado
function createEvent(eventName, callback) {
    return {
        name: eventName,
        async execute(...args) {
            try {
                await callback(...args);
            } catch (error) {
                logger.error(`Erro ao executar o evento ${eventName}:`, error);
            }
        },
    };
}

// Função para obter a configuração de role para um emoji
function getRoleConfigFromEmoji(config, emoji) {
    return config.roles.find(r => {
        // Verifica se o emoji é personalizado (tem um id) ou um emoji padrão (com nome)
        if (emoji.id) {
            // Emoji personalizado, usa o ID
            return r.emoji === emoji.id;
        } else {
            // Emoji padrão (texto), usa o nome
            return r.emoji === emoji.name;
        }
    });
}

// Função para enviar uma mensagem de erro ao usuário
async function sendErrorMessage(user, message = ERROR_MESSAGES.GENERAL_ERROR) {
    try {
        await user.send(message);
    } catch (dmError) {
        logger.error('Erro ao enviar mensagem de erro:', dmError);
    }
}

// Evento para adicionar uma reação
const messageReactionAdd = createEvent(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;

    try {
        // Check rate limit
        if (rateLimiter.isLimited(user.id)) {
            logger.debug(`Rate limit atingido para ${user.tag}`);
            return;
        }

        // Fetch the reaction if it's partial
        if (reaction.partial) {
            await reaction.fetch();
        }

        // Get the configuration for this message
        const config = reactionRolesCache.get(reaction.message.id);
        if (!config) return;

        // Get the role configuration for this emoji
        const roleConfig = getRoleConfigFromEmoji(config, reaction.emoji);
        if (!roleConfig) return;

        // Get the member and role
        const member = await reaction.message.guild.members.fetch(user.id);
        const role = await reaction.message.guild.roles.fetch(roleConfig.roleId);

        if (!role) {
            logger.error(ERROR_MESSAGES.ROLE_NOT_FOUND);
            await sendErrorMessage(user, ERROR_MESSAGES.ROLE_NOT_FOUND);
            return;
        }

        // Add the role
        await member.roles.add(role);
        logger.info(`Cargo ${role.name} adicionado para ${user.tag}`);

        // Send DM if configured
        if (roleConfig.dmMessage) {
            try {
                await user.send(roleConfig.dmMessage.replace('{role}', role.name));
            } catch (error) {
                logger.warn(ERROR_MESSAGES.DM_ERROR, error);
            }
        }

    } catch (error) {
        logger.error('Erro ao processar reação de adição:', error);
        await sendErrorMessage(user);
    }
});

// Evento para remover uma reação
const messageReactionRemove = createEvent(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;

    try {
        // Check rate limit
        if (rateLimiter.isLimited(user.id)) {
            logger.debug(`Rate limit atingido para ${user.tag}`);
            return;
        }

        // Fetch the reaction if it's partial
        if (reaction.partial) {
            await reaction.fetch();
        }

        // Get the configuration for this message
        const config = reactionRolesCache.get(reaction.message.id);
        if (!config) return;

        // Get the role configuration for this emoji
        const roleConfig = getRoleConfigFromEmoji(config, reaction.emoji);
        if (!roleConfig) return;

        // Get the member and role
        const member = await reaction.message.guild.members.fetch(user.id);
        const role = await reaction.message.guild.roles.fetch(roleConfig.roleId);

        if (!role) {
            logger.error(ERROR_MESSAGES.ROLE_NOT_FOUND);
            return;
        }

        // Remove the role
        await member.roles.remove(role);
        logger.info(`Cargo ${role.name} removido de ${user.tag}`);

        // Send DM if configured
        if (roleConfig.removeDmMessage) {
            try {
                await user.send(roleConfig.removeDmMessage.replace('{role}', role.name));
            } catch (error) {
                logger.warn(ERROR_MESSAGES.DM_ERROR, error);
            }
        }

    } catch (error) {
        logger.error('Erro ao processar remoção de reação:', error);
    }
});

export default [
    messageReactionAdd,
    messageReactionRemove
];
