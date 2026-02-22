import type { ContentBlock, ExecutionRecord, InspectorStorage, RecordRating } from './types';

const STORAGE_KEY = 'mcp-inspector-records';
const STORAGE_VERSION = 1;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadStorage(): InspectorStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { records: {}, version: STORAGE_VERSION };
    }
    const parsed = JSON.parse(raw) as InspectorStorage;
    if (parsed.version !== STORAGE_VERSION) {
      return { records: {}, version: STORAGE_VERSION };
    }
    return parsed;
  } catch {
    return { records: {}, version: STORAGE_VERSION };
  }
}

function saveStorage(storage: InspectorStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

/** Remove unrated records on load — only rated records survive reloads */
export function pruneUnrated(): void {
  const storage = loadStorage();
  for (const toolName of Object.keys(storage.records)) {
    storage.records[toolName] = storage.records[toolName].filter(r => r.rating !== null);
    if (storage.records[toolName].length === 0) {
      delete storage.records[toolName];
    }
  }
  saveStorage(storage);
}

export function getRecords(toolName: string): ExecutionRecord[] {
  const storage = loadStorage();
  return storage.records[toolName] ?? [];
}

export function getAllRecords(): Record<string, ExecutionRecord[]> {
  return loadStorage().records;
}

export function addRecord(
  toolName: string,
  input: string,
  output: ContentBlock[],
  isError: boolean,
  durationMs: number,
): ExecutionRecord {
  const storage = loadStorage();

  if (!storage.records[toolName]) {
    storage.records[toolName] = [];
  }

  const record: ExecutionRecord = {
    id: generateId(),
    toolName,
    input,
    output,
    isError,
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    rating: null,
    comment: '',
    priority: storage.records[toolName].length,
    durationMs,
  };

  // Newest first
  storage.records[toolName].unshift(record);
  saveStorage(storage);
  return record;
}

export function updateRating(toolName: string, recordId: string, rating: RecordRating): void {
  const storage = loadStorage();
  const records = storage.records[toolName];
  if (!records) {
    return;
  }
  const record = records.find(r => r.id === recordId);
  if (record) {
    record.rating = rating;
    saveStorage(storage);
  }
}

export function updateComment(toolName: string, recordId: string, comment: string): void {
  const storage = loadStorage();
  const records = storage.records[toolName];
  if (!records) {
    return;
  }
  const record = records.find(r => r.id === recordId);
  if (record) {
    record.comment = comment;
    saveStorage(storage);
  }
}

export function updateRecordOutput(
  toolName: string,
  recordId: string,
  output: ContentBlock[],
  isError: boolean,
  durationMs: number,
): void {
  const storage = loadStorage();
  const records = storage.records[toolName];
  if (!records) {
    return;
  }
  const record = records.find(r => r.id === recordId);
  if (record) {
    record.output = output;
    record.isError = isError;
    record.durationMs = durationMs;
    record.lastRunAt = new Date().toISOString();
    saveStorage(storage);
  }
}

export function deleteRecord(toolName: string, recordId: string): void {
  const storage = loadStorage();
  const records = storage.records[toolName];
  if (!records) {
    return;
  }
  storage.records[toolName] = records.filter(r => r.id !== recordId);
  if (storage.records[toolName].length === 0) {
    delete storage.records[toolName];
  }
  saveStorage(storage);
}

export function reorderRecords(toolName: string, orderedIds: string[]): void {
  const storage = loadStorage();
  const records = storage.records[toolName];
  if (!records) {
    return;
  }
  for (const record of records) {
    const idx = orderedIds.indexOf(record.id);
    if (idx !== -1) {
      record.priority = idx;
    }
  }
  saveStorage(storage);
}
