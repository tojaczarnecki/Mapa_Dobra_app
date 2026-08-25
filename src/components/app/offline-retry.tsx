"use client";

export function OfflineRetry() {
  return (
    <button type="button" className="public-state-secondary" onClick={() => window.location.reload()}>
      Spróbuj ponownie
    </button>
  );
}
