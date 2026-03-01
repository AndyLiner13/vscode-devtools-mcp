# Codebase Search — Kind Disambiguation Hypothesis

## Test File

`client-workspace/ast-parser-test.ts` — A comprehensive TypeScript AST parser test file (1802 lines) that exercises every TypeScript feature: types, generics, decorators, namespaces, classes, interfaces, enums, function overloads, and deeply nested structures.

## Selected Symbols & Hypotheses

### Test 1: `symbol = UserService` (unique class — baseline)

**Query:** `symbol = UserService`

**What exists in the file:**
- `class UserService extends BaseEntity implements Cloneable<UserService>` — line ~295, kind = `class`

**Hypothesis:**
- `found: true`, `matchCount: 1`, `fileCount: 1`
- No ambiguity hint (only one symbol named `UserService`)
- Output should contain the class definition, its methods (`findUser`, `createUser`, `updateUser`, `updateUserProfile`, etc.), and connection graph with relationships to `BaseEntity`, `Cloneable<UserService>`, `DatabaseConfig`, `UserProfile`
- `hint: null`

---

### Test 2: `symbol = Timestamped` (ambiguous — type AND function share the name)

**Query:** `symbol = Timestamped`

**What exists in the file:**
- `type Timestamped<T> = T & { createdAt: Date; updatedAt: Date; }` — line ~698, kind = `type`
- `function Timestamped<TBase extends Constructor>(Base: TBase)` — line ~998, kind = `function`

**Hypothesis:**
- `found: false` (ambiguity detection triggers)
- `matchCount: 2`
- Output should contain the ambiguity hint message: `Multiple symbols named "Timestamped" found. Add a "kind" flag to disambiguate:`
- The hint should list two suggestions:
  - `symbol = Timestamped, kind = type  (type at ast-parser-test.ts:~698)`
  - `symbol = Timestamped, kind = function  (function at ast-parser-test.ts:~998)`
- This is the **primary test case** for the new kind disambiguation feature

---

### Test 3: `symbol = Timestamped, kind = type` (disambiguated — type alias)

**Query:** `symbol = Timestamped, kind = type`

**What exists in the file:**
- `type Timestamped<T> = T & { createdAt: Date; updatedAt: Date; }` — line ~698

**Hypothesis:**
- `found: true`, `matchCount: 1`
- **Only** the type alias is returned, NOT the function
- Output should show the type alias definition and its connection graph
- `hint: null`

---

### Test 4: `symbol = Timestamped, kind = function` (disambiguated — mixin function)

**Query:** `symbol = Timestamped, kind = function`

**What exists in the file:**
- `function Timestamped<TBase extends Constructor>(Base: TBase)` — line ~998

**Hypothesis:**
- `found: true`, `matchCount: 1`
- **Only** the function (mixin) is returned, NOT the type alias
- Output should show the function definition and its connection graph
- `hint: null`

---

### Test 5: `symbol = Shapes.Circle` (nested namespace child)

**Query:** `symbol = Shapes.Circle`

**What exists in the file:**
- `class Circle` inside `namespace Geometry > namespace Shapes` — line ~515
- The parser dot-notation splits `Shapes.Circle` into `parentName: 'Shapes'`, `symbolName: 'Circle'`
- The chunk's `parentName` should be `'Shapes'` (immediate parent namespace)

**Hypothesis:**
- `found: true`, `matchCount: 1`
- The matched chunk is the `Circle` class with parentName `Shapes`
- Output should contain the `Circle` class with its methods (`area`, `circumference`, `contains`)
- `hint: null`

---

### Test 6: `symbol = Color` (enum — unique)

**Query:** `symbol = Color`

**What exists in the file:**
- `enum Color { Red, Green, Blue, Yellow, Cyan, Magenta }` — line ~105, kind = `enum`

**Hypothesis:**
- `found: true`, `matchCount: 1`
- Output should contain the enum definition with all members (Red through Magenta)
- `hint: null`

---

### Test 7: `symbol = createElement` (function overloads)

**Query:** `symbol = createElement`

**What exists in the file:**
- Multiple overload signatures + implementation — lines ~634-640, kind = `function`
- All overloads belong to the same named function, so the parser likely produces one symbol

**Hypothesis:**
- `found: true`, `matchCount: 1` (overloads consolidated into one chunk)
- Output should contain the overload signatures and the implementation body
- `hint: null`

---

### Test 8: `symbol = ApplicationServer.start` (deeply nested method)

**Query:** `symbol = ApplicationServer.start`

**What exists in the file:**
- `async start(): Promise<void>` method inside `class ApplicationServer` — line ~1157

**Hypothesis:**
- `found: true`, `matchCount: 1`
- Output should contain the `start` method and its deeply nested anonymous class structures (connectionPool, HealthChecker, AlertSystem, etc.)
- `hint: null`

---

## Summary Table

| # | Query | Expected `found` | Expected `matchCount` | Key Behavior Tested |
|---|-------|-------------------|-----------------------|---------------------|
| 1 | `symbol = UserService` | true | 1 | Baseline — unique class |
| 2 | `symbol = Timestamped` | false | 2 | **Ambiguity detection** (type + function) |
| 3 | `symbol = Timestamped, kind = type` | true | 1 | **Kind filter** — selects type alias |
| 4 | `symbol = Timestamped, kind = function` | true | 1 | **Kind filter** — selects function |
| 5 | `symbol = Shapes.Circle` | true | 1 | Dot-notation parent in namespace |
| 6 | `symbol = Color` | true | 1 | Enum lookup |
| 7 | `symbol = createElement` | true | 1 | Overloaded function |
| 8 | `symbol = ApplicationServer.start` | true | 1 | Nested method in class |

## Key Expectations for the Kind Feature

1. **Test 2 is the showpiece.** Without `kind`, querying `Timestamped` should return an ambiguity hint — NOT the symbol content. This proves that the tool detects same-name/different-kind conflicts.
2. **Tests 3 & 4 prove disambiguation works.** Adding `kind = type` or `kind = function` should narrow to exactly one match.
3. **Tests 1, 5–8 should be unaffected** by the kind feature since those symbols are unique by name (no ambiguity).
