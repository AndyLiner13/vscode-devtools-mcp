export class Wallet {
	#balance: number;
	readonly #owner: string;
	static #instanceCount = 0;

	constructor(owner: string, initialBalance: number) {
		this.#owner = owner;
		this.#balance = initialBalance;
		Wallet.#instanceCount++;
	}

	get balance(): number {
		return this.#balance;
	}

	#validate(amount: number): boolean {
		return amount > 0 && amount <= this.#balance;
	}

	withdraw(amount: number): boolean {
		if (!this.#validate(amount)) return false;
		this.#balance -= amount;
		return true;
	}

	static get count(): number {
		return Wallet.#instanceCount;
	}
}
