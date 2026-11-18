import { get, set } from "idb-keyval";

const KEY = "cheta:offline-queue:v1";

export type QueuedOperation = {
  id: string;
  type: "issue" | "receive";
  payload: Record<string, unknown>;
  medicineName: string;
  quantity: number;
  unit: string;
  facilityName: string;
  createdAt: string;
  status: "pending" | "error";
  error?: string;
};

export async function readQueue(): Promise<QueuedOperation[]> {
  try {
    return (await get<QueuedOperation[]>(KEY)) ?? [];
  } catch {
    return [];
  }
}

async function writeQueue(ops: QueuedOperation[]): Promise<void> {
  await set(KEY, ops);
}

export async function enqueue(operation: Omit<QueuedOperation, "id" | "createdAt" | "status">) {
  const ops = await readQueue();
  const op: QueuedOperation = {
    ...operation,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  await writeQueue([op, ...ops]);
  return op;
}

export async function updateQueueStatus(id: string, status: "pending" | "error", error?: string) {
  const ops = await readQueue();
  await writeQueue(ops.map((o) => (o.id === id ? { ...o, status, error } : o)));
}

export async function removeQueued(id: string) {
  const ops = await readQueue();
  await writeQueue(ops.filter((o) => o.id !== id));
}

export async function syncQueue(): Promise<{ synced: number; failed: number; remaining: number }> {
  const ops = await readQueue();
  let synced = 0;
  let failed = 0;
  for (const op of ops) {
    try {
      const res = await fetch(`/api/stock/${op.type}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...op.payload, clientId: op.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      await removeQueued(op.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await updateQueueStatus(op.id, "error", error instanceof Error ? error.message : "Sync failed");
    }
  }
  const remaining = (await readQueue()).length;
  return { synced, failed, remaining };
}
