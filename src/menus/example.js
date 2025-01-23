/**
 * @file Example Menu
 * @description Um exemplo de como criar um menu de seleção
 */

import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';

export default {
    id: 'example_menu',
    data: new StringSelectMenuBuilder()
        .setCustomId('example_menu')
        .setPlaceholder('Selecione uma opção')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Opção 1')
                .setDescription('Descrição da opção 1')
                .setValue('option1'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Opção 2')
                .setDescription('Descrição da opção 2')
                .setValue('option2')
        ),

    /**
     * Executa a ação do menu quando uma opção é selecionada
     * @param {import('discord.js').StringSelectMenuInteraction} interaction A interação do menu
     */
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const selectedValue = interaction.values[0];
            
            switch (selectedValue) {
                case 'option1':
                    await interaction.editReply('Você selecionou a Opção 1! 🎉');
                    break;
                    
                case 'option2':
                    await interaction.editReply('Você selecionou a Opção 2! 🌟');
                    break;
                    
                default:
                    await interaction.editReply('Opção não reconhecida 😕');
            }
            
        } catch (error) {
            console.error('❌ Erro no menu de exemplo:', error);
            
            // Verifica se é um erro de permissão
            if (error.code === 50013) {
                await interaction.followUp({ 
                    content: '❌ Não tenho permissão para executar esta ação.',
                    ephemeral: true 
                });
                return;
            }
            
            // Tenta enviar mensagem de erro apropriada
            try {
                const response = interaction.replied || interaction.deferred ?
                    await interaction.editReply('❌ Ocorreu um erro ao processar sua seleção.') :
                    await interaction.reply({ 
                        content: '❌ Ocorreu um erro ao processar sua seleção.',
                        ephemeral: true 
                    });
            } catch (followUpError) {
                console.error('❌ Erro ao enviar mensagem de erro:', followUpError);
            }
        }
    }
};
