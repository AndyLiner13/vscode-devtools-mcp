# ESLint Refactoring Blueprint

> **Generated:** After running `npm run lint:fix`
> **Status:** 254 errors, 44 warnings remaining after auto-fix

## Quick Reference

### Run Commands
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix what's possible
npm run format        # Format with Prettier
npm run knip          # Check for dead code
```

### VS Code Refactoring Shortcuts
- **F2** — Rename symbol (updates all references)
- **Ctrl+.** — Quick fixes / Code actions
- **Ctrl+Shift+R** — Refactor menu

---

## Phase 1: Quick Wins (Auto-fixable remaining)

### 1.1 Strict Equality (`!= → !==`)
**Count:** ~7 issues
**Fix:** ESLint quick fix (Ctrl+.)

```typescript
// Before
if (value != null) { ... }

// After  
if (value !== null) { ... }
```

### 1.2 require() → import
**Count:** ~3 issues
**Fix:** Convert to ES module imports

```typescript
// Before
const { something } = require('./module');

// After
import { something } from './module';
```

---

## Phase 2: Filename Renames (VS Code Refactoring)

### 2.1 Kebab Case Violations
**Count:** ~8 files
**Fix:** Use VS Code's file rename (F2 in explorer or right-click → Rename)

VS Code will automatically update all import references.

**Files to rename:**
- [ ] Check `npm run lint` output for specific files
- [ ] Right-click file → Rename
- [ ] VS Code updates imports automatically

---

## Phase 3: Type Annotations

### 3.1 Missing Return Types
**Count:** ~34 functions
**Rule:** `@typescript-eslint/explicit-function-return-type`

```typescript
// Before
function processData(input: string) {
  return input.toUpperCase();
}

// After
function processData(input: string): string {
  return input.toUpperCase();
}
```

**Strategy:**
1. Run `npm run lint 2>&1 | grep "Missing return type"`
2. For each file, add return type annotations
3. Use VS Code's "Infer return type" quick fix (Ctrl+.)

---

## Phase 4: Console Method Replacements

### 4.1 Console → Process I/O
**Count:** ~50 issues
**Rule:** `no-restricted-syntax` (custom)

```typescript
// Before
console.log('Output:', data);
console.error('Error:', err);

// After
process.stdout.write(`Output: ${data}\n`);
process.stderr.write(`Error: ${err}\n`);
```

**Strategy:**
1. Search: `console.log` → Replace with `process.stdout.write`
2. Search: `console.error` → Replace with `process.stderr.write`
3. Add `\n` to end of messages

**Alternative:** Create a logging utility:
```typescript
// utils/logging.ts
export const log = (msg: string): void => process.stdout.write(`${msg}\n`);
export const logError = (msg: string): void => process.stderr.write(`${msg}\n`);
```

---

## Phase 5: Promise Refactoring

### 5.1 Prefer await over .then()
**Count:** ~16 issues
**Rule:** `promise/prefer-await-to-then`

```typescript
// Before
function fetchData() {
  return fetch(url)
    .then(res => res.json())
    .then(data => processData(data));
}

// After
async function fetchData(): Promise<ProcessedData> {
  const res = await fetch(url);
  const data = await res.json();
  return processData(data);
}
```

### 5.2 Async Functions Without Await
**Count:** ~10 issues
**Rule:** `@typescript-eslint/require-await`

Either:
1. Add `await` to an operation
2. Remove `async` keyword if not needed
3. Return Promise directly without async

---

## Phase 6: Code Quality Refactoring

### 6.1 Nested Ternary Expressions
**Count:** ~14 issues
**Rule:** `unicorn/no-nested-ternary`

```typescript
// Before
const result = a ? (b ? 'ab' : 'a') : (c ? 'c' : 'none');

// After
function getResult(): string {
  if (a && b) return 'ab';
  if (a) return 'a';
  if (c) return 'c';
  return 'none';
}
```

### 6.2 Unnecessary Conditionals
**Count:** ~70 issues
**Rules:** `@typescript-eslint/no-unnecessary-condition`

These occur when TypeScript knows a value is never null/undefined.

```typescript
// Before (if `config` can never be undefined)
const value = config?.setting ?? 'default';

// After
const value = config.setting ?? 'default';
```

**Strategy:**
1. Trust TypeScript's type narrowing
2. Remove `?.` and `??` where types guarantee presence
3. If nullable, update type definitions

### 6.3 Non-null Assertions
**Count:** ~10 issues
**Rule:** `@typescript-eslint/no-non-null-assertion`

```typescript
// Before
const element = document.getElementById('app')!;

// After
const element = document.getElementById('app');
if (!element) throw new Error('Element not found');
```

---

## Phase 7: Complexity Reduction (Warnings)

### 7.1 Max Depth Violations
**Count:** ~44 issues
**Rule:** `max-depth` (max 4 levels)

**Strategies:**
1. **Early returns:** Exit function early for edge cases
2. **Extract functions:** Move nested logic to separate functions
3. **Guard clauses:** Check conditions and return/throw early

```typescript
// Before (depth: 5)
function process(data) {
  if (data) {
    if (data.items) {
      for (const item of data.items) {
        if (item.valid) {
          if (item.type === 'special') {
            // deep logic
          }
        }
      }
    }
  }
}

// After (depth: 2)
function process(data) {
  if (!data?.items) return;
  
  for (const item of data.items) {
    processItem(item);
  }
}

function processItem(item) {
  if (!item.valid || item.type !== 'special') return;
  // logic here
}
```

### 7.2 Complexity Warnings
**Count:** ~12 issues
**Rule:** `complexity` (max 20)

**Strategies:**
1. Split into smaller functions
2. Use strategy pattern for multiple conditions
3. Extract switch/case into lookup objects

---

## Phase 8: Final Cleanup

### 8.1 Unused Variables
**Count:** ~15 issues
**Rule:** `@typescript-eslint/no-unused-vars`

Prefix with `_` to indicate intentionally unused:
```typescript
// Before
function handler(event, context) {
  // only uses event
}

// After
function handler(event, _context) {
  // context intentionally unused
}
```

---

## Execution Checklist

- [ ] **Phase 1:** Quick fixes (!=, require)
- [ ] **Phase 2:** Rename files to kebab-case
- [ ] **Phase 3:** Add missing return types
- [ ] **Phase 4:** Replace console methods
- [ ] **Phase 5:** Refactor promises to async/await
- [ ] **Phase 6:** Simplify conditionals and ternaries
- [ ] **Phase 7:** Reduce nesting depth and complexity
- [ ] **Phase 8:** Prefix unused variables with `_`
- [ ] **Final:** Run `npm run lint` to verify zero errors

---

## Verification Commands

```bash
# Check remaining issues
npm run lint

# Check specific file
npx eslint path/to/file.ts

# Auto-fix and check
npm run lint:fix && npm run lint

# Format after changes
npm run format
```

---

## Notes

- Use VS Code's F2 rename for files — it updates all imports automatically
- Use Ctrl+. for quick fixes on most issues
- Some "unnecessary conditional" errors may require updating type definitions
- The `no-restricted-syntax` console rule has a custom message about stdio
