import { jest } from '@jest/globals';
import rateLimiter from '../utils/rateLimiter.js';

describe('Rate Limiter', () => {
    const userId = '123456789';

    beforeEach(() => {
        // Reseta todos os limites antes de cada teste
        rateLimiter.resetLimits(userId);
    });

    test('should allow requests within limits', () => {
        // Teste para comandos
        for (let i = 0; i < 5; i++) {
            expect(rateLimiter.checkLimit(userId, 'commands')).toBe(true);
        }
        // O sexto pedido deve ser negado
        expect(rateLimiter.checkLimit(userId, 'commands')).toBe(false);
    });

    test('should reset limits after duration', async () => {
        // Usa todos os pontos
        for (let i = 0; i < 5; i++) {
            rateLimiter.checkLimit(userId, 'commands');
        }
        
        // Espera o tempo de reset
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // Deve permitir novamente
        expect(rateLimiter.checkLimit(userId, 'commands')).toBe(true);
    });

    test('should handle different types separately', () => {
        // Usa todos os pontos de comandos
        for (let i = 0; i < 5; i++) {
            rateLimiter.checkLimit(userId, 'commands');
        }
        
        // Ainda deve permitir botões
        expect(rateLimiter.checkLimit(userId, 'buttons')).toBe(true);
    });

    test('should add points correctly', () => {
        // Usa alguns pontos
        rateLimiter.checkLimit(userId, 'commands');
        rateLimiter.checkLimit(userId, 'commands');
        
        // Adiciona pontos extras
        rateLimiter.addPoints(userId, 'commands', 3);
        
        // Deve permitir mais 4 pedidos (1 ponto restante + 3 adicionados)
        for (let i = 0; i < 4; i++) {
            expect(rateLimiter.checkLimit(userId, 'commands')).toBe(true);
        }
        
        // O próximo deve ser negado
        expect(rateLimiter.checkLimit(userId, 'commands')).toBe(false);
    });

    test('should reset specific type limits', () => {
        // Usa todos os pontos de comandos e botões
        for (let i = 0; i < 5; i++) {
            rateLimiter.checkLimit(userId, 'commands');
            rateLimiter.checkLimit(userId, 'buttons');
        }
        
        // Reseta apenas comandos
        rateLimiter.resetLimits(userId, 'commands');
        
        // Comandos devem funcionar
        expect(rateLimiter.checkLimit(userId, 'commands')).toBe(true);
        // Botões ainda devem estar limitados
        expect(rateLimiter.checkLimit(userId, 'buttons')).toBe(false);
    });
});
