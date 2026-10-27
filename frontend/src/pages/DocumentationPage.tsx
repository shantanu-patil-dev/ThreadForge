import React, { useState } from 'react';
import { BookOpen, HelpCircle, Check, Clock, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface VivaQuestion {
  q: string;
  a: string;
  category: string;
}

const VIVA_QUESTIONS: VivaQuestion[] = [
  {
    q: 'What is the fundamental difference between a Process and a Thread?',
    a: 'A Process is an independent execution unit with its own virtual address space, file handles, and memory isolation provided by the OS. A Thread is a lightweight dispatch unit within a process that shares code, heap, data segments, and OS resources with peer threads, but retains its own register state and execution call stack.',
    category: 'Fundamentals',
  },
  {
    q: 'What is the distinction between Concurrency and Parallelism?',
    a: 'Concurrency is the composition of independently executing processes/threads (handling multiple things at once via interleaved execution or time-slicing). Parallelism is the simultaneous execution of multiple computational tasks at the exact same physical instant on multiple distinct CPU cores.',
    category: 'Fundamentals',
  },
  {
    q: 'What is a Race Condition, and why does shared mutable state cause it?',
    a: 'A race condition occurs when two or more concurrent threads access shared mutable data and attempt to modify it simultaneously without adequate synchronization. Because read-modify-write operations (such as counter += 1) compile into multiple machine instructions, thread preemption between a read and a write leads to lost updates or corrupt data.',
    category: 'Race Conditions',
  },
  {
    q: 'What constitutes a Critical Section?',
    a: 'A critical section is a sequence of instructions accessing shared resources (such as shared memory, files, or hardware devices) that must not be concurrently executed by more than one thread at any given time to preserve invariants.',
    category: 'Synchronization',
  },
  {
    q: 'How does a Mutex protect shared mutable state?',
    a: 'A Mutex (mutual exclusion lock) enforces that only one thread can hold the lock at any time. Any other thread attempting to acquire the locked mutex is placed into a blocked/wait state by the OS scheduler until the owner releases the mutex, strictly serializing access to the critical section.',
    category: 'Synchronization',
  },
  {
    q: 'What is an Atomic Operation?',
    a: 'An atomic operation executes as a single, indivisible step from the perspective of all other threads. It either completes in its entirety or does not happen at all; no intermediate state is observable by peer threads.',
    category: 'Synchronization',
  },
  {
    q: 'Does Python have a language-level atomic integer?',
    a: 'No. Python language specifications do not guarantee atomic integer arithmetic. However, in CPython, certain C-level opcodes (like itertools.count().__next__) execute atomically under the Global Interpreter Lock as an implementation detail, NOT a language guarantee.',
    category: 'Python Concurrency',
  },
  {
    q: 'What is the Python Global Interpreter Lock (GIL)?',
    a: 'The GIL is a mutual exclusion lock used by the CPython interpreter to synchronize thread execution and protect internal memory management (reference counts). It permits only one native thread to execute Python bytecode at a time, preventing multi-threaded speedups on pure-Python CPU-bound tasks.',
    category: 'Python Concurrency',
  },
  {
    q: 'When does Python multithreading actually accelerate execution?',
    a: 'Multithreading accelerates tasks that are I/O-bound (network requests, disk access, database queries, sleep delays) because threads release the GIL while waiting. Additionally, multithreading accelerates C extensions (such as hashlib, zlib, NumPy, or OpenCV) that explicitly release the GIL during heavy computation.',
    category: 'Python Concurrency',
  },
  {
    q: 'What are the four Coffman Conditions required for Deadlock?',
    a: '1) Mutual Exclusion (resources cannot be shared); 2) Hold and Wait (processes hold allocated resources while requesting others); 3) No Preemption (resources cannot be forcibly taken); 4) Circular Wait (a closed chain of processes exists where each waits for a resource held by the next).',
    category: 'Deadlock',
  },
  {
    q: 'How can Deadlock be prevented architecturally?',
    a: 'By breaking at least one Coffman condition: enforcing a strict global lock acquisition ordering breaks Circular Wait; acquiring all needed locks atomically breaks Hold and Wait; and using timeouts with backoff breaks No Preemption.',
    category: 'Deadlock',
  },
  {
    q: 'What is a Resource Allocation Graph (RAG)?',
    a: 'A directed graph where vertices represent processes/threads and resources. Directed edges from a process to a resource represent resource requests; directed edges from a resource to a process represent resource ownership. A directed cycle in a single-instance RAG indicates deadlock.',
    category: 'Deadlock',
  },
  {
    q: 'What is a Thread Pool and what problem does it solve?',
    a: 'A thread pool manages a pre-allocated collection of reusable worker threads alongside a task queue. It eliminates the latency and OS kernel overhead of spawning and destroying a new thread for every individual task, and caps total active threads to prevent memory exhaustion and thrashing.',
    category: 'Thread Pools',
  },
  {
    q: 'What is Amdahl’s Law?',
    a: 'Amdahl’s Law models the theoretical maximum speedup of a program when using p parallel processors: Speedup = 1 / (s + (1 - s)/p), where s is the proportion of execution time spent on serial (unparallelizable) operations. It proves that maximum speedup is bounded by 1/s regardless of core count.',
    category: 'Scaling & Performance',
  },
  {
    q: 'What is the Karp-Flatt Metric?',
    a: 'The Karp-Flatt metric computes the empirical serial fraction (e) from measured speedup (S) and processor count (p): e = ((1/S) - (1/p)) / (1 - (1/p)). If e increases with processor count, it signals that scheduling, synchronization, and communication overheads are dominating.',
    category: 'Scaling & Performance',
  },
  {
    q: 'What is the difference between Speedup and Efficiency?',
    a: 'Speedup is the ratio of sequential execution time to concurrent execution time (T1 / Tp). Efficiency is the speedup divided by the number of worker cores (Speedup / p), measuring how effectively each additional hardware worker is utilized (ideal is 1.0 or 100%).',
    category: 'Scaling & Performance',
  },
  {
    q: 'Why is multiprocessing.spawn slower than fork on Windows?',
    a: 'On Windows, multiprocessing does not support fork(). Instead, it creates a fresh Python interpreter process via spawn, imports the main module, and pickles data across IPC channels. This imposes a baseline startup cost (~100-300 ms) before steady-state task execution begins.',
    category: 'Python Concurrency',
  },
  {
    q: 'What is Lock Striping?',
    a: 'Lock striping partitions a single shared data structure into multiple independent segments, each guarded by its own separate mutex. Concurrent threads accessing different buckets or stripes execute in parallel without contending for a single global lock.',
    category: 'Synchronization',
  },
  {
    q: 'Why does Thread-Local Accumulation outperform Mutex synchronization?',
    a: 'Thread-local accumulation eliminates contention entirely during computation: each worker thread increments an isolated, thread-private variable in its own cache line without synchronization. A single global lock or reduction is executed only once at task completion.',
    category: 'Synchronization',
  },
  {
    q: 'What is the difference between a REAL trace and a SIMULATION model in ThreadForge?',
    a: 'A REAL trace measures actual nanosecond timestamps (time.perf_counter_ns()) captured from genuine operating system threads executing on your physical CPU. A SIMULATION model is a deterministic, step-by-step mathematical state machine used to illustrate conceptual interleavings.',
    category: 'Fundamentals',
  },
];

export const DocumentationPage: React.FC = () => {
  const [activeVivaCategory, setActiveVivaCategory] = useState('All');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const categories = ['All', 'Fundamentals', 'Race Conditions', 'Synchronization', 'Deadlock', 'Thread Pools', 'Python Concurrency', 'Scaling & Performance'];

  const filteredViva = VIVA_QUESTIONS.filter(
    (q) => activeVivaCategory === 'All' || q.category === activeVivaCategory
  );

  const toggleReveal = (idx: number) => {
    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <span className="text-xs font-mono text-secondary uppercase">
          Documentation 11 • Knowledge Base & Viva Defense
        </span>
        <h2 className="text-xl font-bold text-heading mt-1">
          Concurrency Theory, Viva Preparation & Demo Protocol
        </h2>
        <p className="text-xs text-secondary mt-1">
          Comprehensive engineering explanations, official references, 20-question viva quiz, and professor demonstration sequence.
        </p>
      </div>

      {/* 8-Minute Professor Demo Protocol */}
      <div className="bg-card border-2 border-primary rounded p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-border pb-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-heading font-mono">
            8-Minute Live Professor Demonstration Script
          </h3>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <div className="p-3 bg-paper rounded border border-border">
            <div className="font-bold text-heading">Minute 0:00 - 1:30 • Hardware Environment & Foundations</div>
            <div className="text-secondary mt-1 leading-relaxed">
              Open <strong>Overview Dashboard (01)</strong>. Point out the detected real hardware specs: physical core count,
              Python version (3.12+), and active GIL status. Emphasize that all numbers in ThreadForge come from live API responses on this machine.
            </div>
          </div>

          <div className="p-3 bg-paper rounded border border-border">
            <div className="font-bold text-heading">Minute 1:30 - 3:00 • The GIL & Multithreading Speedup</div>
            <div className="text-secondary mt-1 leading-relaxed">
              Navigate to <strong>Performance Benchmark (03)</strong>. Run wait-bound workload to demonstrate ~3.8x speedup on 4 threads.
              Then switch to pure-Python CPU work to show that speedup drops to ~0.9x due to the GIL. Finally, run GIL-releasing SHA-256 work to prove C extensions achieve true parallelism.
            </div>
          </div>

          <div className="p-3 bg-paper rounded border border-border">
            <div className="font-bold text-heading">Minute 3:00 - 4:30 • Race Conditions (Real & Simulation)</div>
            <div className="text-secondary mt-1 leading-relaxed">
              Open <strong>Race Condition Lab (04)</strong>. Run REAL tab with Amplified window to show ~20-50% lost updates.
              Switch to Mutex to show 100% correctness. Then open the SIMULATION tab to walk through the 20 mathematical interleavings.
            </div>
          </div>

          <div className="p-3 bg-paper rounded border border-border">
            <div className="font-bold text-heading">Minute 4:30 - 6:00 • Synchronization Overhead & Deadlock</div>
            <div className="text-secondary mt-1 leading-relaxed">
              Open <strong>Synchronization (05)</strong> to highlight the 'FAST BUT WRONG' badge on unsynchronized counters and show Thread-Local accumulation running fastest.
              Then switch to <strong>Deadlock Playground (06)</strong> to demonstrate the live Resource Allocation Graph cycle and Coffman conditions.
            </div>
          </div>

          <div className="p-3 bg-paper rounded border border-border">
            <div className="font-bold text-heading">Minute 6:00 - 7:15 • Thread Pool Latency & Amdahl Scaling</div>
            <div className="text-secondary mt-1 leading-relaxed">
              Navigate to <strong>Thread Pool Optimizer (07)</strong> to show the real kernel thread creation microbenchmark (~20 µs).
              Then open <strong>Scaling Analyzer (09)</strong> to demonstrate Amdahl's Law serial-fraction curve fit.
            </div>
          </div>

          <div className="p-3 bg-paper rounded border border-border">
            <div className="font-bold text-heading">Minute 7:15 - 8:00 • Timeline & RFC 4180 History Export</div>
            <div className="text-secondary mt-1 leading-relaxed">
              Open <strong>Thread Timeline (08)</strong> to inspect the live SVG Gantt chart and task inspector.
              Open <strong>Experiment History (10)</strong>, demonstrate side-by-side comparison with environment check, and click Export CSV with formula injection defense.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Viva Flashcard Self-Quiz */}
      <div className="bg-card border border-border rounded p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-heading" />
            <h3 className="text-sm font-bold text-heading font-mono">
              Viva Preparation Self-Quiz ({VIVA_QUESTIONS.length} Questions)
            </h3>
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap gap-1 text-[11px] font-mono">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveVivaCategory(c)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeVivaCategory === c
                    ? 'bg-panel font-bold text-heading border border-border'
                    : 'text-secondary hover:text-heading'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredViva.map((item, idx) => {
            const isRevealed = revealedAnswers[idx];
            return (
              <div
                key={idx}
                className="bg-paper border border-border rounded p-3 text-xs font-mono space-y-2"
              >
                <div
                  onClick={() => toggleReveal(idx)}
                  className="flex items-start justify-between cursor-pointer text-heading font-semibold hover:text-primary transition-colors"
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-secondary shrink-0">Q{idx + 1}.</span>
                    <span>{item.q}</span>
                  </div>
                  <span className="text-secondary ml-2 shrink-0">
                    {isRevealed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                </div>

                {isRevealed && (
                  <div className="pl-6 pt-2 border-t border-border/70 text-secondary leading-relaxed">
                    <span className="text-heading font-bold block mb-1">Answer:</span>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Documentation References */}
      <div className="bg-card border border-border rounded p-5 space-y-3 font-mono text-xs">
        <h3 className="text-sm font-bold text-heading border-b border-border pb-2">
          Official Documentation References
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-secondary">
          <a
            href="https://docs.python.org/3/library/threading.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 p-2 bg-paper rounded border border-border hover:text-heading"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
            <span>Python threading — Thread-based parallelism</span>
          </a>
          <a
            href="https://docs.python.org/3/library/concurrent.futures.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 p-2 bg-paper rounded border border-border hover:text-heading"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
            <span>Python concurrent.futures — Process & Thread pools</span>
          </a>
          <a
            href="https://docs.python.org/3/library/multiprocessing.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 p-2 bg-paper rounded border border-border hover:text-heading"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
            <span>Python multiprocessing — Spawn context on Windows</span>
          </a>
          <a
            href="https://fastapi.tiangolo.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 p-2 bg-paper rounded border border-border hover:text-heading"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
            <span>FastAPI — High performance async framework</span>
          </a>
        </div>
      </div>
    </div>
  );
};
