import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import JsonDatabase from '../utils/jsonDatabase.js';
import embedBuilder from '../utils/embedBuilder.js';
import { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class VerificationHandler {
    constructor() {
        this.configDb = new JsonDatabase(path.join(__dirname, '../database/config.json'));
        this.verifiedDb = new JsonDatabase(path.join(__dirname, '../database/verified_users.json'));
        this.initializeDatabases().catch(console.error);
    }

    async initializeDatabases() {
        const config = await this.configDb.read() || {};
        const verified = await this.verifiedDb.read() || {};
        
        if (!config.verification) {
            await this.configDb.write({ verification: {} });
        }
        if (!verified.users) {
            await this.verifiedDb.write({ users: {} });
        }
    }

    async handleVerifyButton(interaction) {
        try {
            const config = await this.configDb.read();
            const guildConfig = config.verification?.[interaction.guildId];

            if (!guildConfig?.enabled) {
                return await interaction.reply({
                    embeds: [embedBuilder.error('Erro', 'O sistema de verificação está desativado.')],
                    ephemeral: true
                });
            }

            // Verifica se o usuário já está verificado
            const verifiedUsers = await this.verifiedDb.read();
            if (verifiedUsers.users?.[interaction.guildId]?.[interaction.user.id]) {
                return await interaction.reply({
                    embeds: [embedBuilder.error('Erro', 'Você já está verificado!')],
                    ephemeral: true
                });
            }

            // Cria o modal de verificação
            const modal = new ModalBuilder()
                .setCustomId('verification_modal')
                .setTitle('Verificação do Servidor');

            // Pergunta 1
            const question1 = new TextInputBuilder()
                .setCustomId('verification_q1')
                .setLabel('Você leu as regras do servidor?')
                .setPlaceholder('Responda com "sim" ou "não"')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(3);

            // Pergunta 2
            const question2 = new TextInputBuilder()
                .setCustomId('verification_q2')
                .setLabel('Por que você quer entrar no servidor?')
                .setPlaceholder('Explique brevemente seu interesse')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000);

            // Adiciona os campos ao modal
            modal.addComponents(
                new ActionRowBuilder().addComponents(question1),
                new ActionRowBuilder().addComponents(question2)
            );

            // Mostra o modal
            await interaction.showModal(modal);

        } catch (error) {
            console.error('Erro ao processar verificação:', error);
            await interaction.reply({
                embeds: [embedBuilder.error('Erro', 'Ocorreu um erro ao processar sua verificação.')],
                ephemeral: true
            });
        }
    }

    async handleVerificationModal(interaction) {
        try {
            const config = await this.configDb.read();
            const guildConfig = config.verification?.[interaction.guildId];

            if (!guildConfig?.enabled) {
                return await interaction.reply({
                    embeds: [embedBuilder.error('Erro', 'O sistema de verificação está desativado.')],
                    ephemeral: true
                });
            }

            const answer1 = interaction.fields.getTextInputValue('verification_q1').toLowerCase();
            const answer2 = interaction.fields.getTextInputValue('verification_q2');

            // Verifica as respostas
            if (answer1 !== 'sim' || answer2.length < 10) {
                return await interaction.reply({
                    embeds: [embedBuilder.error(
                        '❌ Verificação Falhou',
                        'Suas respostas não atendem aos critérios necessários.\nPor favor, tente novamente e:\n• Confirme que leu as regras\n• Forneça uma resposta mais detalhada'
                    )],
                    ephemeral: true
                });
            }

            // Adiciona o cargo de verificado
            const role = interaction.guild.roles.cache.get(guildConfig.roleId);
            if (!role) {
                return await interaction.reply({
                    embeds: [embedBuilder.error('Erro', 'O cargo de verificação não foi encontrado.')],
                    ephemeral: true
                });
            }

            // Registra o usuário verificado
            const verifiedUsers = await this.verifiedDb.read();
            if (!verifiedUsers.users[interaction.guildId]) {
                verifiedUsers.users[interaction.guildId] = {};
            }

            verifiedUsers.users[interaction.guildId][interaction.user.id] = {
                timestamp: Date.now(),
                tokenId: Math.random().toString(36).substring(2) + Date.now().toString(36),
                answers: {
                    question1: answer1,
                    question2: answer2
                }
            };

            await this.verifiedDb.write(verifiedUsers);
            await interaction.member.roles.add(role);

            // Responde ao usuário
            const successEmbed = embedBuilder.success(
                '✅ Verificação Concluída',
                'Parabéns! Você foi verificado com sucesso e agora tem acesso ao servidor.\n\n' +
                `🔑 Seu Token de Verificação: \`${verifiedUsers.users[interaction.guildId][interaction.user.id].tokenId}\``
            );

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Erro ao processar verificação:', error);
            await interaction.reply({
                embeds: [embedBuilder.error('Erro', 'Ocorreu um erro ao processar sua verificação.')],
                ephemeral: true
            });
        }
    }
}

export default new VerificationHandler();
