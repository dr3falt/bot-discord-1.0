import { Events  } from 'discord.js';;
import VoiceManager from '../utils/voiceManager.js';;

const voiceManager = new VoiceManager();

export default {
    name: Events.VoiceStateUpdate,
    execute(oldState, newState) {
        voiceManager.handleVoiceStateUpdate(oldState, newState);
    },
};
