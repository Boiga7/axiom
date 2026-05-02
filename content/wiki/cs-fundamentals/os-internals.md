---
type: concept
category: cs-fundamentals
para: resource
tags: [operating-systems, processes, threads, memory, scheduling, performance]
tldr: OS behaviour that explains production failures — processes vs threads, virtual memory, CPU scheduling, file systems, and what OOM kills and context switches actually cost.
updated: 2026-05-02
---

# OS Internals

The Linux fundamentals page covers how to use the OS. This page covers how it behaves, and why that behaviour explains crashes, slowdowns, and the limits of your application.

## Processes vs Threads

A **process** is an isolated execution environment: its own virtual address space, file descriptor table, and resource accounting. Processes cannot read each other's memory without IPC.

A **thread** is an execution context within a process. Threads share the same address space, heap, and file descriptors. This is why a thread crash (segfault, unhandled exception in some languages) kills the entire process, and why threads can corrupt each other's data without explicit synchronisation.

| Property | Process | Thread |
|---|---|---|
| Memory | Separate virtual address space | Shared with other threads in process |
| Creation cost | High (fork: copies page tables) | Low (allocates stack, registers) |
| Communication | IPC (pipes, sockets, shared mem) | Direct memory access (needs locking) |
| Failure isolation | Crash stays isolated | Crash kills all threads in process |
| Context switch cost | High (TLB flush, address space swap) | Low (same address space) |

**Python GIL note:** CPython has a Global Interpreter Lock that prevents true parallel execution of Python bytecode across threads. CPU-bound work should use `multiprocessing` (separate processes). IO-bound work can use threads or `asyncio` (cooperative concurrency without OS threads).

**In practice:** A web server running four worker processes is more crash-isolated than four threads. A single segfault in one process does not kill the others. But inter-process communication is slower than shared memory across threads.

## Virtual Memory

The OS gives every process the illusion of having the entire address space (0 to 2^64 on 64-bit systems). Physical RAM is mapped to virtual addresses via **page tables**. Pages are 4 KB by default.

```
Process virtual address space:
┌──────────────────┐ high addresses
│   Kernel space   │  (not accessible to user programs)
├──────────────────┤
│     Stack        │  grows downward (function frames, local vars)
│        ↓         │
│                  │
│        ↑         │
│     Heap         │  grows upward (malloc/new allocations)
├──────────────────┤
│  BSS (uninit)    │  uninitialized globals
│  Data (init)     │  initialized globals
│  Text (code)     │  executable instructions (read-only)
└──────────────────┘ low addresses
```

**Stack overflow** happens when function calls nest too deeply (infinite recursion), growing the stack until it hits the OS guard page.

**Heap fragmentation** happens when many small allocations and frees leave unusable gaps. `malloc` cannot return a 1 MB contiguous block if the heap is fragmented into sub-MB chunks.

**Page faults** happen when a virtual address is accessed that has no physical page yet mapped. The OS allocates a page on the first access (demand paging). A page fault is ~microseconds for a fresh page, potentially milliseconds if the page was swapped to disk.

**Swap** extends available memory by using disk as overflow. A process hitting swap behaves as if it suddenly has 100x slower memory — this is the mechanism behind "works fine in development, grinds to a halt in production under load."

**OOM Kill:** When physical memory plus swap is exhausted, the kernel's OOM killer selects a process to kill. It uses a heuristic (large memory, no privilege, recently started). Your application may be killed to free memory for another process. The log line looks like: `Out of memory: Kill process <pid> (python) score 847 or sacrifice child`. Containers add their own OOM kills when the container exceeds its `memory` limit — the container dies and restarts (if configured), often silently.

## CPU Scheduling

The kernel scheduler decides which thread runs on which CPU core. Modern Linux uses **CFS** (Completely Fair Scheduler): each runnable thread gets CPU time proportional to its weight (priority).

**Context switch:** Switching from one thread to another saves the current thread's register state (instruction pointer, stack pointer, general registers) and restores the next thread's state. Cost: ~1–10 μs. At 10,000 threads competing for 8 cores, context switch overhead becomes measurable.

**Preemption:** The kernel can interrupt a running thread at any time (every few milliseconds) to give CPU time to another. This is why sleep(0) can release the CPU, and why tight loops without yielding can starve other threads.

**Priority:** `nice` values (-20 to +19, lower = higher priority) adjust how much CPU time CFS gives a thread. `ionice` does the same for disk IO. Setting CPU-bound background jobs to `nice 19` prevents them from impacting latency-sensitive foreground services.

**CPU affinity:** Pinning a process to specific cores (`taskset`) avoids cache invalidation from migration. High-throughput systems (Redis, network handlers) often pin to cores for this reason.

## File Systems

A file system provides the abstraction of named, persistent data stored in directories.

**Inode:** Every file and directory has an inode — a data structure holding metadata (permissions, timestamps, owner, size, block pointers). The filename is stored in the directory, which maps names to inode numbers. This is why a hard link (multiple names pointing to the same inode) has no additional space cost.

**Journal:** Modern file systems (ext4, XFS, APFS) use a journal — a log of pending changes written before applying them to the main structure. On a crash, the journal is replayed to restore consistency. Without journaling, a crash mid-write could corrupt the file system directory tree.

**Page cache:** The kernel caches file contents in memory (the page cache). Reading the same file twice is fast because the second read hits cache. `echo 3 > /proc/sys/vm/drop_caches` drops this cache — sometimes used in benchmarking to get cold-start measurements.

**File descriptors:** Each open file is a file descriptor (integer index into a per-process table). The OS default limit is often 1,024 per process. High-concurrency servers (databases, web servers) need this raised: `ulimit -n 65536`. Exhausting the FD limit causes `Too many open files` errors.

## What This Means in Production

| Symptom | OS-level cause |
|---|---|
| Process killed with no exception | OOM kill — check `dmesg` or `journalctl -k` |
| Memory grows forever, never shrinks | Heap fragmentation or memory leak |
| Service slow under high connection count | Context switch overhead (too many threads) |
| Disk reads fast initially, then slow | Page cache evicted under memory pressure |
| `ulimit` errors in logs | File descriptor exhaustion |
| Service runs fine locally, crashes in container | Container memory limit lower than expected; OOM kill |
| Python CPU-bound code not scaling with threads | GIL — use multiprocessing |

## Common Failure Cases

**Container OOM-killed silently, pod restarts look healthy**  
Why: the container exceeds its Kubernetes `memory` limit; the kernel kills it with SIGKILL (no exception); Kubernetes restarts it; `CrashLoopBackOff` or restart count climbs without an application error log.  
Detect: `kubectl describe pod <name>` shows `OOMKilled` in `Last State`; `dmesg` or `journalctl -k` shows `Kill process`.  
Fix: increase the container memory limit or find and fix the memory leak; use `memory_profiler` or heap dump to identify the allocation site.

**Thread pool exhaustion under load: requests queue forever**  
Why: thread count exceeded OS or application limits; context switch overhead plus scheduling latency means no thread makes progress.  
Detect: p99 latency climbs linearly with concurrency; `top` shows high `sy` (system) CPU; thread count exceeds `ulimit -u`.  
Fix: switch CPU-bound work to `ProcessPoolExecutor`; switch IO-bound work to `asyncio`; reduce thread count to 2-4x CPU cores.

**File descriptor leak causes `Too many open files` after hours of uptime**  
Why: files, sockets, or database connections are opened but never closed (missing `close()` or `with` block); FD count creeps up to the `ulimit -n` limit.  
Detect: `lsof -p <pid> | wc -l` grows over time without levelling off; error appears in logs hours after startup, not at launch.  
Fix: use context managers (`with open(...)`) for all file and socket access; add `lsof` monitoring to alert when FD count exceeds 80% of the limit.

**Swap thrashing makes service appear alive but unresponsive**  
Why: working set exceeds physical RAM; pages are swapped to disk; each memory access triggers a 10ms page fault instead of a 100ns cache hit.  
Detect: `vmstat 1` shows non-zero `si`/`so` columns (swap in/out); process response time is 100x slower than expected; CPU `wa` (IO wait) is high.  
Fix: reduce working set (tune caches, reduce concurrency); add RAM; set `vm.swappiness=10` to make the kernel prefer evicting page cache over swapping application pages.

**Stack overflow in production kills worker silently**  
Why: deeply recursive function (tree traversal, parser, recursive retry) hits the default 8 MB stack limit; the OS sends SIGSEGV; the process dies without a Python traceback.  
Detect: worker disappears without an exception in the application log; `dmesg` shows segfault at the process address.  
Fix: convert recursion to an explicit stack (iterative); increase `ulimit -s` as a temporary measure; add recursion depth guards.

## Connections

- [[cs-fundamentals/linux-fundamentals]] — the tools for observing OS behaviour
- [[cs-fundamentals/concurrency]] — threads, locks, and race conditions in application code
- [[cs-fundamentals/performance-optimisation-se]] — profiling CPU and memory
- [[cs-fundamentals/debugging-systems]] — reading kernel messages and OOM logs
- [[cloud/kubernetes]] — containers add another layer above OS processes (cgroups, namespaces)
- [[cs-fundamentals/python-async-patterns]] — asyncio as an alternative to threads for IO workloads

## Open Questions

- At what concurrency level does the GIL become the actual bottleneck vs IO wait? Is there a practical threshold?
- How do NUMA architectures change the CPU affinity guidance for multi-socket servers?
