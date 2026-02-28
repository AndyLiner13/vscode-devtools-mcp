// Unicode / Confusable Identifiers test fixture
// This file contains identifiers with various Unicode characteristics
// for testing the unicode-identifiers resolver.

// =====================================================================
// 1. Pure ASCII — should NOT be flagged
// =====================================================================
const normalVar = 42;
function normalFunc() { return normalVar; }
class NormalClass { value = 1; }
interface NormalInterface { id: number; }

// =====================================================================
// 2. Single-script non-ASCII (legitimate i18n) — severity: info
// =====================================================================

// Accented Latin characters (still Latin script, single-script)
const caf\u00e9 = 'coffee';           // café — Latin Extended
const r\u00e9sum\u00e9 = 'document';  // résumé — Latin Extended
const na\u00efve = true;               // naïve — Latin Extended

// =====================================================================
// 3. Cyrillic-only identifiers — severity: info (single-script)
// =====================================================================
const \u0444\u0443\u043D\u043A\u0446\u0438\u044F = 1;  // функция (Cyrillic for "function")
const \u0434\u0430\u043D\u043D\u044B\u0435 = [];        // данные (Cyrillic for "data")

// =====================================================================
// 4. Mixed-script identifiers — severity: warning
// =====================================================================

// Latin + Cyrillic mix (the 'а' in pаyment is Cyrillic U+0430, not Latin 'a')
const p\u0430yment = 100;             // p + Cyrillic а + yment

// Latin + Greek mix
const \u03b1lpha_value = 0;           // α (Greek alpha) + lpha_value (Latin)

// =====================================================================
// 5. Confusable pairs — severity: critical
// =====================================================================

// 'score' in pure Latin
const score = 99;

// 'sсore' with Cyrillic с (U+0441) instead of Latin c
const s\u0441ore = 100;

// 'port' in pure Latin
const port = 8080;

// 'рort' with Cyrillic р (U+0440) instead of Latin p
const \u0440ort = 9090;

// =====================================================================
// 6. Zero-width characters — severity: critical
//    U+200C (ZWNJ) and U+200D (ZWJ) are valid in ECMAScript identifiers
// =====================================================================

// Identifier with zero-width non-joiner (U+200C) embedded
const foo\u200Cbar = 'invisible zwnj';

// Identifier with zero-width joiner (U+200D) embedded
const test\u200Dname = 'invisible zwj';

// =====================================================================
// 7. Bidi override characters
//    These CANNOT appear in valid TS identifiers, but CAN appear in
//    comments and string literals (Trojan Source attack vector).
//    The resolver tests raw source scanning for these separately.
// =====================================================================

// Normal identifier — but the comment has a Bidi: \u202E attack
const safeValue = 'clean';

// =====================================================================
// 8. Scope-aware identifiers
// =====================================================================

function processData() {
	// Accented identifier inside a function
	const r\u00e9sultat = 42;  // résultat — scoped to function:processData
	return r\u00e9sultat;
}

class DataService {
	// Accented property inside a class
	\u00e9tat: string = 'active';  // état — scoped to class:DataService
}

interface Configur\u00e4tion {
	// Accented interface name and property
	n\u00e4me: string;  // näme — scoped to interface:Configurätion
}

// =====================================================================
// 9. Greek-only identifiers — severity: info (single-script)
// =====================================================================
const \u03c0 = 3.14159;        // π (pi)
const \u0394x = 0.001;          // Δx (delta x) — mixed: Greek + Latin → warning

// =====================================================================
// 10. CJK identifiers — severity: info (single-script)
// =====================================================================
const \u4e16\u754c = 'world';   // 世界 (CJK "world")

// =====================================================================
// 11. Combining diacritical marks
// =====================================================================

// 'e' + combining acute accent (U+0301) — NFC normalizes to é (U+00E9)
const caf\u0065\u0301_two = 'coffee variant';  // cafe + combining acute → café_two

// =====================================================================
// 12. Enum with Unicode member (scope: file)
// =====================================================================
enum Couleur {
	Rouge = 'red',
	Vert = 'green',
}

// Enum with accented name
enum \u00c9tat {
	Actif = 'active',    // État enum
	Inactif = 'inactive',
}
