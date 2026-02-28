import { Auditable } from './interfaces';
import { BaseModel } from './models';

/** AuditedModel: extends BaseModel, implements Auditable (diamond through Entity). */
export class AuditedModel extends BaseModel implements Auditable {
	updatedAt: Date = new Date();
	updatedBy: string = '';
}
