export class Registry {
	static instances: Map<string, Registry> = new Map();
	static defaultConfig = { timeout: 5000 };

	static {
		Registry.instances.set('default', new Registry('default'));
	}

	name: string;

	constructor(name: string) {
		this.name = name;
	}

	static {
		console.log('Registry class initialized');
	}

	register(key: string): void {
		Registry.instances.set(key, this);
	}
}
