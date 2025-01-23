import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import { Collection } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ButtonHandler {
    constructor(client) {
        this.client = client;
        this.buttons = new Collection();
    }

    async loadButtons() {
        try {
            console.log('📂 Iniciando carregamento de botões...');
            
            const buttonsPath = path.join(__dirname, '..', 'buttons');
            
            // Verifica se o diretório existe
            if (!fs.existsSync(buttonsPath)) {
                console.warn('⚠️ Diretório de botões não encontrado. Criando...');
                fs.mkdirSync(buttonsPath, { recursive: true });
                return;
            }

            // Carrega os botões
            const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
            let totalButtons = buttonFiles.length;
            let loadedButtons = 0;

            for (const file of buttonFiles) {
                try {
                    const filePath = path.join(buttonsPath, file);
                    const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
                    
                    // Limpa o cache do módulo antes de importar
                    delete require.cache[require.resolve(filePath)];
                    
                    const button = await import(fileUrl);

                    if (!button.default) {
                        console.error(`❌ Botão inválido em ${file}: Falta exportação padrão`);
                        continue;
                    }

                    if (!button.default.customId || !button.default.execute) {
                        console.error(`❌ Botão inválido em ${file}: Faltam propriedades obrigatórias`);
                        continue;
                    }

                    this.buttons.set(button.default.customId, button.default);
                    loadedButtons++;
                    console.log(`✅ Botão carregado: ${button.default.customId}`);
                } catch (error) {
                    console.error(`❌ Erro ao carregar botão ${file}:`, error);
                }
            }

            // Configurar evento de interação
            this.client.on('interactionCreate', async interaction => {
                if (!interaction.isButton()) return;

                const button = this.buttons.get(interaction.customId);
                if (!button) {
                    console.warn(`⚠️ Botão não encontrado: ${interaction.customId}`);
                    return;
                }

                try {
                    await button.execute(interaction);
                } catch (error) {
                    console.error(`❌ Erro ao executar botão ${interaction.customId}:`, error);
                    const errorMessage = {
                        content: 'Ocorreu um erro ao processar este botão.',
                        ephemeral: true
                    };

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                }
            });

            console.log(`\n📊 Resumo do carregamento de botões:`);
            console.log(`✨ Total de botões: ${totalButtons}`);
            console.log(`✅ Botões carregados: ${loadedButtons}`);
            console.log(`❌ Botões com erro: ${totalButtons - loadedButtons}\n`);

        } catch (error) {
            console.error('❌ Erro fatal ao carregar botões:', error);
            throw error;
        }
    }

    getButton(customId) {
        return this.buttons.get(customId);
    }
}

export default ButtonHandler;
