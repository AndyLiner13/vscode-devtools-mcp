// Cross-file consumer — imports named functions from main.ts
// and passes them as callbacks in a different file.

import { double, isEven, logError, parseJSON, retry, debounce, onResult } from './main';

// Array method usage in a different file
const data = [10, 20, 30];
const transformed = data.map(double);
const filtered = data.filter(isEven);

// Custom HOF usage cross-file
retry(double as unknown as () => void, 5);
debounce(logError as unknown as (...args: unknown[]) => void, 100);

// Multiple callback parameters
function handleSuccess(msg: string): void { console.log(msg); }
function handleError(err: Error): void { console.error(err); }

onResult(handleSuccess, handleError);

// Promise chain cross-file
declare function loadConfig(): Promise<string>;
loadConfig().then(parseJSON).catch(logError);
