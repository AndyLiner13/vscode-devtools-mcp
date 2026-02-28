/**
 * Multi-project fixture — app/models.
 *
 * App-specific models that extend shared types.
 */
import { Entity, Priority } from '../../shared/src/types';

export interface Task extends Entity {
	title: string;
	priority: Priority;
	completed: boolean;
}

export class TaskService {
	private tasks: Map<string, Task> = new Map();

	add(task: Task): void {
		this.tasks.set(task.id, task);
	}

	findById(id: string): Task | undefined {
		return this.tasks.get(id);
	}

	complete(id: string): void {
		const task = this.findById(id);
		if (task) {
			task.completed = true;
		}
	}
}
