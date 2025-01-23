import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { EmbedBuilder, PermissionsBitField  } from 'discord.js';;
import JsonDatabase from './jsonDatabase.js';;
import path from 'path';;

const db = new JsonDatabase(path.join(__dirname, '../database/protection.json'));

// Função para verificar e executar bloqueios/desbloqueios
async function checkChannelSchedules(client) {
    const protection = await db.read();
    if (!protection.channelLock.schedules) return;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (const schedule of protection.channelLock.schedules) {
        const channel = await client.channels.fetch(schedule.channelId).catch(() => null);
        if (!channel) continue;

        if (currentTime === schedule.lockTime) {
            // Bloquear canal
            try {
                await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                    SendMessages: false
                });

                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🔒 Canal Bloqueado')
                    .setDescription('Este canal foi bloqueado automaticamente.')
                    .addFields(
                        { name: 'Horário de Bloqueio', value: schedule.lockTime },
                        { name: 'Horário de Liberação', value: schedule.unlockTime }
                    )
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (error) {
                console.error(`Erro ao bloquear canal ${channel.name}:`, error);
            }
        }

        if (currentTime === schedule.unlockTime) {
            // Desbloquear canal
            try {
                await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                    SendMessages: null
                });

                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🔓 Canal Desbloqueado')
                    .setDescription('Este canal foi desbloqueado automaticamente.')
                    .addFields(
                        { name: 'Próximo Bloqueio', value: schedule.lockTime }
                    )
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (error) {
                console.error(`Erro ao desbloquear canal ${channel.name}:`, error);
            }
        }
    }
}

export default { checkChannelSchedules };
