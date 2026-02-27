export enum Direction {
	Up,
	Down,
	Left,
	Right,
}

export enum Color {
	Red = 'red',
	Green = 'green',
	Blue = 'blue',
}

export const enum HttpStatus {
	OK = 200,
	NotFound = 404,
	ServerError = 500,
}

export enum BitFlag {
	None = 0,
	Read = 1 << 0,
	Write = 1 << 1,
	Execute = 1 << 2,
}
