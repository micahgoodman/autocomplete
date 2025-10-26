// Cross-runtime helpers (Node + Deno + Edge)
// uuid(): use Web Crypto if available, fallback to a simple pseudo-uuid
export function uuid(): string {
    const g: any = globalThis as any;
    if (g?.crypto?.randomUUID) {
        return g.crypto.randomUUID();
    }
    // Very small fallback; not cryptographically secure
    return (
        Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    );
}

// inspect(): provide a best-effort pretty-printer
let nodeInspect: ((x: unknown) => string) | undefined;
let nodeInspectCustom: symbol | undefined;
try {
    // Top-level dynamic import guarded for Node environments only
    // Will throw in Deno/Edge and be caught
    const utilMod: any = await import("node:util");
    nodeInspect = utilMod.inspect as (x: unknown) => string;
    nodeInspectCustom = utilMod.inspect.custom as symbol;
} catch (_) {
    // Not Node or util not available
}

export function inspect(x: unknown): string {
    try {
        return nodeInspect ? nodeInspect(x) : JSON.stringify(x, null, 2);
    } catch (_) {
        try {
            return JSON.stringify(x);
        } catch {
            return String(x);
        }
    }
}

export const INSPECT_CUSTOM: symbol | undefined = nodeInspectCustom;
