import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { JsonDatabase } from './jsonDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new JsonDatabase(path.join(__dirname, '../database/permissions.json'));

/**
 * Verifica as permissões de um usuário
 * @param {string} userId - ID do usuário
 * @param {string} guildId - ID do servidor
 * @param {string} requiredLevel - Nível de permissão necessário (owner, admin, mod, helper)
 * @param {Object} member - Objeto do membro do Discord (opcional)
 * @returns {Promise<boolean>}
 */
export async function checkPermissions(userId, guildId, requiredLevel = 'mod', member = null) {
    try {
        const perms = await db.read() || {};
        const guildPerms = perms[guildId] || {};

        // Verifica se é owner do bot
        if (process.env.OWNER_ID === userId) return true;

        // Verifica permissões do usuário
        const userPerms = guildPerms.users?.[userId];
        if (userPerms) {
            switch (requiredLevel.toLowerCase()) {
                case 'owner': return userPerms === 'owner';
                case 'admin': return ['owner', 'admin'].includes(userPerms);
                case 'mod': return ['owner', 'admin', 'mod'].includes(userPerms);
                case 'helper': return ['owner', 'admin', 'mod', 'helper'].includes(userPerms);
                default: return false;
            }
        }

        // Se o membro foi fornecido, verifica permissões de cargo
        if (member) {
            const rolePerms = guildPerms.roles || {};
            for (const roleId of member.roles.cache.keys()) {
                const roleLevel = rolePerms[roleId];
                if (roleLevel) {
                    switch (requiredLevel.toLowerCase()) {
                        case 'owner': return roleLevel === 'owner';
                        case 'admin': return ['owner', 'admin'].includes(roleLevel);
                        case 'mod': return ['owner', 'admin', 'mod'].includes(roleLevel);
                        case 'helper': return ['owner', 'admin', 'mod', 'helper'].includes(roleLevel);
                        default: return false;
                    }
                }
            }
        }

        return false;
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        return false;
    }
}

/**
 * Define as permissões de um usuário ou cargo
 * @param {string} guildId - ID do servidor
 * @param {string} targetId - ID do usuário ou cargo
 * @param {string} level - Nível de permissão (admin, mod, helper)
 * @param {boolean} isRole - Se o targetId é um cargo
 * @returns {Promise<boolean>}
 */
export async function setPermission(guildId, targetId, level, isRole = false) {
    try {
        const perms = await db.read() || {};
        if (!perms[guildId]) perms[guildId] = { users: {}, roles: {} };

        const target = isRole ? 'roles' : 'users';
        perms[guildId][target][targetId] = level;

        await db.write(perms);
        return true;
    } catch (error) {
        console.error('Erro ao definir permissões:', error);
        return false;
    }
}

/**
 * Remove as permissões de um usuário ou cargo
 * @param {string} guildId - ID do servidor
 * @param {string} targetId - ID do usuário ou cargo
 * @param {boolean} isRole - Se o targetId é um cargo
 * @returns {Promise<boolean>}
 */
export async function removePermission(guildId, targetId, isRole = false) {
    try {
        const perms = await db.read() || {};
        if (!perms[guildId]) return true;

        const target = isRole ? 'roles' : 'users';
        if (perms[guildId][target]?.[targetId]) {
            delete perms[guildId][target][targetId];
            await db.write(perms);
        }
        return true;
    } catch (error) {
        console.error('Erro ao remover permissões:', error);
        return false;
    }
}

export default {
    checkPermissions,
    setPermission,
    removePermission
};
