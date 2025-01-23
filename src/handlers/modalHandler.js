import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import { Collection } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ModalHandler {
    constructor(client) {
        this.client = client;
        this.modals = new Collection();
    }

    async loadModals() {
        try {
            console.log('📂 Iniciando carregamento de modais...');
            
            const modalsPath = path.join(__dirname, '..', 'modals');
            
            // Verifica se o diretório existe
            if (!fs.existsSync(modalsPath)) {
                console.warn('⚠️ Diretório de modais não encontrado. Criando...');
                fs.mkdirSync(modalsPath, { recursive: true });
                return;
            }

            // Carrega os modais
            const modalFiles = fs.readdirSync(modalsPath).filter(file => file.endsWith('.js'));
            let totalModals = modalFiles.length;
            let loadedModals = 0;

            for (const file of modalFiles) {
                try {
                    const filePath = path.join(modalsPath, file);
                    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
                    
                    // Limpa o cache do módulo antes de importar
                    delete require.cache[require.resolve(filePath)];
                    
                    const modal = await import(fileUrl);

                    if (!modal.default) {
                        console.error(`❌ Modal inválido em ${file}: Falta exportação padrão`);
                        continue;
                    }

                    if (!modal.default.id || !modal.default.execute) {
                        console.error(`❌ Modal inválido em ${file}: Faltam propriedades obrigatórias`);
                        continue;
                    }

                    this.modals.set(modal.default.id, modal.default);
                    loadedModals++;
                    console.log(`✅ Modal carregado: ${modal.default.id}`);
                } catch (error) {
                    console.error(`❌ Erro ao carregar modal ${file}:`, error);
                }
            }

            // Configurar evento de interação
            this.client.on('interactionCreate', async interaction => {
                if (!interaction.isModalSubmit()) return;

                const modal = this.modals.get(interaction.customId);
                if (!modal) {
                    console.warn(`⚠️ Modal não encontrado: ${interaction.customId}`);
                    return;
                }

                try {
                    await modal.execute(interaction);
                } catch (error) {
                    console.error(`❌ Erro ao processar modal ${interaction.customId}:`, error);
                    const errorMessage = {
                        content: 'Ocorreu um erro ao processar este formulário.',
                        ephemeral: true
                    };

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                }
            });

            console.log(`\n📊 Resumo do carregamento de modais:`);
            console.log(`✨ Total de modais: ${totalModals}`);
            console.log(`✅ Modais carregados: ${loadedModals}`);
            console.log(`❌ Modais com erro: ${totalModals - loadedModals}\n`);

        } catch (error) {
            console.error('❌ Erro fatal ao carregar modais:', error);
            throw error;
        }
    }
}

export default ModalHandler;
