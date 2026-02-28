/**
 * Test fixture: snapshot/two-methods.ts
 *
 * A class with 10 methods. Two methods are targets (authenticate + refreshSession).
 * They share some imports but each also has unique deps. Verify merged snapshot
 * with both methods + union of their imports/properties.
 */

import { Logger } from './logger';
import { TokenValidator } from './token-validator';
import { SessionStore, Session } from './session-store';
import { CacheClient } from './cache';
import { RateLimiter } from './rate-limiter';

const MAX_SESSION_AGE = 86400;
const REFRESH_WINDOW = 3600;
const MAX_ATTEMPTS = 5;
const CACHE_TTL = 300;
const SESSION_PREFIX = 'sess:';

type AuthResult = { success: boolean; session?: Session; error?: string };

export class AuthService {
	private validator: TokenValidator;
	private store: SessionStore;
	private logger: Logger;
	private cache: CacheClient;
	private limiter: RateLimiter;

	constructor(
		validator: TokenValidator,
		store: SessionStore,
		logger: Logger,
		cache: CacheClient,
		limiter: RateLimiter,
	) {
		this.validator = validator;
		this.store = store;
		this.logger = logger;
		this.cache = cache;
		this.limiter = limiter;
	}

	/** TARGET 1: authenticate — uses validator, logger, store, MAX_ATTEMPTS */
	async authenticate(token: string): Promise<AuthResult> {
		this.logger.info('Authenticating token');

		if (!await this.limiter.check(token)) {
			return { success: false, error: 'Rate limited' };
		}

		let attempts = 0;
		while (attempts < MAX_ATTEMPTS) {
			const valid = await this.validator.verify(token);
			if (valid) {
				const session = await this.store.create(token);
				return { success: true, session };
			}
			attempts++;
		}

		return { success: false, error: 'Invalid token' };
	}

	/** TARGET 2: refreshSession — uses store, logger, MAX_SESSION_AGE, REFRESH_WINDOW */
	async refreshSession(sessionId: string): Promise<Session | null> {
		this.logger.info(`Refreshing session ${sessionId}`);

		const session = await this.store.get(sessionId);
		if (!session) return null;

		const age = Date.now() - session.createdAt;
		if (age > MAX_SESSION_AGE * 1000) {
			this.logger.warn('Session expired beyond max age');
			return null;
		}

		if (age < REFRESH_WINDOW * 1000) {
			return session;
		}

		return this.store.refresh(sessionId);
	}

	async invalidateSession(sessionId: string): Promise<void> {
		await this.store.delete(sessionId);
		await this.cache.del(`${SESSION_PREFIX}${sessionId}`);
	}

	async getSession(sessionId: string): Promise<Session | null> {
		const cached = await this.cache.get(`${SESSION_PREFIX}${sessionId}`);
		if (cached) return JSON.parse(cached) as Session;
		return this.store.get(sessionId);
	}

	async listActiveSessions(): Promise<Session[]> {
		return this.store.listActive();
	}

	async purgeExpired(): Promise<number> {
		const expired = await this.store.findExpired(MAX_SESSION_AGE);
		for (const session of expired) {
			await this.store.delete(session.id);
		}
		return expired.length;
	}

	async cacheSession(session: Session): Promise<void> {
		await this.cache.set(
			`${SESSION_PREFIX}${session.id}`,
			JSON.stringify(session),
			CACHE_TTL,
		);
	}

	async checkRateLimit(identifier: string): Promise<boolean> {
		return this.limiter.check(identifier);
	}

	getMaxSessionAge(): number {
		return MAX_SESSION_AGE;
	}

	getRefreshWindow(): number {
		return REFRESH_WINDOW;
	}
}
