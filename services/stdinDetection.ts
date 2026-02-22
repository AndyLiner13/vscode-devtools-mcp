/**
 * Windows Native Stdin Detection using koffi FFI
 * 
 * Detects if a Windows process is waiting for stdin input by inspecting
 * thread states via NtQuerySystemInformation. This provides definitive
 * stdin detection without timing heuristics.
 * 
 * Algorithm (based on psutil and jcode research):
 * 1. Call NtQuerySystemInformation(SystemProcessInformation)
 * 2. Parse SYSTEM_PROCESS_INFORMATION linked list to find target PID
 * 3. Check each thread's ThreadState == Waiting && WaitReason == WrUserRequest
 * 
 * Reference implementations:
 * - psutil: https://github.com/giampaolo/psutil/blob/master/psutil/arch/windows/ntextapi.h
 * - jcode: https://github.com/1jehuang/jcode (stdin_detect.rs)
 */

import * as os from 'os';

// Thread state enum from Windows NT kernel
const KTHREAD_STATE = {
    Initialized: 0,
    Ready: 1,
    Running: 2,
    Standby: 3,
    Terminated: 4,
    Waiting: 5,      // Thread is waiting for something
    Transition: 6,
    DeferredReady: 7,
    GateWait: 8,
} as const;

// Wait reason enum from Windows NT kernel  
// WrUserRequest (13) is the key indicator for stdin waiting
const KWAIT_REASON = {
    Executive: 0,
    FreePage: 1,
    PageIn: 2,
    PoolAllocation: 3,
    DelayExecution: 4,
    Suspended: 5,
    UserRequest: 6,         // User-mode I/O request (stdin!)
    WrExecutive: 7,
    WrFreePage: 8,
    WrPageIn: 9,
    WrPoolAllocation: 10,
    WrDelayExecution: 11,
    WrSuspended: 12,
    WrUserRequest: 13,      // User-mode I/O request (stdin!)
    WrEventPair: 14,
    WrQueue: 15,
    WrLpcReceive: 16,
    WrLpcReply: 17,
    WrVirtualMemory: 18,
    WrPageOut: 19,
    WrRendezvous: 20,
    WrKeyedEvent: 21,
    WrTerminated: 22,
    WrProcessInSwap: 23,
    WrCpuRateControl: 24,
    WrCalloutStack: 25,
    WrKernel: 26,
    WrResource: 27,
    WrPushLock: 28,
    WrMutex: 29,
    WrQuantumEnd: 30,
    WrDispatchInt: 31,
    WrPreempted: 32,
    WrYieldExecution: 33,
    WrFastMutex: 34,
    WrGuardedMutex: 35,
    WrRundown: 36,
    WrAlertByThreadId: 37,
    WrDeferredPreempt: 38,
} as const;

// SystemProcessInformation = 5
const SystemProcessInformation = 5;

// Result type for stdin detection
export interface StdinDetectionResult {
    readonly isWaitingForStdin: boolean;
    readonly threadCount: number;
    readonly waitingThreadCount: number;
    readonly detectedWaitReasons: number[];
    readonly error?: string;
}

// Parsed process entry from NtQuerySystemInformation
interface ProcessEntry {
    pid: number;
    parentPid: number;
    threadCount: number;
    threads: ReadonlyArray<{ threadState: number; waitReason: number }>;
}

// Process tree detection result
export interface ProcessTreeResult {
    readonly hasLiveChildren: boolean;
    readonly childPids: readonly number[];
    readonly commandPid: number | undefined;
    readonly error?: string;
}

// Module state - using any to avoid import() type annotations which are forbidden by eslint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let koffiModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ntdll: any = null;
let NtQuerySystemInformation: ((
    infoClass: number,
    buffer: Uint8Array,
    bufferLength: number,
    returnLength: number[]
) => number) | null = null;

let initialized = false;
let initError: string | null = null;

/**
 * Initialize the koffi FFI and load ntdll.dll
 * Only runs on Windows, fails gracefully on other platforms
 */
async function initializeKoffi(): Promise<void> {
    if (initialized) {
        return;
    }

    if (os.platform() !== 'win32') {
        initError = 'Stdin detection only supported on Windows';
        initialized = true;
        return;
    }

    try {
        // Dynamic import of koffi - using require to avoid TypeScript module issues
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        koffiModule = require('koffi');
        
        // Load ntdll.dll
        ntdll = koffiModule.load('ntdll.dll');
        
        // Define NtQuerySystemInformation signature
        // NTSTATUS NtQuerySystemInformation(
        //   SYSTEM_INFORMATION_CLASS SystemInformationClass,
        //   PVOID SystemInformation,
        //   ULONG SystemInformationLength,
        //   PULONG ReturnLength
        // )
        NtQuerySystemInformation = ntdll.func(
            'NtQuerySystemInformation',
            'int',  // NTSTATUS return
            [
                'int',          // SystemInformationClass
                'void*',        // SystemInformation buffer
                'uint',         // SystemInformationLength
                'uint*'         // ReturnLength output
            ]
        );
        
        initialized = true;
    } catch (err) {
        initError = `Failed to initialize koffi: ${err instanceof Error ? err.message : String(err)}`;
        initialized = true;
    }
}

/**
 * Parse SYSTEM_PROCESS_INFORMATION from raw buffer.
 * Returns PID, parent PID, and thread states.
 *
 * SYSTEM_PROCESS_INFORMATION x64 layout (from psutil ntextapi.h):
 *   Offset  0: ULONG NextEntryOffset
 *   Offset  4: ULONG NumberOfThreads
 *   Offset  8: LARGE_INTEGER[3] SpareLi (24 bytes)
 *   Offset 32: LARGE_INTEGER CreateTime
 *   Offset 40: LARGE_INTEGER UserTime
 *   Offset 48: LARGE_INTEGER KernelTime
 *   Offset 56: UNICODE_STRING ImageName (16 bytes: 2+2+4pad+8ptr)
 *   Offset 72: LONG BasePriority + 4 pad
 *   Offset 80: HANDLE UniqueProcessId (8 bytes)
 *   Offset 88: HANDLE InheritedFromUniqueProcessId (8 bytes)
 *   ...
 *   Offset 184: SYSTEM_THREAD_INFORMATION Threads[]
 */
function parseProcessEntry(buffer: Uint8Array, offset: number): {
    nextEntryOffset: number;
    entry: ProcessEntry;
} {
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
    
    const nextEntryOffset = view.getUint32(0, true);
    const numberOfThreads = view.getUint32(4, true);
    const pid = Number(view.getBigUint64(80, true));
    const parentPid = Number(view.getBigUint64(88, true));
    
    const threadInfoOffset = 184;
    const threadInfoSize = 64;
    
    const threads: Array<{ threadState: number; waitReason: number }> = [];
    
    for (let i = 0; i < numberOfThreads; i++) {
        const threadOffset = offset + threadInfoOffset + (i * threadInfoSize);
        if (threadOffset + threadInfoSize > buffer.length) {
            break;
        }
        
        const threadView = new DataView(buffer.buffer, buffer.byteOffset + threadOffset);
        
        // SYSTEM_THREAD_INFORMATION x64: ThreadState at +48, WaitReason at +52
        const threadState = threadView.getUint32(48, true);
        const waitReason = threadView.getUint32(52, true);
        
        threads.push({ threadState, waitReason });
    }
    
    return {
        nextEntryOffset,
        entry: { pid, parentPid, threadCount: numberOfThreads, threads },
    };
}

// ── Shared Process Table Snapshot ────────────────────────────────────────────

const STATUS_INFO_LENGTH_MISMATCH = 0xC0000004;
const MAX_BUFFER_SIZE = 64 * 1024 * 1024; // 64MB

/**
 * Query NtQuerySystemInformation and build a Map of all processes.
 * This is the single source of truth — all higher-level functions use this.
 */
function snapshotProcessTable(): Map<number, ProcessEntry> | string {
    if (!NtQuerySystemInformation || !koffiModule) {
        return 'NtQuerySystemInformation not initialized';
    }

    let bufferSize = 1024 * 1024;
    let buffer: Uint8Array;
    let returnLength: number[];
    let status: number;

    do {
        buffer = new Uint8Array(bufferSize);
        returnLength = [0];

        status = NtQuerySystemInformation(
            SystemProcessInformation,
            buffer,
            bufferSize,
            returnLength,
        );

        if (status === STATUS_INFO_LENGTH_MISMATCH || (status < 0 && returnLength[0] > bufferSize)) {
            bufferSize = returnLength[0] + 65536;
            if (bufferSize > MAX_BUFFER_SIZE) {
                return 'Buffer size exceeded 64MB limit';
            }
        }
    } while (status === STATUS_INFO_LENGTH_MISMATCH);

    if (status < 0) {
        return `NtQuerySystemInformation failed: 0x${(status >>> 0).toString(16)}`;
    }

    const table = new Map<number, ProcessEntry>();
    let offset = 0;

    while (offset < returnLength[0]) {
        const { nextEntryOffset, entry } = parseProcessEntry(buffer, offset);
        table.set(entry.pid, entry);

        if (nextEntryOffset === 0) {
            break;
        }
        offset += nextEntryOffset;
    }

    return table;
}

// ── Stdin Detection (refactored to use shared snapshot) ─────────────────────

function checkThreadsForStdin(entry: ProcessEntry): { waitingCount: number; reasons: number[] } {
    let waitingCount = 0;
    const reasons: number[] = [];
    
    for (const thread of entry.threads) {
        if (thread.threadState === KTHREAD_STATE.Waiting) {
            if (
                thread.waitReason === KWAIT_REASON.UserRequest ||
                thread.waitReason === KWAIT_REASON.WrUserRequest ||
                thread.waitReason === KWAIT_REASON.WrLpcReceive
            ) {
                waitingCount++;
                reasons.push(thread.waitReason);
            }
        }
    }
    
    return { waitingCount, reasons };
}

/**
 * Check if a process is waiting for stdin input.
 * Uses NtQuerySystemInformation to inspect thread wait states.
 */
export async function isProcessWaitingForStdin(pid: number): Promise<StdinDetectionResult> {
    await initializeKoffi();
    
    if (initError) {
        return { isWaitingForStdin: false, threadCount: 0, waitingThreadCount: 0, detectedWaitReasons: [], error: initError };
    }
    
    try {
        const table = snapshotProcessTable();
        if (typeof table === 'string') {
            return { isWaitingForStdin: false, threadCount: 0, waitingThreadCount: 0, detectedWaitReasons: [], error: table };
        }

        const entry = table.get(pid);
        if (!entry) {
            return { isWaitingForStdin: false, threadCount: 0, waitingThreadCount: 0, detectedWaitReasons: [], error: `Process ${pid} not found` };
        }

        const { waitingCount, reasons } = checkThreadsForStdin(entry);
        return {
            isWaitingForStdin: waitingCount > 0,
            threadCount: entry.threadCount,
            waitingThreadCount: waitingCount,
            detectedWaitReasons: reasons,
        };
    } catch (err) {
        return {
            isWaitingForStdin: false,
            threadCount: 0,
            waitingThreadCount: 0,
            detectedWaitReasons: [],
            error: `Detection failed: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

// ── Process Tree Enumeration (Feature A) ────────────────────────────────────

/**
 * Collect all descendant PIDs of a given parent process (recursive tree walk).
 */
function collectDescendants(rootPid: number, table: Map<number, ProcessEntry>): number[] {
    const descendants: number[] = [];
    const visited = new Set<number>();
    const queue = [rootPid];

    while (queue.length > 0) {
        const parentPid = queue.pop()!;
        if (visited.has(parentPid)) {
            continue;
        }
        visited.add(parentPid);

        for (const [pid, entry] of table) {
            if (entry.parentPid === parentPid && pid !== rootPid && !visited.has(pid)) {
                descendants.push(pid);
                queue.push(pid);
            }
        }
    }

    return descendants;
}

/**
 * Check if a shell process has any live child processes.
 * Also returns the direct child PID (the "command PID") if one exists.
 *
 * This enables:
 * - Definitive completion detection (no children = command done)
 * - More accurate stdin detection (check the command process, not the shell)
 */
export async function getProcessTree(shellPid: number): Promise<ProcessTreeResult> {
    await initializeKoffi();

    if (initError) {
        return { hasLiveChildren: false, childPids: [], commandPid: undefined, error: initError };
    }

    try {
        const table = snapshotProcessTable();
        if (typeof table === 'string') {
            return { hasLiveChildren: false, childPids: [], commandPid: undefined, error: table };
        }

        const childPids = collectDescendants(shellPid, table);

        // The "command PID" is the direct child of the shell
        let commandPid: number | undefined;
        for (const pid of childPids) {
            const entry = table.get(pid);
            if (entry && entry.parentPid === shellPid) {
                commandPid = pid;
                break;
            }
        }

        return {
            hasLiveChildren: childPids.length > 0,
            childPids,
            commandPid,
        };
    } catch (err) {
        return {
            hasLiveChildren: false,
            childPids: [],
            commandPid: undefined,
            error: `Tree detection failed: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

/**
 * Check stdin wait on the deepest leaf process in the tree.
 * More accurate than checking the shell PID since the actual command
 * (e.g. python.exe, node.exe) is the one blocking on stdin.
 */
export async function isTreeWaitingForStdin(shellPid: number): Promise<StdinDetectionResult> {
    await initializeKoffi();

    if (initError) {
        return { isWaitingForStdin: false, threadCount: 0, waitingThreadCount: 0, detectedWaitReasons: [], error: initError };
    }

    try {
        const table = snapshotProcessTable();
        if (typeof table === 'string') {
            return { isWaitingForStdin: false, threadCount: 0, waitingThreadCount: 0, detectedWaitReasons: [], error: table };
        }

        const childPids = collectDescendants(shellPid, table);

        // No children → nothing to check
        if (childPids.length === 0) {
            return { isWaitingForStdin: false, threadCount: 0, waitingThreadCount: 0, detectedWaitReasons: [] };
        }

        // Check all descendant processes for stdin waiting
        for (const pid of childPids) {
            const entry = table.get(pid);
            if (!entry) {
                continue;
            }

            const { waitingCount, reasons } = checkThreadsForStdin(entry);
            if (waitingCount > 0) {
                return {
                    isWaitingForStdin: true,
                    threadCount: entry.threadCount,
                    waitingThreadCount: waitingCount,
                    detectedWaitReasons: reasons,
                };
            }
        }

        return { isWaitingForStdin: false, threadCount: 0, waitingThreadCount: 0, detectedWaitReasons: [] };
    } catch (err) {
        return {
            isWaitingForStdin: false,
            threadCount: 0,
            waitingThreadCount: 0,
            detectedWaitReasons: [],
            error: `Tree stdin detection failed: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

/**
 * Get human-readable wait reason name
 */
export function getWaitReasonName(reason: number): string {
    const names: Record<number, string> = {
        [KWAIT_REASON.Executive]: 'Executive',
        [KWAIT_REASON.FreePage]: 'FreePage',
        [KWAIT_REASON.PageIn]: 'PageIn',
        [KWAIT_REASON.PoolAllocation]: 'PoolAllocation',
        [KWAIT_REASON.DelayExecution]: 'DelayExecution',
        [KWAIT_REASON.Suspended]: 'Suspended',
        [KWAIT_REASON.UserRequest]: 'UserRequest',
        [KWAIT_REASON.WrExecutive]: 'WrExecutive',
        [KWAIT_REASON.WrFreePage]: 'WrFreePage',
        [KWAIT_REASON.WrPageIn]: 'WrPageIn',
        [KWAIT_REASON.WrPoolAllocation]: 'WrPoolAllocation',
        [KWAIT_REASON.WrDelayExecution]: 'WrDelayExecution',
        [KWAIT_REASON.WrSuspended]: 'WrSuspended',
        [KWAIT_REASON.WrUserRequest]: 'WrUserRequest',
        [KWAIT_REASON.WrEventPair]: 'WrEventPair',
        [KWAIT_REASON.WrQueue]: 'WrQueue',
        [KWAIT_REASON.WrLpcReceive]: 'WrLpcReceive',
        [KWAIT_REASON.WrLpcReply]: 'WrLpcReply',
        [KWAIT_REASON.WrVirtualMemory]: 'WrVirtualMemory',
        [KWAIT_REASON.WrPageOut]: 'WrPageOut',
        [KWAIT_REASON.WrRendezvous]: 'WrRendezvous',
        [KWAIT_REASON.WrKeyedEvent]: 'WrKeyedEvent',
        [KWAIT_REASON.WrTerminated]: 'WrTerminated',
    };
    return names[reason] ?? `Unknown(${reason})`;
}

/**
 * Check if stdin detection is available on this platform
 */
export async function isStdinDetectionAvailable(): Promise<boolean> {
    await initializeKoffi();
    return !initError;
}

/**
 * Get initialization error if any
 */
export function getInitError(): string | null {
    return initError;
}
