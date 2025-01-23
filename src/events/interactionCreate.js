import { Events, InteractionType, ComponentType } from 'discord.js';
import historyManager from '../utils/HistoryManager.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Comandos Slash
            if (interaction.type === InteractionType.ApplicationCommand) {
                const commands = interaction.client.commands;
                if (!commands) {
                    console.error('Collection de comandos não encontrada no cliente.');
                    return;
                }

                const command = commands.get(interaction.commandName);
                if (!command) {
                    console.error(`Comando ${interaction.commandName} não encontrado.`);
                    await interaction.reply({
                        content: 'Este comando não está disponível no momento.',
                        flags: ['Ephemeral']
                    });
                    return;
                }

                try {
                    // Registra o comando no histórico
                    const options = {};
                    if (interaction.options) {
                        interaction.options.data.forEach(opt => {
                            options[opt.name] = opt.value;
                        });
                    }

                    await historyManager.logCommand(
                        interaction.guildId,
                        interaction.user.id,
                        interaction.commandName,
                        options
                    ).catch(error => {
                        console.error('Erro ao registrar comando no histórico:', error);
                    });

                    // Executa o comando
                    await command.execute(interaction);
                } catch (error) {
                    console.error(`Erro ao executar o comando ${interaction.commandName}:`, error);
                    const errorResponse = {
                        content: 'Ocorreu um erro ao executar este comando.',
                        flags: ['Ephemeral']
                    };

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply(errorResponse);
                    } else {
                        await interaction.followUp(errorResponse);
                    }
                }
                return;
            }

            // Botões
            if (interaction.type === InteractionType.MessageComponent && 
                interaction.componentType === ComponentType.Button) {
                try {
                    await historyManager.logInteraction(
                        interaction.guildId,
                        interaction.user.id,
                        'button',
                        {
                            customId: interaction.customId,
                            message: interaction.message?.content || 'No content'
                        }
                    ).catch(error => {
                        console.error('Erro ao registrar interação de botão:', error);
                    });

                    // Verificação especial para o botão de verificação
                    if (interaction.customId === 'verify_button') {
                        const verificationHandler = await import('../handlers/verificationHandler.js');
                        await verificationHandler.default.handleVerifyButton(interaction);
                        return;
                    }

                    // Outros botões
                    const [commandName] = interaction.customId.split('-');
                    const command = interaction.client.commands?.get(commandName);
                    if (command?.handleButton) {
                        await command.handleButton(interaction);
                    }
                } catch (error) {
                    console.error('Erro ao processar interação de botão:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Ocorreu um erro ao processar esta interação.',
                            flags: ['Ephemeral']
                        });
                    }
                }
                return;
            }

            // Menus Select
            if (interaction.type === InteractionType.MessageComponent && 
                interaction.componentType === ComponentType.StringSelect) {
                try {
                    await historyManager.logInteraction(
                        interaction.guildId,
                        interaction.user.id,
                        'select_menu',
                        {
                            customId: interaction.customId,
                            values: interaction.values
                        }
                    ).catch(error => {
                        console.error('Erro ao registrar interação de menu:', error);
                    });

                    const [commandName] = interaction.customId.split('-');
                    const command = interaction.client.commands?.get(commandName);
                    if (command?.handleSelectMenu) {
                        await command.handleSelectMenu(interaction);
                    }
                } catch (error) {
                    console.error('Erro ao processar interação de menu:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Ocorreu um erro ao processar esta interação.',
                            flags: ['Ephemeral']
                        });
                    }
                }
                return;
            }

            // Modais
            if (interaction.type === InteractionType.ModalSubmit) {
                try {
                    const fields = {};
                    interaction.fields.fields.forEach(field => {
                        fields[field.customId] = field.value;
                    });

                    await historyManager.logInteraction(
                        interaction.guildId,
                        interaction.user.id,
                        'modal',
                        {
                            customId: interaction.customId,
                            fields
                        }
                    ).catch(error => {
                        console.error('Erro ao registrar interação de modal:', error);
                    });

                    const [commandName] = interaction.customId.split('-');
                    const command = interaction.client.commands?.get(commandName);
                    if (command?.handleModalSubmit) {
                        await command.handleModalSubmit(interaction);
                    }
                } catch (error) {
                    console.error('Erro ao processar interação de modal:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Ocorreu um erro ao processar esta interação.',
                            flags: ['Ephemeral']
                        });
                    }
                }
                return;
            }

        } catch (error) {
            console.error('Erro ao processar interação:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Ocorreu um erro ao processar esta interação.',
                        flags: ['Ephemeral']
                    });
                }
            } catch (replyError) {
                console.error('Erro ao enviar mensagem de erro:', replyError);
            }
        }
    }
};
