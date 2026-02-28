/**
 * Parse a string value.
 * @param value - The string to parse
 */
function parse(value: string): string;
/**
 * Parse a number value.
 * @param value - The number to parse
 */
function parse(value: number): number;
function parse(value: string | number): string | number {
	return typeof value === 'string' ? value.trim() : value * 2;
}

export function format(value: string): string;
export function format(value: number): string;
export function format(value: string | number): string {
	return String(value);
}

export class Converter {
	convert(input: string): number;
	convert(input: number): string;
	convert(input: string | number): string | number {
		return typeof input === 'string' ? input.length : String(input);
	}

	constructor(name: string);
	constructor(name: string, version: number);
	constructor(public name: string, public version: number = 1) {}
}
