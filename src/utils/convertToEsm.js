import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function convertFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Substitui require por import
        content = content.replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g, 
            'import $1 from \'$2\'');
        
        // Substitui module.exports por export default
        content = content.replace(/module\.exports\s*=/, 'export default');
        
        // Substitui exports. por export const
        content = content.replace(/exports\.(\w+)\s*=/, 'export const $1 =');
        
        // Adiciona .js nas importações locais que não têm extensão e não são node_modules
        content = content.replace(/from\s+['"](\.[^'"]+)['"](?!\.[a-zA-Z]+['"])/g, (match, p1) => {
            // Se já termina com .js, não adiciona
            if (p1.endsWith('.js')) {
                return match;
            }
            return `from '${p1}.js'`;
        });

        // Remove .js.js duplicado se existir
        content = content.replace(/\.js\.js/g, '.js');
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Convertido: ${filePath}`);
    } catch (error) {
        console.error(`❌ Erro ao converter ${filePath}:`, error);
    }
}

async function processDirectory(directory) {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            await processDirectory(fullPath);
        } else if (item.endsWith('.js')) {
            await convertFile(fullPath);
        }
    }
}

// Converte todos os arquivos na pasta commands
const commandsPath = path.join(__dirname, '..', 'commands');
console.log('🔄 Iniciando conversão de arquivos para ES modules...');
await processDirectory(commandsPath);
console.log('✨ Conversão concluída!');
