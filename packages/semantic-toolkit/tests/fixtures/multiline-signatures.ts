// Tests multi-line function signatures
// Verifies collapse produces correct single-line stubs

export function complexGenericFunction<
	T extends Record<string, unknown>,
	U extends keyof T
>(
	param1: T,
	param2: U,
	options?: {
		debug?: boolean;
		timeout?: number;
	}
): Promise<T[U]> {
	return Promise.resolve(param1[param2]);
}

export class ServiceWithMultilineMethods {
	async processWithManyParams(
		input: string,
		config: { a: number; b: number },
		callback: (result: string) => void
	): Promise<void> {
		callback(input);
	}

	transformData<
		TInput,
		TOutput
	>(
		data: TInput,
		transformer: (item: TInput) => TOutput
	): TOutput {
		return transformer(data);
	}
}

export const arrowWithMultilineSignature = <T extends object>(
	value: T,
	keys: Array<keyof T>
): Partial<T> => {
	const result: Partial<T> = {};
	for (const key of keys) {
		result[key] = value[key];
	}
	return result;
};
