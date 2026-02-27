export class LargeService {
	private data: Map<string, number> = new Map();

	constructor(private readonly name: string) {}

	method01(): void { console.log(1); }
	method02(): void { console.log(2); }
	method03(): void { console.log(3); }
	method04(): void { console.log(4); }
	method05(): void { console.log(5); }
	method06(): void { console.log(6); }
	method07(): void { console.log(7); }
	method08(): void { console.log(8); }
	method09(): void { console.log(9); }
	method10(): void { console.log(10); }
	method11(): void { console.log(11); }
	method12(): void { console.log(12); }
	method13(): void { console.log(13); }
	method14(): void { console.log(14); }
	method15(): void { console.log(15); }
	method16(): void { console.log(16); }
	method17(): void { console.log(17); }
	method18(): void { console.log(18); }
	method19(): void { console.log(19); }
	method20(): void { console.log(20); }

	get size(): number { return this.data.size; }

	static create(name: string): LargeService {
		return new LargeService(name);
	}
}
