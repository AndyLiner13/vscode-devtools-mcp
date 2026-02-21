/**
 * CDP (Chrome DevTools Protocol) WebSocket client for the extension.
 *
 * Adapted from the MCP server's CdpService.ts. Key differences:
 * - Instance-based (not singleton) — lifecycle managed by host-handlers.ts
 * - No process.on handlers — uses VS Code Disposable pattern
 * - Emits events for connection state changes
 */

import WebSocket from 'ws';
import http from 'node:http';

import type { CdpTarget } from './types';

// ── Types ────────────────────────────────────────────────────────────────────

interface CdpResponse {
    id: number;
    result?: Record<string, unknown>;
    error?: { code: number; message: string; data?: string };
}

interface CdpEvent {
    method: string;
    params?: Record<string, unknown>;
    sessionId?: string;
}

interface PendingRequest {
    resolve: (value: Record<string, unknown>) => void;
    reject: (reason: Error) => void;
    method: string;
}

export interface CdpSendOptions {
    sessionId?: string;
    timeout?: number;
}

type CdpMessageListener = (method: string, params: Record<string, unknown>, sessionId?: string) => void;

// ── CdpClient ────────────────────────────────────────────────────────────────

export class CdpClient {
    private ws: WebSocket | null = null;
    private messageId = 0;
    private pendingRequests = new Map<number, PendingRequest>();
    private attachedTargets = new Map<string, { targetId: string; sessionId: string; type: string }>();
    private allTargets: CdpTarget[] = [];
    private _port: number | null = null;
    private disposed = false;
    private eventListeners: CdpMessageListener[] = [];

    get port(): number | null {
        return this._port;
    }

    get connected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    get webSocket(): WebSocket | null {
        return this.ws;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    async connect(cdpPort: number): Promise<void> {
        if (this.disposed) {
            throw new Error('CdpClient has been disposed');
        }

        this._port = cdpPort;
        const target = await this.findWorkbenchTarget(cdpPort);
        if (!target) {
            throw new Error(`No workbench target found on CDP port ${cdpPort}`);
        }

        await this.connectWebSocket(target.webSocketDebuggerUrl);

        // Enable required CDP domains
        await this.send('Runtime.enable');
        await this.send('Page.enable');

        // Auto-attach to all targets (needed for OOPIF/webview frames)
        await this.send('Target.setAutoAttach', {
            autoAttach: true,
            waitForDebuggerOnStart: false,
            flatten: true,
        });
        await this.send('Target.setDiscoverTargets', { discover: true });
    }

    async send(
        method: string,
        params?: Record<string, unknown>,
        options?: CdpSendOptions,
    ): Promise<Record<string, unknown>> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('CDP WebSocket is not connected');
        }

        const id = ++this.messageId;
        const timeout = options?.timeout ?? 30000;

        const message: Record<string, unknown> = { id, method };
        if (params) {
            message.params = params;
        }
        if (options?.sessionId) {
            message.sessionId = options.sessionId;
        }

        return new Promise<Record<string, unknown>>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`CDP request timed out: ${method} (${timeout}ms)`));
            }, timeout);

            this.pendingRequests.set(id, {
                resolve: (result) => {
                    clearTimeout(timer);
                    resolve(result);
                },
                reject: (err) => {
                    clearTimeout(timer);
                    reject(err);
                },
                method,
            });

            this.ws!.send(JSON.stringify(message));
        });
    }

    addEventListener(listener: CdpMessageListener): void {
        this.eventListeners.push(listener);
    }

    removeEventListener(listener: CdpMessageListener): void {
        const idx = this.eventListeners.indexOf(listener);
        if (idx >= 0) {
            this.eventListeners.splice(idx, 1);
        }
    }

    getAttachedTargets(): Map<string, { targetId: string; sessionId: string; type: string }> {
        return this.attachedTargets;
    }

    getAllTargets(): CdpTarget[] {
        return this.allTargets;
    }

    async refreshTargets(): Promise<CdpTarget[]> {
        if (!this._port) {
            return [];
        }
        this.allTargets = await this.fetchTargets(this._port);
        return this.allTargets;
    }

    disconnect(): void {
        if (this.ws) {
            try {
                this.ws.close();
            } catch {
                // Ignore close errors
            }
            this.ws = null;
        }

        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            pending.reject(new Error('CDP connection closed'));
            this.pendingRequests.delete(id);
        }

        this.attachedTargets.clear();
        this._port = null;
    }

    dispose(): void {
        this.disposed = true;
        this.disconnect();
        this.eventListeners.length = 0;
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    private async findWorkbenchTarget(port: number): Promise<CdpTarget | undefined> {
        const maxAttempts = 40;
        const pollInterval = 500;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const targets = await this.fetchTargets(port);
                this.allTargets = targets;

                const workbench = targets.find(
                    (t) => t.type === 'page' && t.url?.includes('workbench.html'),
                );
                if (workbench) {
                    return workbench;
                }
            } catch {
                // CDP not ready yet
            }

            await new Promise<void>((r) => setTimeout(r, pollInterval));
        }

        return undefined;
    }

    private fetchTargets(port: number): Promise<CdpTarget[]> {
        return new Promise((resolve, reject) => {
            const req = http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
                let data = '';
                res.on('data', (chunk: string) => (data += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data) as CdpTarget[]);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.setTimeout(3000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
        });
    }

    private connectWebSocket(wsUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl, { perMessageDeflate: false });

            ws.on('open', () => {
                this.ws = ws;
                this.setupMessageHandler(ws);
                resolve();
            });

            ws.on('error', (err) => {
                if (!this.ws) {
                    reject(err);
                }
            });

            ws.on('close', () => {
                if (this.ws === ws) {
                    console.log('[CdpClient] WebSocket closed');
                    this.ws = null;
                }
            });
        });
    }

    private setupMessageHandler(ws: WebSocket): void {
        ws.on('message', (data: WebSocket.Data) => {
            let parsed: CdpResponse | CdpEvent;
            try {
                parsed = JSON.parse(data.toString());
            } catch {
                return;
            }

            // Response to a pending request
            if ('id' in parsed && typeof parsed.id === 'number') {
                const pending = this.pendingRequests.get(parsed.id);
                if (pending) {
                    this.pendingRequests.delete(parsed.id);
                    const response = parsed as CdpResponse;
                    if (response.error) {
                        pending.reject(
                            new Error(`CDP error in ${pending.method}: ${response.error.message}`),
                        );
                    } else {
                        pending.resolve(response.result ?? {});
                    }
                }
                return;
            }

            // CDP event
            const event = parsed as CdpEvent;
            if (event.method) {
                this.handleCdpEvent(event);
            }
        });
    }

    private handleCdpEvent(event: CdpEvent): void {
        const { method, params = {}, sessionId } = event;

        // OOPIF auto-attach: track newly attached targets
        if (method === 'Target.attachedToTarget') {
            const targetInfo = params.targetInfo as { targetId: string; type: string } | undefined;
            const newSessionId = params.sessionId as string | undefined;
            if (targetInfo && newSessionId) {
                this.attachedTargets.set(targetInfo.targetId, {
                    targetId: targetInfo.targetId,
                    sessionId: newSessionId,
                    type: targetInfo.type,
                });

                // Enable Runtime on attached target (for frame support)
                this.send('Runtime.enable', undefined, { sessionId: newSessionId }).catch(() => {
                    // Non-critical — some targets don't support Runtime
                });
            }
        }

        if (method === 'Target.detachedFromTarget') {
            const detachedSessionId = params.sessionId as string | undefined;
            if (detachedSessionId) {
                for (const [targetId, info] of this.attachedTargets) {
                    if (info.sessionId === detachedSessionId) {
                        this.attachedTargets.delete(targetId);
                        break;
                    }
                }
            }
        }

        // Notify listeners
        for (const listener of this.eventListeners) {
            try {
                listener(method, params, sessionId);
            } catch {
                // Don't let listener errors break the event loop
            }
        }
    }
}
