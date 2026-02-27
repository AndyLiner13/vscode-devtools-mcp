export const MAX_RETRIES = 3;

export const config = {
	host: 'localhost',
	port: 3000,
	get url() {
		return `http://${this.host}:${this.port}`;
	},
};

export let counter = 0;

const [first, second, ...rest] = [1, 2, 3, 4, 5];

const { name: userName, age } = { name: 'Alice', age: 30 };

export const processItem = (item: string): string => {
	return item.toUpperCase();
};

export const double = (x: number): number => x * 2;
