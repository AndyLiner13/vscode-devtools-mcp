// File with intentional syntax errors
// Tests graceful error handling - parser should not crash

const validVar = 42;

// Missing closing brace - syntax error
function broken( {
	return 1;
}

// Extra tokens
const anotherValid = 'hello';

// Unclosed string
const unclosed = "this is not closed

export const stillExport = true;
