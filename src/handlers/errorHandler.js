import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { EmbedBuilder } from 'discord.js';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Winston
const logger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new DailyRotateFile({
            filename: path.join(__dirname, '..', 'logs', 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});

export default (client) => {
    // Handler de erros não tratados
    process.on('unhandledRejection', async (error) => {
        // Log do erro usando Winston
        logger.error('Erro não tratado:', {
            error: error.stack || error.message,
            timestamp: new Date().toISOString()
        });

        // Se configurado, envia erro para canal de logs
        if (process.env.ERROR_CHANNEL_ID) {
            try {
                const errorChannel = await client.channels.fetch(process.env.ERROR_CHANNEL_ID);
                if (errorChannel) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Erro Detectado')
                        .setDescription('```js\n' + (error.stack || error.message).slice(0, 4000) + '```')
                        .setTimestamp();

                    await errorChannel.send({ embeds: [errorEmbed] }).catch(console.error);
                }
            } catch (err) {
                logger.error('Erro ao enviar log de erro:', {
                    error: err.stack || err.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
    });

    // Handler de exceções não tratadas
    process.on('uncaughtException', (error) => {
        // Log do erro usando Winston
        logger.error('Exceção não tratada:', {
            error: error.stack || error.message,
            timestamp: new Date().toISOString()
        });

        // Em caso de exceção não tratada, tenta reiniciar o bot graciosamente
        try {
            client.destroy();
            setTimeout(() => {
                client.login(process.env.TOKEN).catch(err => {
                    logger.error('Erro ao reiniciar bot:', {
                        error: err.stack || err.message,
                        timestamp: new Date().toISOString()
                    });
                    process.exit(1);
                });
            }, 5000);
        } catch (err) {
            logger.error('Erro fatal ao tentar reiniciar:', {
                error: err.stack || err.message,
                timestamp: new Date().toISOString()
            });
            process.exit(1);
        }
    });

    // Handler de avisos do processo
    process.on('warning', (warning) => {
        console.warn('Aviso:', warning);
    });
};
