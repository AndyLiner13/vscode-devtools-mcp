export function level0(a: number): number {
	function level1(b: number): number {
		function level2(c: number): number {
			function level3(d: number): number {
				return d * 2;
			}
			return level3(c) + 1;
		}
		return level2(b) + 1;
	}
	return level1(a) + 1;
}
