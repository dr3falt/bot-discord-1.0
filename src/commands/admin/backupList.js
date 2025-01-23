import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { SlashCommandBuilder, EmbedBuilder  } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { createGunzip  } from 'zlib';
import { pipeline  } from 'stream/promises';
import { Readable  } from 'stream';

async function validateAndListBackups(backupDir) {
    const files = await fs.promises.readdir(backupDir);
    const backupInfo = [];
    const corruptedFiles = [];

    for (const file of files) {
        if (!file.endsWith('.json.gz')) continue;

        const filePath = path.join(backupDir, file);
        try {
            const fileContents = await fs.promises.readFile(filePath);
            const chunks = [];
            const gunzip = createGunzip();
            
            await pipeline(
                Readable.from(fileContents),
                gunzip,
                async function*(source) {
                    for await (const chunk of source) {
                        chunks.push(chunk);
                    }
                }
            );

            // Parse the JSON data
            const backupData = JSON.parse(Buffer.concat(chunks).toString());
            const stats = await fs.promises.stat(filePath);
            
            backupInfo.push({
                id: backupData.id || file.replace(/^backup_|\.json\.gz$/g, ''),
                name: backupData.name || 'Backup sem nome',
                createdAt: backupData.createdAt || stats.mtime.getTime(),
                createdBy: backupData.createdBy || 'Desconhecido',
                size: (stats.size / 1024).toFixed(2) + ' KB'
            });
        } catch (error) {
            console.error(`Erro ao processar backup ${file}:`, error);
            corruptedFiles.push(filePath);
            try {
                // Delete corrupted file
                await fs.promises.unlink(filePath);
                console.log(`Arquivo corrompido deletado: ${file}`);
            } catch (deleteError) {
                console.error(`Erro ao deletar arquivo corrompido ${file}:`, deleteError);
            }
        }
    }

    return { backupInfo, corruptedFiles };
}

export default {
    data: new SlashCommandBuilder()
        .setName('backup-list')
        .setDescription('Lista todos os backups disponíveis'),
        
    async execute(interaction) {
        const backupDir = path.join(__dirname, '../../database/backups');

        try {
            const { backupInfo, corruptedFiles } = await validateAndListBackups(backupDir);
            
            if (backupInfo.length === 0) {
                const message = corruptedFiles.length > 0
                    ? `Nenhum backup válido encontrado. ${corruptedFiles.length} arquivo${corruptedFiles.length > 1 ? 's' : ''} corrompido${corruptedFiles.length > 1 ? 's foram removidos' : ' foi removido'}.`
                    : 'Nenhum backup encontrado.';
                    
                await interaction.reply({ content: message, ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📋 Lista de Backups')
                .setDescription(
                    backupInfo.map(backup => (
                        `**ID:** \`${backup.id}\`\n` +
                        `📁 Nome: ${backup.name}\n` +
                        `👤 Criado por: ${backup.createdBy === 'Desconhecido' ? backup.createdBy : `<@${backup.createdBy}>`}\n` +
                        `📅 Data: <t:${Math.floor(backup.createdAt / 1000)}:F>\n` +
                        `📊 Tamanho: ${backup.size}\n`
                    )).join('\n\n') +
                    (corruptedFiles.length > 0 
                        ? `\n\n🗑️ ${corruptedFiles.length} backup${corruptedFiles.length > 1 ? 's' : ''} corrompido${corruptedFiles.length > 1 ? 's foram removidos' : ' foi removido'}.`
                        : '')
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao executar comando backup-list:', error);
            await interaction.reply({ 
                content: 'Ocorreu um erro ao listar os backups. Por favor, tente novamente.', 
                ephemeral: true 
            });
        }
    }
};
