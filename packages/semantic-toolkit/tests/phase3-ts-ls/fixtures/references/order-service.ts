import { formatDate, type Timestamped } from './utils';

export class OrderService implements Timestamped {
	createdAt: string = '';
	updatedAt: string = '';

	getOrderDate(): string {
		return formatDate(new Date(this.createdAt));
	}

	getUpdateDate(): string {
		return formatDate(new Date(this.updatedAt));
	}
}
