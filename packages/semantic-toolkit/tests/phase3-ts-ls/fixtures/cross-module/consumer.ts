/**
 * Cross-module fixture — consumer.
 *
 * Imports everything through the top-level barrel (index.ts),
 * which itself re-exports from sub-barrel.ts, which re-exports
 * from types.ts and user.ts. This tests multi-level barrel resolution.
 */
import {
	UserService,
	createDefaultUser,
	createUser,
	Status,
	configNs,
} from './index';
import type { EntityId, IEntity } from './index';

export function processUser(id: EntityId): IEntity | undefined {
	const config = configNs.Config.defaults();
	console.log(`Processing on ${config.host}:${config.port}`);

	const svc = new UserService();
	const defaultUser = createDefaultUser('test');
	svc.save(defaultUser);

	const created = createUser('admin', 'admin@example.com');
	svc.save(created);

	svc.activate(id);
	return svc.findById(id);
}

export function bulkCreate(names: string[]): void {
	const svc = new UserService();
	for (const name of names) {
		const user = createDefaultUser(name);
		user.status = Status.Inactive;
		svc.save(user);
	}
}
