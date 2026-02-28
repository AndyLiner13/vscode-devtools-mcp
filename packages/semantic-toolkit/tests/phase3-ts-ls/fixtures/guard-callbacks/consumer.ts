// Guard Callbacks fixture — cross-file consumer

import type { Person, Animal } from './types';
import { isUser, isAdmin, isCat, assertDefined, filterByGuard } from './guards';

const remotePeople: Person[] = [];
const remoteAnimals: Animal[] = [];

// Cross-file .filter() with guards
export const remoteUsers = remotePeople.filter(isUser);
export const remoteAdmins = remotePeople.filter(isAdmin);
export const remoteCats = remoteAnimals.filter(isCat);

// Cross-file .find() with guard
export const foundUser = remotePeople.find(isUser);

// Cross-file custom HOF with guard
export const customRemote = filterByGuard(remotePeople, isUser);

// Cross-file assertion usage
const maybeValues: (number | null)[] = [1, null, 3];
maybeValues.forEach(assertDefined);
