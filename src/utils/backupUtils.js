import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs/promises';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '../database/backups');

export async function ensureBackupDirExists() {
    try {
        await fs.access(BACKUP_DIR);
    } catch {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
    }
}

export function generateBackupId() {
    return `backup_${Date.now()}`;
}

export async function createBackup(guildId, data) {
    await ensureBackupDirExists();
    const backupId = generateBackupId();
    const backupPath = path.join(BACKUP_DIR, `${backupId}.json.gz`);
    
    const jsonData = JSON.stringify(data, null, 2);
    const gzip = createGzip();
    const output = createWriteStream(backupPath);
    
    await pipeline(
        Buffer.from(jsonData),
        gzip,
        output
    );
    
    return backupId;
}

export async function loadBackup(backupId) {
    const backupPath = path.join(BACKUP_DIR, `${backupId}.json.gz`);
    const gunzip = createGunzip();
    const input = createReadStream(backupPath);
    
    let data = '';
    for await (const chunk of input.pipe(gunzip)) {
        data += chunk;
    }
    
    return JSON.parse(data);
}

export async function listBackups() {
    await ensureBackupDirExists();
    const files = await fs.readdir(BACKUP_DIR);
    return files
        .filter(file => file.endsWith('.json.gz'))
        .map(file => file.replace('.json.gz', ''));
}

export async function deleteBackup(backupId) {
    const backupPath = path.join(BACKUP_DIR, `${backupId}.json.gz`);
    await fs.unlink(backupPath);
}

export default {
    ensureBackupDirExists,
    generateBackupId,
    createBackup,
    loadBackup,
    listBackups,
    deleteBackup
};
