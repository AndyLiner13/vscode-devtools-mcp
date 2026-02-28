/**
 * Multi-project fixture — app/main.
 *
 * Consumes both shared and app-local code, demonstrating cross-project references.
 */
import { validateEntity, formatId, Priority } from '../../shared/src';
import { Task, TaskService } from './models';

export function processTask(id: string): string {
	const svc = new TaskService();
	const task: Task = {
		id,
		createdAt: new Date(),
		title: 'Test Task',
		priority: Priority.High,
		completed: false,
	};

	if (validateEntity(task)) {
		svc.add(task);
		return formatId(id);
	}

	return 'invalid';
}
