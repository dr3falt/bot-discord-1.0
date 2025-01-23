import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { checkPermissions } from '../../utils/checkPermissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Gerencia cargos do servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adiciona um cargo a um usuário')
                .addUserOption(option =>
                    option.setName('usuário')
                        .setDescription('O usuário para adicionar o cargo')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('O cargo para adicionar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove um cargo de um usuário')
                .addUserOption(option =>
                    option.setName('usuário')
                        .setDescription('O usuário para remover o cargo')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('O cargo para remover')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Cria um novo cargo')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome do cargo')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('cor')
                        .setDescription('Cor do cargo (hex: #FF0000)')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('separado')
                        .setDescription('Mostrar separadamente na lista de membros')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Deleta um cargo')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('O cargo para deletar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Mostra informações de um cargo')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('O cargo para ver informações')
                        .setRequired(true))),

    async execute(interaction) {
        if (!(await checkPermissions(interaction.user.id, interaction.guild.id, 'admin'))) {
            return await interaction.reply({
                content: 'Você precisa ser um administrador para usar este comando.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'add') {
                const user = interaction.options.getUser('usuário');
                const role = interaction.options.getRole('cargo');
                const member = await interaction.guild.members.fetch(user.id);

                await member.roles.add(role);
                
                const embed = new EmbedBuilder()
                    .setColor(role.color)
                    .setTitle('✅ Cargo Adicionado')
                    .setDescription(`Cargo ${role} adicionado a ${user}`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            else if (subcommand === 'remove') {
                const user = interaction.options.getUser('usuário');
                const role = interaction.options.getRole('cargo');
                const member = await interaction.guild.members.fetch(user.id);

                await member.roles.remove(role);
                
                const embed = new EmbedBuilder()
                    .setColor(role.color)
                    .setTitle('✅ Cargo Removido')
                    .setDescription(`Cargo ${role} removido de ${user}`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            else if (subcommand === 'create') {
                const name = interaction.options.getString('nome');
                const color = interaction.options.getString('cor');
                const hoist = interaction.options.getBoolean('separado');

                const role = await interaction.guild.roles.create({
                    name: name,
                    color: color,
                    hoist: hoist,
                    reason: `Criado por ${interaction.user.tag}`
                });

                const embed = new EmbedBuilder()
                    .setColor(role.color)
                    .setTitle('✅ Cargo Criado')
                    .setDescription(`Cargo ${role} criado com sucesso!`)
                    .addFields(
                        { name: 'Nome', value: name, inline: true },
                        { name: 'Cor', value: color, inline: true },
                        { name: 'Separado', value: hoist ? 'Sim' : 'Não', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            else if (subcommand === 'delete') {
                const role = interaction.options.getRole('cargo');
                
                await role.delete(`Deletado por ${interaction.user.tag}`);
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('✅ Cargo Deletado')
                    .setDescription(`O cargo \`${role.name}\` foi deletado com sucesso!`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            else if (subcommand === 'info') {
                const role = interaction.options.getRole('cargo');
                
                const permissions = role.permissions.toArray().map(perm => {
                    return perm.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
                }).join(', ');

                const embed = new EmbedBuilder()
                    .setColor(role.color)
                    .setTitle(`ℹ️ Informações do Cargo: ${role.name}`)
                    .addFields(
                        { name: 'ID', value: role.id, inline: true },
                        { name: 'Cor', value: role.hexColor, inline: true },
                        { name: 'Posição', value: role.position.toString(), inline: true },
                        { name: 'Mencionável', value: role.mentionable ? 'Sim' : 'Não', inline: true },
                        { name: 'Separado', value: role.hoist ? 'Sim' : 'Não', inline: true },
                        { name: 'Criado em', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: true },
                        { name: 'Membros', value: role.members.size.toString(), inline: true },
                        { name: 'Permissões', value: permissions || 'Nenhuma' }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Erro ao executar comando role:', error);
            await interaction.reply({
                content: 'Houve um erro ao executar o comando. Verifique as permissões do bot.',
                ephemeral: true
            });
        }
    },
};
