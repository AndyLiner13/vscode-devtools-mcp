/**
 * Alias fixture — canonical declarations.
 *
 * These are the original, canonical declarations that other files alias.
 */

export interface Widget {
	id: string;
	label: string;
}

export type WidgetId = string;

export function createWidget(label: string): Widget {
	return { id: crypto.randomUUID(), label };
}

export class WidgetService {
	private widgets: Map<WidgetId, Widget> = new Map();

	add(widget: Widget): void {
		this.widgets.set(widget.id, widget);
	}

	get(id: WidgetId): Widget | undefined {
		return this.widgets.get(id);
	}
}

export default function defaultFactory(): Widget {
	return { id: 'default', label: 'Default Widget' };
}
