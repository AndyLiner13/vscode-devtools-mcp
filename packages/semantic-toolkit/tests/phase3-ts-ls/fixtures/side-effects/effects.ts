// Module-level side effects test fixture (TypeScript)
// Contains examples of all 5 side-effect kinds.

// =====================================================================
// 1. Side-effect imports (no bindings)
// =====================================================================
import './polyfill';
import './setup';

// Normal import (NOT a side effect — has bindings)
import { readFileSync } from 'fs';

// =====================================================================
// 2. Top-level function calls
// =====================================================================
console.log('Module loading');
console.warn('Debug mode enabled');

// Chained method call
process.stdout.write('Starting...\n');

// =====================================================================
// 3. IIFE (Immediately Invoked Function Expressions)
// =====================================================================

// Classic IIFE
(function () {
	const x = 42;
})();

// Arrow IIFE
(() => {
	const y = 100;
})();

// =====================================================================
// 4. Top-level assignments
// =====================================================================
process.env.NODE_ENV = 'production';
process.env.DEBUG = 'true';

// =====================================================================
// 5. Top-level await (ESM)
// =====================================================================
const config = await fetch('/api/config');
await new Promise<void>(resolve => setTimeout(resolve, 100));

// =====================================================================
// 6. Conditional side effects (inside if/try)
// =====================================================================
if (process.env.NODE_ENV === 'development') {
	console.log('Development mode');
}

try {
	console.log('Trying something');
} catch (e) {
	console.error('Failed');
}

// =====================================================================
// 7. For/while loops at top level
// =====================================================================
for (const item of [1, 2, 3]) {
	console.log(item);
}

// =====================================================================
// 8. Declarations that are NOT side effects
// =====================================================================
function helperFunction() {
	return 42;
}

class MyClass {
	value = 1;
}

interface MyInterface {
	id: number;
}

type MyType = string | number;

enum MyEnum {
	A = 1,
	B = 2,
}

const normalConst = 42;
let normalLet = 'hello';

// Variable with initializer call (the VariableStatement is NOT just a call)
const result = helperFunction();

// re-export
export { readFileSync };
