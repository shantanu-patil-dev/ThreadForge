# ThreadForge v2: An Interactive Multithreading Performance & Race Condition Laboratory

> A production-grade, interactive laboratory built for live college demonstrations, performance engineering, and concurrency pedagogy. Runs real multi-core benchmarks, provable race condition bugs, synchronization primitives, deadlock graph cycle detection, thread pool sizing ergonomics, and Amdahl's Law scaling sweeps directly on your machine.

---

## 1. Problem Statement

Modern computing hardware is massively parallel, yet writing concurrent code remains notoriously difficult and error-prone. Students and engineers frequently memorize concurrency definitions—race conditions, deadlocks, mutexes, thread pools, and the Python GIL—without ever visualizing or measuring them in action. Common misconceptions abound: that adding threads always speeds up code, that race conditions are rare or benign, that deadlock requires complex distributed systems, or that thread pools are just cosmetic abstractions.

**ThreadForge** demystifies concurrency by turning abstract theoretical concepts into real, measurable, and visual experiments. Every experiment is strictly categorized as **REAL** (measured directly against system hardware using high-precision OS timers and multi-core execution) or **SIMULATION** (deterministic pedagogical models demonstrating interleaved access and deadlock graphs).

---

## 2. Learning Objectives

By using ThreadForge in classroom demonstrations and self-paced labs, students will:
1. **Differentiate Concurrency vs. Parallelism:** Understand why CPU-bound tasks in standard CPython experience negative speedup under multithreading due to the Global Interpreter Lock (GIL), while GIL-releasing C extensions (SHA-256/zlib) and multiprocessing achieve true multi-core scaling.
2. **Witness and Fix Data Races:** Provably reproduce shared-state data loss (e.g., $100{,}000$ iterations yielding $\approx 47{,}300$ without synchronization), observe bytecode preemption interleavings, and evaluate the trade-offs of Mutex vs. Atomic protection.
3. **Quantify Synchronization Overhead:** Measure the nanosecond-level costs of lock contention vs. lock-free atomics, thread-local accumulation, and lock striping across variable thread counts.
4. **Detect and Prevent Deadlocks:** Trace dynamic resource acquisition graphs (RAGs), detect circular wait cycles using Depth-First Search (Tarjan's algorithm), evaluate all four Coffman conditions, and demonstrate Dijkstra's total resource ordering prevention.
5. **Optimize Thread Pool Sizing:** Benchmark the latency and memory penalty of spawning raw OS threads per task versus pooling, observing queue wait times under saturation and applying the classic $N_{\text{threads}} = N_{\text{CPU}} \times U_{\text{CPU}} \times (1 + W/C)$ sizing formula.
6. **Empirically Validate Amdahl's Law:** Fit benchmark speedup curves against Amdahl's Law ($S(N) = \frac{1}{(1-p) + p/N}$) to extract the strictly serial fraction ($e$) via the Karp-Flatt metric.

---

## 3. Technology Stack & Architecture

| Tier | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | Python 3.12 + FastAPI | Native OS thread/process management, Pydantic v2 type safety, async SSE streaming, auto-generated OpenAPI. |
| **Concurrency Core** | `threading`, `multiprocessing`, `concurrent.futures` | Native Python runtime primitives demonstrating both OS kernel thread behavior and multi-process IPC. |
| **Frontend Framework** | React 18 + TypeScript + Vite | Predictable unidirectional state, strict typing, lightning-fast HMR and optimized production bundle. |
| **Design System** | Custom Vanilla CSS + Tailwind CSS | Editorial laboratory theme (#FAF9F6 canvas, #14532D forest green, #B7791F brass, #B42318 crimson). **Strictly zero blue or purple.** |
| **Typography** | IBM Plex Sans & IBM Plex Mono | High-legibility technical monospace and sans-serif typefaces suited for data density and instrumentation logs. |
| **Data Visualization** | Custom SVG Gantt & SVG Node Graphs | High-performance, dependency-free SVGs for thread execution timelines and bipartite Resource Allocation Graphs. |

```mermaid
flowchart TD
    subgraph Browser["Frontend Client (Browser: React 18 + TS)"]
        UI["11 Lab Pages / Controls / SVG Timelines"]
        SSEClient["SSE EventSource Stream Receiver"]
        RESTClient["Axios/Fetch HTTP Client"]
    end

    subgraph Server["Single-Port Host (FastAPI @ http://localhost:8000)"]
        SPA["Static Files Mount (frontend/dist)"]
        API["FastAPI REST Endpoints (/api/*)"]
        SSE["SSE Broadcaster (/api/jobs/{id}/stream)"]
        JM["JobManager (Background Daemon Queue)"]
    end

    subgraph Engine["Concurrency Execution Engine"]
        Worker["Task Worker (Thread / Subprocess)"]
        Bench["Benchmark Suite (CPU/IO/GIL/Process)"]
        Race["Race Condition Suite (Mutex/Atomic/SwitchInterval)"]
        Sync["Synchronization Suite (Striping/ThreadLocal)"]
        Dead["Deadlock Suite (TracedLock & Cycle Detection)"]
        Pool["ThreadPool Suite (Queue vs Per-Task)"]
        Scale["Scaling Suite (Amdahl & Karp-Flatt Fit)"]
    end

    subgraph OS["Host Operating System (Windows 11 / Multi-Core)"]
        Cores["12 Hardware Threads / Cores"]
        Kernel["Windows Kernel Thread Scheduler"]
    end

    UI --> RESTClient
    UI --> SSEClient
    RESTClient -->|POST /api/experiments/*| API
    SSEClient -->|GET /api/jobs/{id}/stream| SSE
    API --> JM
    JM --> Worker
    Worker --> Bench & Race & Sync & Dead & Pool & Scale
    Worker -->|Push Progress Events| SSE
    Bench & Race & Sync & Dead & Pool & Scale --> Cores
    Cores --> Kernel
    SPA -->|Serves Production Assets| UI
```

---

## 4. Prerequisites & Windows Setup

### System Prerequisites
- **Operating System:** Windows 10/11 (x64 or ARM64)
- **Python:** Python 3.12+ (Installed via Microsoft Store, Python.org, or winget)
- **Node.js:** Node.js v18+ and npm v9+

> [!NOTE]
> **Windows Execution Policy:**
> If running PowerShell scripts produces an error (`File ... cannot be loaded because running scripts is disabled on this system`), open PowerShell and enable local process execution:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```

---

## 5. One-Command Quickstart

To launch ThreadForge in production single-port mode on `http://localhost:8000`:

### On Windows Command Prompt / PowerShell:
```cmd
start.bat
```

### Alternatively, via npm:
```bash
npm run setup
npm run build
npm run start
```

Open your browser to: **[http://localhost:8000](http://localhost:8000)**

---

## 6. Manual Development Mode (Dual Server)

If you are developing ThreadForge and want live backend hot-reloading and frontend Vite HMR:

### Terminal 1: Backend Server
```powershell
# 1. Activate or create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Start Uvicorn development server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2: Frontend Vite Dev Server
```powershell
cd frontend
npm install
npm run dev
```

Open the Vite development URL: **[http://localhost:5173](http://localhost:5173)** (Proxying `/api` requests to port 8000).

---

## 7. The 11 Laboratory Pages

1. **01 Overview Dashboard:** System topology badge (Cores, OS, Python version, GIL status, base thread count), interactive architecture diagram, live quick-start card, and test launcher.
2. **02 Concurrency Lab:** Visual comparison of Concurrency vs. Parallelism, interactive time-slicing simulation vs. true multi-core parallel execution.
3. **03 Performance Benchmark:** Real benchmarks comparing Wait-bound (sleep), I/O-bound (hash & gzip simulation), CPU-bound (prime factorization under GIL), GIL-releasing native C extensions (SHA-256), and true Multiprocessing.
4. **04 Race Condition:** Shared bank account and counter scenarios. Demonstrates reproducible data race anomalies under variable switch intervals (`sys.setswitchinterval`), compared against Mutex locks and Atomic operations, complete with 20 interleaved execution steps.
5. **05 Synchronization:** Direct performance shootout between No Synchronization, Mutex Lock, Atomic CAS, Thread-Local storage, and Lock Striping (16 shards). Displays latency overhead multipliers and throughput.
6. **06 Deadlock:** Interactive 4-thread / 4-lock simulation. Visualizes Dining Philosophers deadlock, generates live bipartite Resource Allocation Graphs (RAGs), evaluates Coffman's 4 conditions, detects directed cycles, and provides automated recovery (abort lowest-priority thread) and prevention (hierarchical ordering).
7. **07 Thread Pool:** Compares Sequential execution vs. Thread-Per-Task vs. Bounded Worker Pool ($N=4, 8, 16$). Demonstrates kernel thread creation overhead, peak memory footprint, queue latency under saturation, and interactive optimal pool sizing calculation.
8. **08 Timeline Visualizer:** High-resolution SVG Gantt chart plotting thread lifetimes, active execution chunks, lock acquisition wait intervals, and context switches.
9. **09 Scaling Analysis:** Automated worker count sweep ($N=1, 2, 4, 8, 12, 16$). Plots measured speedup vs. theoretical linear speedup, fits Amdahl's Law curve, and calculates the Karp-Flatt serial fraction ($e$).
10. **10 Experiment History:** Local history log of all laboratory runs with parameter snapshots, latency, speedup, and status. Supports RFC 4180 CSV export (with spreadsheet formula injection defense) and JSON import/export.
11. **11 Documentation & Viva Guide:** 20+ comprehensive viva study cards with collapsible answers, an 8-minute classroom presentation itinerary, and academic literature citations.

---

## 8. Guided 8-Minute Live Demo Sequence

Follow this sequence for an engaging, flawless live classroom demonstration:

- **Minute 0:00 - 1:00 (Overview):** Open `http://localhost:8000`. Point out the live hardware environment badge (12 cores detected, GIL active). Walk through the architecture flow.
- **Minute 1:00 - 2:30 (Performance & The GIL):** Navigate to **03 Performance**. Run **CPU-bound (Primes)** across 1, 2, and 4 threads. Point out that execution time *increases* due to GIL thrashing. Then switch workload to **GIL-releasing (SHA-256)** and run with 4 threads; watch execution time drop from $\approx 0.42\text{s}$ to $\approx 0.12\text{s}$ (3.5x speedup).
- **Minute 2:30 - 4:00 (Race Conditions):** Navigate to **04 Race Condition**. Select **Natural Preemption**, 4 threads, 25,000 increments each (expected total: 100,000). Click **Run Experiment**. Observe that the counter stops at $\approx 47{,}300$ ($52\%$ data loss). Switch protection to **Mutex Lock** and rerun: result is exactly 100,000. Switch to **Atomic** and show near-zero synchronization overhead.
- **Minute 4:00 - 5:15 (Synchronization Shootout):** Navigate to **05 Synchronization**. Run 8 threads with 50,000 operations. Compare the overhead: Mutex incurs $\approx 3.8\times$ slowdown over Thread-Local accumulation; Lock Striping maintains $85\%$ of lock-free throughput under high concurrency.
- **Minute 5:15 - 6:30 (Deadlock & Coffman Conditions):** Navigate to **06 Deadlock**. Click **Trigger Circular Deadlock**. The SVG Resource Allocation Graph renders the red cycle between Thread 1, Lock A, Thread 2, and Lock B. The Coffman panel lights up all 4 conditions. Click **Apply Prevention (Order Locks)** and rerun: execution completes in 12ms with zero deadlocks.
- **Minute 6:30 - 7:30 (Thread Pool Sizing):** Navigate to **07 Thread Pool**. Run 100 short tasks comparing Thread-per-Task vs. Thread Pool. Show the $10\times$ reduction in thread creation latency and memory overhead.
- **Minute 7:30 - 8:00 (Scaling & Amdahl's Law):** Navigate to **09 Scaling**. Run worker sweep up to 12 cores. Show the fitted Amdahl's curve and explain how Karp-Flatt identifies serial bottlenecks.

---

## 9. Understanding Metrics & Formulas

- **Wall Clock Time ($T$):** The total elapsed time from the start of the first thread to the termination of the last thread, measured using `time.perf_counter()` (sub-microsecond resolution).
- **CPU Time ($T_{\text{cpu}}$):** The sum of user space and kernel space CPU time consumed by all worker threads, measured using `time.process_time()`.
- **Speedup ($S$):** The ratio of single-thread execution time to multi-thread execution time:
  $$S(N) = \frac{T(1)}{T(N)}$$
- **Parallel Efficiency ($E$):** The proportion of hardware computing resources effectively utilized:
  $$E(N) = \frac{S(N)}{N} \times 100\%$$
- **Amdahl's Law Speedup:**
  $$S(N) = \frac{1}{(1-p) + \frac{p}{N}}$$
  where $p$ is the parallelizable fraction of the task.
- **Karp-Flatt Serial Fraction ($e$):**
  $$e = \frac{\frac{1}{S(N)} - \frac{1}{N}}{1 - \frac{1}{N}}$$
  If $e$ remains constant as $N$ scales, speedup is strictly limited by code serialization. If $e$ increases with $N$, synchronization overhead and lock contention dominate.
- **Synchronization Overhead:** The percentage slowdown compared to unsynchronized baseline:
  $$\text{Overhead} = \frac{T_{\text{sync}} - T_{\text{baseline}}}{T_{\text{baseline}}} \times 100\%$$

---

## 10. Automated Testing & Verification

ThreadForge includes automated test suites covering backend API contracts, experiment logic, and frontend components:

### Backend Pytest Suite (20 Tests)
```bash
.venv\Scripts\python.exe -m pytest backend/tests/ -v
```
Verifies health, limits, experiment execution, race conditions, deadlock detection, thread pool sizing, SSE job management, and 409 conflict controls.

### Frontend Vitest Suite (6 Tests)
```bash
cd frontend
npm test
```
Verifies RFC 4180 CSV export sanitation, color token compliance (verifying absence of blue/purple), TopBar hardware badge rendering, and LabReportCard metrics.

### Automated 9-Point Runtime Verification
With the server running at `http://localhost:8000`:
```bash
python scripts/verify_runtime.py
```
Runs 9 continuous integration checks against the live server:
1. `GET /api/health`
2. `GET /api/environment`
3. `POST /api/experiments/benchmark`
4. `POST /api/experiments/race-condition`
5. `POST /api/experiments/synchronization`
6. `POST /api/experiments/deadlock`
7. `POST /api/experiments/thread-pool`
8. `POST /api/experiments/scaling`
9. `GET /` (SPA index.html validation)

---

## 11. Troubleshooting & FAQ

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Port 8000 already in use** | A dangling process is bound to port 8000. | In PowerShell run: `Get-NetTCPConnection -LocalPort 8000 \| Select-Object OwningProcess` and kill it with `Stop-Process -Id <PID>`. |
| **PowerShell script execution disabled** | Windows security policy restricts execution. | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`. |
| **Smart App Control blocking Python DLL** | Using unsigned or third-party Python binary distributions. | Use official Python 3.12 installed via Microsoft Store (`winget install --id 9NCVDN91XZQP`), which is Authenticode signed by Microsoft. |
| **CPU benchmark shows no speedup** | Standard Python GIL limits Python bytecode to 1 CPU core. | Switch workload to **GIL-releasing (SHA-256)** or **Multiprocessing** in the Concurrency/Benchmark labs. |
| **Windows timer resolution precision** | Standard Windows OS timer has a $\approx 15.6\text{ms}$ tick quantum. | ThreadForge uses `time.perf_counter()` and `time.perf_counter_ns()`, which tap directly into high-resolution hardware counters (QPC). |

---

## 12. Assumptions & Known Limitations

- **CPython GIL:** Unless running free-threaded Python 3.13 (PEP 703), CPython threads share a single Global Interpreter Lock. ThreadForge leverages this to teach students *why* GIL exists and demonstrates native extensions and multiprocessing as the industry solutions.
- **Windows Process Creation (Spawn):** Unlike POSIX systems which support `fork()`, Windows uses the `spawn` method for multiprocessing. Worker functions are structured as top-level picklable functions in `task_worker.py`.
- **System Contention:** Exact benchmark timings can vary based on background OS activity and power throttling. For the cleanest classroom demonstration, connect laptops to AC power.

---

## 13. License

Educational Open-Source License. Developed for computer science undergraduate curricula, operating systems courses, and systems performance engineering labs.
