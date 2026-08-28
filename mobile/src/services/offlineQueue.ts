import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncOperation = 'create' | 'update' | 'delete';
export type PendingChange = {
  id: string;
  entity: string;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  baseVersion?: number;
  createdAt: string;
};

const STORAGE_KEY = '@ninho/pending-changes';

function uuid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueueChange(change: Omit<PendingChange, 'id' | 'createdAt'>) {
  const queue = await getPendingChanges();
  const next = { ...change, id: uuid(), createdAt: new Date().toISOString() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...queue, next]));
  return next;
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value ? JSON.parse(value) : [];
}

export async function removePendingChange(id: string) {
  const queue = await getPendingChanges();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue.filter((item) => item.id !== id)));
}
