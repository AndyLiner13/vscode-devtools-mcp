export const greet = (name: string): string => `Hello, ${name}!`;

export const fetchData = async (url: string): Promise<string> => {
	const result = await Promise.resolve(url);
	return result;
};

export const identity = <T>(value: T): T => value;

export const createPair = (a: number, b: number): { sum: number; product: number } => ({
	sum: a + b,
	product: a * b,
});

export const handleEvent = ({ type, payload }: { type: string; payload: unknown }): void => {
	console.log(type, payload);
};

const multiLine = (
	first: string,
	second: string,
	third: string,
): string => {
	const parts = [first, second, third];
	return parts.join(', ');
};
