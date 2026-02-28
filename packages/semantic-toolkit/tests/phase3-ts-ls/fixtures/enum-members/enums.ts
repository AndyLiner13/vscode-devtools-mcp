// Enum members fixture — all enum patterns

// ── Numeric auto-increment ──────────────────────────────────

export enum Direction {
	Up,
	Down,
	Left,
	Right,
}

// ── Numeric explicit values ─────────────────────────────────

export enum HttpStatus {
	OK = 200,
	NotFound = 404,
	InternalServerError = 500,
}

// ── String enum ─────────────────────────────────────────────

export enum Color {
	Red = "RED",
	Green = "GREEN",
	Blue = "BLUE",
}

// ── Const enum ──────────────────────────────────────────────

export const enum Flags {
	None = 0,
	Read = 1,
	Write = 2,
	Execute = 4,
}

// ── Mixed (heterogeneous) enum ──────────────────────────────

export enum Mixed {
	Zero = 0,
	Hello = "hello",
}

// ── Computed member ─────────────────────────────────────────

export enum Computed {
	A = 1 + 2,
	B = "hello".length,
	C = 10,
}

// ── Ambient (declare) enum ──────────────────────────────────

export declare enum External {
	Foo,
	Bar,
	Baz,
}

// ── Enum with negative values ───────────────────────────────

export enum Temperature {
	Freezing = -10,
	Cold = 0,
	Warm = 20,
	Hot = 40,
}

// ── Enum with mixed auto-increment after explicit ───────────

export enum Sequence {
	A,
	B,
	C = 100,
	D,
	E,
}

// ── Empty enum (edge case) ──────────────────────────────────

export enum Empty {}

// ── Single-member enum ──────────────────────────────────────

export enum SingleMember {
	Only = "ONLY",
}
