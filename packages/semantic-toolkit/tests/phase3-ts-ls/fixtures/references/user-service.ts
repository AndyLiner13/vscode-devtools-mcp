import { formatDate, type DateString, type Timestamped } from './utils';

export class UserService implements Timestamped {
	createdAt: DateString = '';
	updatedAt: DateString = '';

	getDisplayDate(): string {
		return formatDate(new Date(this.createdAt));
	}
}
