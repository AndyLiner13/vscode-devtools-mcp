/**
 * Lookup test fixture — auth/authentication module.
 * Provides symbols at multiple nesting levels for lookup resolution tests.
 */

export interface AuthConfig {
	secret: string;
	expiresIn: number;
}

export class TokenService {
	private config: AuthConfig;

	constructor(config: AuthConfig) {
		this.config = config;
	}

	async validateToken(token: string): Promise<boolean> {
		return token.length > 0;
	}

	generateToken(userId: string): string {
		return `${this.config.secret}-${userId}`;
	}

	static create(config: AuthConfig): TokenService {
		return new TokenService(config);
	}
}

export function createAuthMiddleware(service: TokenService): (req: unknown) => boolean {
	return (_req: unknown) => true;
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
	secret: 'test-secret',
	expiresIn: 3600,
};
