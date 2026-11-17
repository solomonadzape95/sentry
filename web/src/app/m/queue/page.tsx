import { OfflineQueue } from "@/components/mobile/offline-queue";

export const dynamic = "force-dynamic";

export default function MobileQueuePage() {
  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
          Offline-first operations
        </p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">Sync queue</h1>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Inventory entries are stored on the device first. Reconnect and sync when the network returns.
        </p>
      </div>
      <OfflineQueue />
    </div>
  );
}
