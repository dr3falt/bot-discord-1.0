import { EmbedBuilder  } from 'discord.js';;

class VoiceManager {
    constructor() {
        // Armazena informações dos membros mutados
        // { guildId: { memberId: { mutedAt: timestamp, timeout: timeoutId } } }
        this.mutedMembers = new Map();
    }

    // Inicializa o mapa para um servidor se não existir
    initGuild(guildId) {
        if (!this.mutedMembers.has(guildId)) {
            this.mutedMembers.set(guildId, new Map());
        }
    }

    // Verifica se um membro está mutado
    handleVoiceStateUpdate(oldState, newState) {
        const member = newState.member;
        const guildId = newState.guild.id;
        this.initGuild(guildId);

        // Se o membro entrou em um canal
        if (!oldState.channelId && newState.channelId) {
            console.log(`${member.user.tag} entrou no canal de voz`);
            this.checkMuteStatus(newState);
        }
        // Se o membro mudou de canal
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            console.log(`${member.user.tag} mudou de canal de voz`);
            this.checkMuteStatus(newState);
        }
        // Se o membro saiu do canal
        else if (oldState.channelId && !newState.channelId) {
            console.log(`${member.user.tag} saiu do canal de voz`);
            this.clearMemberTimeout(guildId, member.id);
        }
        // Se o membro mudou status de mute
        else if (oldState.selfMute !== newState.selfMute) {
            console.log(`${member.user.tag} ${newState.selfMute ? 'mutou' : 'desmutou'}`);
            if (newState.selfMute) {
                this.handleMemberMute(newState);
            } else {
                this.clearMemberTimeout(guildId, member.id);
            }
        }
    }

    // Verifica o status de mute quando um membro entra/muda de canal
    checkMuteStatus(state) {
        if (state.selfMute) {
            this.handleMemberMute(state);
        }
    }

    // Lida com um membro que se mutou
    handleMemberMute(state) {
        const member = state.member;
        const guildId = state.guild.id;
        const guildMap = this.mutedMembers.get(guildId);

        // Se já existe um timeout para este membro, limpa
        this.clearMemberTimeout(guildId, member.id);

        // Define novo timeout
        const timeout = setTimeout(async () => {
            try {
                // Verifica se o membro ainda está no canal e mutado
                const currentMember = await state.guild.members.fetch(member.id);
                const voiceState = currentMember.voice;

                if (voiceState.channelId && voiceState.selfMute) {
                    // Desconecta o membro
                    await currentMember.voice.disconnect();

                    // Envia mensagem de aviso
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⚠️ Kick Automático')
                        .setDescription(`${member} foi desconectado por ficar mutado por mais de 10 minutos.`)
                        .setTimestamp();

                    // Tenta enviar no canal onde o membro estava
                    const channel = state.channel;
                    if (channel) {
                        await channel.send({ embeds: [embed] });
                    }

                    // Tenta enviar DM para o membro
                    try {
                        await member.send({ 
                            content: `Você foi desconectado do canal de voz em **${state.guild.name}** por ficar mutado por mais de 10 minutos.`
                        });
                    } catch (error) {
                        console.log('Não foi possível enviar DM para o membro:', error);
                    }
                }
            } catch (error) {
                console.error('Erro ao desconectar membro:', error);
            } finally {
                // Limpa o timeout do mapa
                this.clearMemberTimeout(guildId, member.id);
            }
        }, 600000); // 10 minutos

        // Armazena o timeout
        guildMap.set(member.id, {
            mutedAt: Date.now(),
            timeout: timeout
        });
    }

    // Limpa o timeout de um membro
    clearMemberTimeout(guildId, memberId) {
        const guildMap = this.mutedMembers.get(guildId);
        if (guildMap && guildMap.has(memberId)) {
            const memberData = guildMap.get(memberId);
            clearTimeout(memberData.timeout);
            guildMap.delete(memberId);
        }
    }

    // Limpa todos os timeouts (usar quando o bot desconecta)
    clearAllTimeouts() {
        for (const [guildId, guildMap] of this.mutedMembers) {
            for (const [memberId, memberData] of guildMap) {
                clearTimeout(memberData.timeout);
            }
            guildMap.clear();
        }
        this.mutedMembers.clear();
    }
}

export default VoiceManager;
