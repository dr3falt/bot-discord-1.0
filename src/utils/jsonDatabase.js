import { promises as fs } from 'fs';
import path from 'path';

export class JsonDatabase {
    constructor(filePath) {
        this.filePath = filePath;
    }

    async read() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Se o arquivo não existir, retorna um objeto vazio
                return {};
            }
            throw error;
        }
    }

    async write(data) {
        // Garante que o diretório existe
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 4));
    }

    async update(newData) {
        const data = await this.read();
        Object.assign(data, newData);
        await this.write(data);
        return data;
    }
}

export default JsonDatabase;
