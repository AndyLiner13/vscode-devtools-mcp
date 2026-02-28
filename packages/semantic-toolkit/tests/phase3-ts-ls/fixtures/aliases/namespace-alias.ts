/**
 * Alias fixture — namespace alias (import = syntax).
 *
 * Tests: import Foo = Namespace.Bar pattern.
 */

namespace WidgetNS {
	export class SpecialWidget {
		id = 'special';
		label = 'Special';
	}

	export function create(): SpecialWidget {
		return new SpecialWidget();
	}
}

import SW = WidgetNS.SpecialWidget;

export function makeSpecial(): SW {
	return new SW();
}
