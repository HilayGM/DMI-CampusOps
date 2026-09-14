/** Resolves when available; rejects when the health check fails. */
export type BackendHealthPort = () => Promise<void>;
