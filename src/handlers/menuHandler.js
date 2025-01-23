import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import { Collection } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MenuHandler {
    constructor(client) {
        this.client = client;
        this.menus = new Collection();
    }

    async loadMenus() {
        try {
            console.log('📂 Iniciando carregamento de menus...');
            
            const menusPath = path.join(__dirname, '..', 'menus');
            if (!fs.existsSync(menusPath)) {
                console.warn('⚠️ Diretório de menus não encontrado. Criando...');
                fs.mkdirSync(menusPath, { recursive: true });
                return;
            }

            const menuFiles = fs.readdirSync(menusPath).filter(file => file.endsWith('.js'));
            let totalMenus = menuFiles.length;
            let loadedMenus = 0;

            for (const file of menuFiles) {
                try {
                    const filePath = path.join(menusPath, file);
                    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
                    
                    const menu = await import(fileUrl);

                    if (!menu.default) {
                        console.error(`❌ Menu inválido em ${file}: Falta exportação padrão`);
                        continue;
                    }

                    if (!menu.default.id || !menu.default.execute) {
                        console.error(`❌ Menu inválido em ${file}: Faltam propriedades obrigatórias`);
                        continue;
                    }

                    this.menus.set(menu.default.id, menu.default);
                    loadedMenus++;
                    console.log(`✅ Menu carregado: ${menu.default.id}`);
                } catch (error) {
                    console.error(`❌ Erro ao carregar menu ${file}:`, error);
                }
            }

            // Configurar evento de interação
            this.client.on('interactionCreate', async interaction => {
                if (!interaction.isStringSelectMenu()) return;

                const menu = this.menus.get(interaction.customId);
                if (!menu) {
                    console.warn(`⚠️ Menu não encontrado: ${interaction.customId}`);
                    return;
                }

                try {
                    await menu.execute(interaction);
                } catch (error) {
                    console.error(`❌ Erro ao executar menu ${interaction.customId}:`, error);
                    const errorMessage = {
                        content: 'Ocorreu um erro ao processar este menu.',
                        ephemeral: true
                    };

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                }
            });

            console.log(`\n📊 Resumo do carregamento de menus:`);
            console.log(`✨ Total de menus: ${totalMenus}`);
            console.log(`✅ Menus carregados: ${loadedMenus}`);
            console.log(`❌ Menus com erro: ${totalMenus - loadedMenus}\n`);

        } catch (error) {
            console.error('❌ Erro fatal ao carregar menus:', error);
            throw error;
        }
    }
}

export default MenuHandler;
