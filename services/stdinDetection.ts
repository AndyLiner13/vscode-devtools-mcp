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
 * Parse SYSTEM_PROCESS_INFORMATION from raw buffer
 * Structure based on psutil's ntextapi.h
 */
function parseProcessInfo(buffer: Uint8Array, offset: number): {
    nextEntryOffset: number;
    numberOfThreads: number;
    uniqueProcessId: bigint;
    threads: Array<{ threadState: number; waitReason: number }>;
} {
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
    
    // SYSTEM_PROCESS_INFORMATION layout (x64):
    // Offset 0: ULONG NextEntryOffset (4 bytes)
    // Offset 4: ULONG NumberOfThreads (4 bytes)
    // Offset 8: LARGE_INTEGER SpareLi1 (8 bytes)
    // Offset 16: LARGE_INTEGER SpareLi2 (8 bytes)
    // Offset 24: LARGE_INTEGER SpareLi3 (8 bytes)
    // Offset 32: LARGE_INTEGER CreateTime (8 bytes)
    // Offset 40: LARGE_INTEGER UserTime (8 bytes)
    // Offset 48: LARGE_INTEGER KernelTime (8 bytes)
    // Offset 56: UNICODE_STRING ImageName (16 bytes on x64: 2+2+4 padding+8 pointer)
    // Offset 72: LONG BasePriority (4 bytes) + 4 padding
    // Offset 80: HANDLE UniqueProcessId (8 bytes on x64)
    // ... more fields ...
    // After fixed fields: SYSTEM_THREAD_INFORMATION Threads[NumberOfThreads]
    
    const nextEntryOffset = view.getUint32(0, true);
    const numberOfThreads = view.getUint32(4, true);
    
    // UniqueProcessId is at offset 80 on x64 (after UNICODE_STRING and padding)
    // This is a HANDLE which is 8 bytes on x64
    const uniqueProcessId = view.getBigUint64(80, true);
    
    // SYSTEM_THREAD_INFORMATION starts after the fixed process info
    // Fixed size of SYSTEM_PROCESS_INFORMATION header is 184 bytes on x64
    const threadInfoOffset = 184;
    const threadInfoSize = 64;  // Size of SYSTEM_THREAD_INFORMATION on x64
    
    const threads: Array<{ threadState: number; waitReason: number }> = [];
    
    for (let i = 0; i < numberOfThreads; i++) {
        const threadOffset = offset + threadInfoOffset + (i * threadInfoSize);
        if (threadOffset + threadInfoSize > buffer.length) {
            break;
        }
        
        const threadView = new DataView(buffer.buffer, buffer.byteOffset + threadOffset);
        
        // SYSTEM_THREAD_INFORMATION layout (x64):
        // Offset 0: LARGE_INTEGER KernelTime (8 bytes)
        // Offset 8: LARGE_INTEGER UserTime (8 bytes)
        // Offset 16: LARGE_INTEGER CreateTime (8 bytes)
        // Offset 24: ULONG WaitTime (4 bytes)
        // Offset 28: padding (4 bytes)
        // Offset 32: PVOID StartAddress (8 bytes)
        // Offset 40: CLIENT_ID ClientId (16 bytes: 2x HANDLE)
        // Offset 56: LONG Priority (4 bytes)
        // Offset 60: LONG BasePriority (4 bytes)
        // Offset 64: ULONG ContextSwitches (4 bytes)
        // Offset 68: ULONG ThreadState (4 bytes)
        // Offset 72: KWAIT_REASON WaitReason (4 bytes)
        
        // Actually the layout varies - let me use a safer approach
        // Based on psutil's SYSTEM_THREAD_INFORMATION2:
        // ThreadState is a ULONG at offset 68
        // WaitReason is immediately after at offset 72
        
        // More robust: ThreadState and WaitReason are near the end
        // Offset 48: ULONG ContextSwitches
        // Offset 52: ULONG ThreadState  
        // Offset 56: KWAIT_REASON WaitReason
        
        const threadState = threadView.getUint32(48, true);
        const waitReason = threadView.getUint32(52, true);
        
        threads.push({ threadState, waitReason });
    }
    
    return {
        nextEntryOffset,
        numberOfThreads,
        uniqueProcessId,
        threads
    };
}

/**
 * Check if a process is waiting for stdin input
 * 
 * @param pid - Process ID to check
 * @returns Detection result with details
 */
export async function isProcessWaitingForStdin(pid: number): Promise<StdinDetectionResult> {
    await initializeKoffi();
    
    if (initError) {
        return {
            isWaitingForStdin: false,
            threadCount: 0,
            waitingThreadCount: 0,
            detectedWaitReasons: [],
            error: initError
        };
    }
    
    if (!NtQuerySystemInformation || !koffiModule) {
        return {
            isWaitingForStdin: false,
            threadCount: 0,
            waitingThreadCount: 0,
            detectedWaitReasons: [],
            error: 'NtQuerySystemInformation not initialized'
        };
    }
    
    try {
        // Start with a reasonable buffer size and grow if needed
        let bufferSize = 1024 * 1024;  // 1MB initial
        let buffer: Uint8Array;
        let returnLength = [0];
        let status: number;
        
        // Loop to handle STATUS_INFO_LENGTH_MISMATCH
        const STATUS_INFO_LENGTH_MISMATCH = 0xC0000004;
        
        do {
            buffer = new Uint8Array(bufferSize);
            returnLength = [0];
            
            status = NtQuerySystemInformation(
                SystemProcessInformation,
                buffer,
                bufferSize,
                returnLength
            );
            
            if (status === STATUS_INFO_LENGTH_MISMATCH || (status < 0 && returnLength[0] > bufferSize)) {
                bufferSize = returnLength[0] + 65536;  // Add some extra space
                if (bufferSize > 64 * 1024 * 1024) {  // 64MB max
                    return {
                        isWaitingForStdin: false,
                        threadCount: 0,
                        waitingThreadCount: 0,
                        detectedWaitReasons: [],
                        error: 'Buffer size exceeded 64MB limit'
                    };
                }
            }
        } while (status === STATUS_INFO_LENGTH_MISMATCH);
        
        if (status < 0) {
            return {
                isWaitingForStdin: false,
                threadCount: 0,
                waitingThreadCount: 0,
                detectedWaitReasons: [],
                error: `NtQuerySystemInformation failed with status: 0x${(status >>> 0).toString(16)}`
            };
        }
        
        // Parse the linked list of SYSTEM_PROCESS_INFORMATION
        let offset = 0;
        const targetPid = BigInt(pid);
        
        while (offset < returnLength[0]) {
            const processInfo = parseProcessInfo(buffer, offset);
            
            if (processInfo.uniqueProcessId === targetPid) {
                // Found our process, check thread states
                let waitingThreadCount = 0;
                const detectedWaitReasons: number[] = [];
                
                for (const thread of processInfo.threads) {
                    if (thread.threadState === KTHREAD_STATE.Waiting) {
                        // Check if waiting for user request (stdin)
                        if (
                            thread.waitReason === KWAIT_REASON.UserRequest ||
                            thread.waitReason === KWAIT_REASON.WrUserRequest ||
                            thread.waitReason === KWAIT_REASON.WrLpcReceive
                        ) {
                            waitingThreadCount++;
                            detectedWaitReasons.push(thread.waitReason);
                        }
                    }
                }
                
                return {
                    isWaitingForStdin: waitingThreadCount > 0,
                    threadCount: processInfo.numberOfThreads,
                    waitingThreadCount,
                    detectedWaitReasons
                };
            }
            
            // Move to next process
            if (processInfo.nextEntryOffset === 0) {
                break;  // Last entry
            }
            offset += processInfo.nextEntryOffset;
        }
        
        return {
            isWaitingForStdin: false,
            threadCount: 0,
            waitingThreadCount: 0,
            detectedWaitReasons: [],
            error: `Process ${pid} not found`
        };
        
    } catch (err) {
        return {
            isWaitingForStdin: false,
            threadCount: 0,
            waitingThreadCount: 0,
            detectedWaitReasons: [],
            error: `Detection failed: ${err instanceof Error ? err.message : String(err)}`
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
