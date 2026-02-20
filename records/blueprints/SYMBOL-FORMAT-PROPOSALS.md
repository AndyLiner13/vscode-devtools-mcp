# Symbol Format Proposals

> Options for representing symbols implicitly, without explicit `kind`, `params`, `returns` keys.

---

## Option A: Signature Strings

**Value is the TypeScript signature; structure implies kind.**

```json
{
  "index.ts": {
    "main": "(args: string[]): Promise<void>",
    "MAX_RETRIES": "number = 3",
    "Config": {
      "apiKey": "string",
      "timeout": "number"
    },
    "MyClass": {
      "constructor": "(config: Config)",
      "connect": "(url: string): Promise<void>",
      "send": "(method: string, params?: object): Promise<unknown>",
      "count": "number"
    },
    "Status": ["pending", "active", "done"]
  }
}
```

### Type Inference Rules
| Value Pattern | Inferred Kind |
|---------------|---------------|
| String with `(...)` | Function or method |
| String without `(...)` | Property or constant type |
| Object | Class or interface (contains members) |
| Array of strings | Enum values |

### Pros
- Clean, readable signatures
- Familiar TypeScript syntax
- No clutter from explicit kind fields

### Cons
- Can't distinguish class from interface
- Can't distinguish function from method
- Need convention for optional params (use `?`)

---

## Option B: Name Conventions

**Use naming patterns to imply kind.**

```json
{
  "index.ts": {
    "main()": "(args: string[]): Promise<void>",
    "MAX_RETRIES": "number = 3",
    "Config{}": {
      "apiKey": "string",
      "timeout": "number"
    },
    "MyClass{}": {
      "constructor()": "(config: Config)",
      "connect()": "(url: string): Promise<void>",
      "send()": "(method: string, params?: object): Promise<unknown>",
      "count": "number"
    },
    "Status[]": ["pending", "active", "done"]
  }
}
```

### Naming Conventions
| Pattern | Kind |
|---------|------|
| `name()` | Function (top-level) |
| `name()` (inside class) | Method |
| `name` (inside class) | Property |
| `Name{}` | Class or interface |
| `Name[]` | Enum |
| `UPPER_CASE` | Constant |

### Pros
- Unambiguous at a glance
- Can distinguish classes from interfaces
- Compact

### Cons
- Unconventional naming (not valid JS identifiers)
- Parsing required to extract actual name

---

## Option C: Type as Value

**Value structure implies kind; signature in value.**

```json
{
  "index.ts": {
    "main": ["args: string[]", "Promise<void>"],
    "MAX_RETRIES": 3,
    "Config": {
      "apiKey": null,
      "timeout": null
    },
    "MyClass": {
      "constructor": ["config: Config"],
      "connect": ["url: string", "Promise<void>"],
      "send": ["method: string, params?: object", "Promise<unknown>"],
      "count": null
    },
    "Status": { "_enum": ["pending", "active", "done"] }
  }
}
```

### Type Inference Rules
| Value Type | Inferred Kind |
|------------|---------------|
| `[params, return]` | Function/method |
| `[params]` | Constructor (no return) |
| `null` | Property (type omitted for brevity) |
| `number/string/boolean` | Constant with value |
| Object | Class/interface |
| Object with `_enum` | Enum |

### Pros
- Very compact
- Programmatically easy to parse
- Clear function vs property distinction

### Cons
- Less readable than actual signatures
- Loses type info for properties (unless we keep it)
- Awkward `_enum` convention

---

## Option D: Hybrid - Signature with Markers

**Clean signatures with minimal markers for disambiguation.**

```json
{
  "index.ts": {
    "main": "(args: string[]): Promise<void>",
    "MAX_RETRIES": ": number = 3",
    ":Config": {
      "apiKey": ": string",
      "timeout": ": number"
    },
    "MyClass": {
      "constructor": "(config: Config)",
      "connect": "(url: string): Promise<void>",
      ":count": ": number"
    },
    "=Status": ["pending", "active", "done"]
  }
}
```

### Markers
| Marker | Meaning |
|--------|---------|
| `:Name` (colon prefix on key) | Interface |
| `=Name` (equals prefix on key) | Enum |
| No prefix, object value | Class |
| `:name` (colon prefix inside class) | Property |
| No prefix, string with `()` | Method |
| String starting with `:` | Type annotation |

### Pros
- Minimal markers
- Distinguishes interface from class
- Clean signatures

### Cons
- Still requires some explicit markers
- Colon prefix is subtle

---

## Option E: Pure Structural (Most Implicit)

**Everything is implicit; no markers, no explicit kinds.**

```json
{
  "index.ts": {
    "main": "(args: string[]): Promise<void>",
    "MAX_RETRIES": "3",
    "Config": {
      "apiKey": "string",
      "timeout": "number"
    },
    "MyClass": {
      "connect": "(url: string): Promise<void>",
      "count": "number"
    },
    "Status": ["pending", "active", "done"]
  }
}
```

### Inference (Parser Must Determine)
1. **Function/Method**: String value containing `(` and `)` with params
2. **Property/Type**: String value without `()`
3. **Class/Interface**: Object value containing members
4. **Enum**: Array value of strings
5. **Constant**: String that looks like a literal value (`"3"`, `"true"`, `"'hello'"`)

### Pros
- Absolutely minimal
- Maximum token efficiency
- Very clean

### Cons
- Ambiguous: class vs interface (can't tell)
- Ambiguous: constant type vs constant value
- Parser has to be smart

---

## Comparison Table

| Format | Distinguishes Class/Interface | Distinguishes Function/Method | Readable | Compact |
|--------|-------------------------------|-------------------------------|----------|---------|
| A: Signature Strings | ❌ | ❌ | ✅✅ | ✅ |
| B: Name Conventions | ✅ | ✅ | ✅ | ✅ |
| C: Type as Value | ❌ (needs marker) | ✅ | ❌ | ✅✅ |
| D: Hybrid Markers | ✅ | ✅ | ✅ | ✅ |
| E: Pure Structural | ❌ | ❌ | ✅✅ | ✅✅ |

---

## Recommendation

**Option A (Signature Strings)** is the best balance of readability and compactness:
- Most readable (actual TypeScript syntax)
- Compact (no explicit kind fields)
- The distinction between class/interface is often not critical for navigation
- Function vs method can be inferred from context (inside class = method)

If disambiguation is critical, **Option B (Name Conventions)** provides it with minimal overhead.

---

*Select your preferred option and I'll update the blueprint.*
