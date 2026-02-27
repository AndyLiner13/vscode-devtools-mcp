import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const __filename = fileURLToPath(import.meta.url);

export async function loadConfig(path: string): Promise<string> {
	const data = await readFile(path, 'utf-8');
	return data;
}

export { readFile as read } from 'node:fs/promises';

export default __filename;
