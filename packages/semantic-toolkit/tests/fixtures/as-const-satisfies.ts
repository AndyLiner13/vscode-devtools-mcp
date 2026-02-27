export const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;

export const CONFIG = {
	host: 'localhost',
	port: 3000,
	debug: false,
} as const;

interface Theme {
	primary: string;
	secondary: string;
	fontSize: number;
}

export const darkTheme = {
	primary: '#000',
	secondary: '#333',
	fontSize: 14,
} satisfies Theme;

export const lightTheme = {
	primary: '#fff',
	secondary: '#ccc',
	fontSize: 14,
} as const satisfies Theme;

export type Direction = (typeof DIRECTIONS)[number];
