import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { EmbedBuilder } from 'discord.js';
import JsonDatabase from './jsonDatabase.js';
import winston from 'winston';
import 'winston-daily-rotate-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new JsonDatabase(path.join(__dirname, '../database/config.json'));

// Configuração do Winston Logger
export function createLogger(label) {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.label({ label }),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json()
        ),
        defaultMeta: { service: 'bot-vendas' },
        transports: [
            // Rotação diária de arquivos de log
            new winston.transports.DailyRotateFile({
                filename: path.join(__dirname, '../logs/error-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                level: 'error',
                maxSize: '20m',
                maxFiles: '14d'
            }),
            new winston.transports.DailyRotateFile({
                filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d'
            })
        ]
    });
}

const logger = createLogger('logger');

// Adiciona log no console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

export async function sendLog(client, {
    title,
    description,
    color = 0x0099ff,
    fields = [],
    footer = null,
    level = 'info'
}) {
    try {
        // Log no Winston
        logger.log(level, description, {
            title,
            fields: fields.map(f => `${f.name}: ${f.value}`).join(', ')
        });

        // Log no Discord
        const config = await db.read();
        if (!config?.logChannelId) return;

        const channel = await client.channels.fetch(config.logChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        if (footer) {
            embed.setFooter(footer);
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error('Erro ao enviar log:', error);
        console.error('Erro ao enviar log:', error);
    }
}

// Funções auxiliares de logging
export const logError = (message, error) => {
    logger.error(message, { error: error.stack });
};

export const logInfo = (message, meta = {}) => {
    logger.info(message, meta);
};

export const logWarn = (message, meta = {}) => {
    logger.warn(message, meta);
};

export const logDebug = (message, meta = {}) => {
    logger.debug(message, meta);
};

export default { 
    sendLog,
    logError,
    logInfo,
    logWarn,
    logDebug
};
