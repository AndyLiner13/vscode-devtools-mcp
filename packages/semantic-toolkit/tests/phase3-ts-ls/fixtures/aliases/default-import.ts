/**
 * Alias fixture — default import with consumer-chosen name.
 *
 * Tests: import Foo from './module' where Foo is chosen by the consumer.
 */
import makeDefault from './core';

export function getDefaultWidget() {
	return makeDefault();
}
