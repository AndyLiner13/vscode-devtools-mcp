/**
 * Test fixture: snapshot/single-method.ts
 *
 * A class with 10 methods. The snapshot target is ONE method (processPayment).
 * Verifies that only the target method + its referenced imports/properties appear.
 */

import { Logger } from './logger';
import { MetricsClient } from './metrics';
import { PaymentGateway, PaymentResult } from './payment-gateway';
import { NotificationService } from './notifications';
import { AuditTrail } from './audit';

const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;
const DEFAULT_CURRENCY = 'USD';
const TAX_RATE = 0.08;
const BATCH_SIZE = 100;

type PaymentStatus = 'pending' | 'completed' | 'failed';

interface PaymentRecord {
	id: string;
	amount: number;
	status: PaymentStatus;
	currency: string;
}

export class PaymentService {
	private gateway: PaymentGateway;
	private logger: Logger;
	private metrics: MetricsClient;
	private notifications: NotificationService;
	private audit: AuditTrail;

	constructor(
		gateway: PaymentGateway,
		logger: Logger,
		metrics: MetricsClient,
		notifications: NotificationService,
		audit: AuditTrail,
	) {
		this.gateway = gateway;
		this.logger = logger;
		this.metrics = metrics;
		this.notifications = notifications;
		this.audit = audit;
	}

	/** TARGET: This is the method we want in the snapshot. */
	async processPayment(amount: number, currency: string = DEFAULT_CURRENCY): Promise<PaymentResult> {
		this.logger.info(`Processing payment: ${amount} ${currency}`);

		let retries = 0;
		while (retries < MAX_RETRIES) {
			try {
				const result = await this.gateway.charge(amount, currency);
				this.metrics.increment('payment.success');
				return result;
			} catch (err) {
				retries++;
				this.logger.warn(`Payment attempt ${retries} failed`);
			}
		}

		throw new Error(`Payment failed after ${MAX_RETRIES} retries`);
	}

	async refundPayment(paymentId: string): Promise<void> {
		const record = await this.gateway.lookup(paymentId);
		await this.gateway.refund(record.id, record.amount);
		this.notifications.send('refund', paymentId);
	}

	async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
		const record = await this.gateway.lookup(paymentId);
		return record.status;
	}

	async batchProcess(amounts: number[]): Promise<PaymentResult[]> {
		const batches: number[][] = [];
		for (let i = 0; i < amounts.length; i += BATCH_SIZE) {
			batches.push(amounts.slice(i, i + BATCH_SIZE));
		}
		const results: PaymentResult[] = [];
		for (const batch of batches) {
			for (const amount of batch) {
				results.push(await this.processPayment(amount));
			}
		}
		return results;
	}

	calculateTax(amount: number): number {
		return amount * TAX_RATE;
	}

	async recordAudit(paymentId: string, action: string): Promise<void> {
		await this.audit.log(paymentId, action);
	}

	getTimeout(): number {
		return TIMEOUT_MS;
	}

	async notifyCustomer(paymentId: string, message: string): Promise<void> {
		await this.notifications.send(message, paymentId);
	}

	async lookupRecord(paymentId: string): Promise<PaymentRecord> {
		const raw = await this.gateway.lookup(paymentId);
		return {
			id: raw.id,
			amount: raw.amount,
			status: raw.status as PaymentStatus,
			currency: DEFAULT_CURRENCY,
		};
	}

	getDefaultCurrency(): string {
		return DEFAULT_CURRENCY;
	}
}
