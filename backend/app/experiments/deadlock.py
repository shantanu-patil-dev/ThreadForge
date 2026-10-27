import time
import threading
from typing import Dict, Any, List, Set, Optional, Tuple
from backend.app.schemas.base import DeadlockMode, TraceEventKind
from backend.app.schemas.experiment_inputs import DeadlockInput
from backend.app.schemas.experiment_results import (
    DeadlockResult, ResourceGraphNode, ResourceGraphEdge, CoffmanState
)
from backend.app.services.instrumentation import TraceRecorder

class LockRegistry:
    def __init__(self):
        self._mutex = threading.Lock()
        self.lock_owners: Dict[str, Optional[str]] = {}  # lock_id -> task_id
        self.lock_waiters: Dict[str, Set[str]] = {}      # lock_id -> set of task_ids

    def register_lock(self, lock_id: str):
        with self._mutex:
            self.lock_owners[lock_id] = None
            self.lock_waiters[lock_id] = set()

    def record_wait(self, lock_id: str, task_id: str):
        with self._mutex:
            if lock_id in self.lock_waiters:
                self.lock_waiters[lock_id].add(task_id)

    def record_acquired(self, lock_id: str, task_id: str):
        with self._mutex:
            if lock_id in self.lock_waiters:
                self.lock_waiters[lock_id].discard(task_id)
            self.lock_owners[lock_id] = task_id

    def record_released(self, lock_id: str, task_id: str):
        with self._mutex:
            if self.lock_owners.get(lock_id) == task_id:
                self.lock_owners[lock_id] = None

    def get_snapshot(self) -> Tuple[Dict[str, Optional[str]], Dict[str, Set[str]]]:
        with self._mutex:
            owners = dict(self.lock_owners)
            waiters = {k: set(v) for k, v in self.lock_waiters.items()}
            return owners, waiters

class TracedLock:
    def __init__(self, lock_id: str, registry: LockRegistry, recorder: TraceRecorder):
        self.lock_id = lock_id
        self.registry = registry
        self.recorder = recorder
        self._lock = threading.Lock()
        self.registry.register_lock(lock_id)

    def acquire(self, task_id: str, timeout_seconds: float = 2.0) -> bool:
        self.registry.record_wait(self.lock_id, task_id)
        self.recorder.record(0, task_id, TraceEventKind.WAITING, meta={"lock": self.lock_id})
        
        acquired = self._lock.acquire(timeout=timeout_seconds)
        if acquired:
            self.registry.record_acquired(self.lock_id, task_id)
            self.recorder.record(0, task_id, TraceEventKind.ACQUIRED, meta={"lock": self.lock_id})
        else:
            self.recorder.record(0, task_id, TraceEventKind.FAILED, meta={"lock": self.lock_id, "reason": "timeout"})
        return acquired

    def release(self, task_id: str):
        self.registry.record_released(self.lock_id, task_id)
        self.recorder.record(0, task_id, TraceEventKind.RELEASED, meta={"lock": self.lock_id})
        try:
            self._lock.release()
        except RuntimeError:
            pass

def detect_cycles_in_rag(
    owners: Dict[str, Optional[str]], 
    waiters: Dict[str, Set[str]]
) -> Tuple[bool, List[str], List[ResourceGraphEdge]]:
    """Build Wait-For / Resource Allocation Graph and run cycle detection using DFS."""
    # Graph representation: task_id -> list of task_ids it waits for
    # Task T waits for lock L, and Lock L is owned by Task O => T -> O edge
    edges: List[ResourceGraphEdge] = []
    task_wait_for: Dict[str, Set[str]] = {}

    for lock_id, owner_task in owners.items():
        if owner_task:
            edges.append(ResourceGraphEdge(source=owner_task, target=lock_id, type="owns"))
        waiting_tasks = waiters.get(lock_id, set())
        for waiter in waiting_tasks:
            edges.append(ResourceGraphEdge(source=waiter, target=lock_id, type="waits_for"))
            if owner_task and owner_task != waiter:
                if waiter not in task_wait_for:
                    task_wait_for[waiter] = set()
                task_wait_for[waiter].add(owner_task)

    # Detect cycle in task_wait_for
    visited: Set[str] = set()
    rec_stack: Set[str] = set()
    cycle_nodes: List[str] = []

    def dfs(curr: str, path: List[str]) -> bool:
        visited.add(curr)
        rec_stack.add(curr)
        for neighbor in task_wait_for.get(curr, set()):
            if neighbor not in visited:
                if dfs(neighbor, path + [neighbor]):
                    return True
            elif neighbor in rec_stack:
                cycle_idx = path.index(neighbor) if neighbor in path else 0
                cycle_nodes.extend(path[cycle_idx:] + [neighbor])
                return True
        rec_stack.remove(curr)
        return False

    has_cycle = False
    for task in list(task_wait_for.keys()):
        if task not in visited:
            if dfs(task, [task]):
                has_cycle = True
                break

    # Tag edges participating in cycle
    if has_cycle:
        cycle_set = set(cycle_nodes)
        for edge in edges:
            if edge.source in cycle_set and edge.target in cycle_set:
                edge.is_cycle = True

    return has_cycle, cycle_nodes, edges

def run_deadlock_experiment(params: DeadlockInput, job_context: Any = None) -> Dict[str, Any]:
    run_id = job_context.job_id if job_context else "deadlock-local"
    recorder = TraceRecorder(run_id=run_id, is_simulation=False)
    registry = LockRegistry()

    # Create locks (resources)
    locks = [TracedLock(f"R{i+1}", registry, recorder) for i in range(params.resource_count)]
    lock_map = {lock.lock_id: lock for lock in locks}

    tasks_completed = 0
    tasks_aborted = 0
    lock_timeout_sec = params.lock_timeout_ms / 1000.0

    cycle_detected = False
    cycle_nodes: List[str] = []
    final_edges: List[ResourceGraphEdge] = []

    # Monitor thread for live cycle detection every 30ms
    stop_monitor = threading.Event()
    def monitor_worker():
        nonlocal cycle_detected, cycle_nodes, final_edges
        while not stop_monitor.is_set():
            owners, waiters = registry.get_snapshot()
            found, c_nodes, edges = detect_cycles_in_rag(owners, waiters)
            if found:
                cycle_detected = True
                cycle_nodes = c_nodes
                final_edges = edges
                if job_context:
                    job_context.emit_event("deadlock_detected", {
                        "cycle_nodes": c_nodes,
                        "owners": owners,
                        "waiters": {k: list(v) for k, v in waiters.items()}
                    })
            else:
                final_edges = edges
            time.sleep(0.03)

    mon_thread = threading.Thread(target=monitor_worker, daemon=True)
    mon_thread.start()

    try:
        active_threads: List[threading.Thread] = []

        if params.mode == DeadlockMode.SAFE_ORDERING:
            # Consistent ordering: every task acquires R1 then R2...
            def safe_task(t_name: str):
                nonlocal tasks_completed, tasks_aborted
                first_lock = locks[0]
                second_lock = locks[1]
                if first_lock.acquire(t_name, timeout_seconds=lock_timeout_sec):
                    try:
                        time.sleep(0.05)
                        if second_lock.acquire(t_name, timeout_seconds=lock_timeout_sec):
                            try:
                                time.sleep(0.05)
                                tasks_completed += 1
                            finally:
                                second_lock.release(t_name)
                        else:
                            tasks_aborted += 1
                    finally:
                        first_lock.release(t_name)
                else:
                    tasks_aborted += 1

            for i in range(params.task_count):
                t = threading.Thread(target=safe_task, args=(f"T{i+1}",))
                active_threads.append(t)
                t.start()

            for t in active_threads:
                t.join(timeout=5.0)

        elif params.mode == DeadlockMode.CONTROLLED_DEADLOCK or params.mode == DeadlockMode.DETECTION:
            # Controlled deadlock: T1 acquires R1 then R2; T2 acquires R2 then R1
            def task_1():
                nonlocal tasks_completed, tasks_aborted
                if locks[0].acquire("T1", timeout_seconds=lock_timeout_sec):
                    try:
                        time.sleep(0.1)  # Deliberate pause to ensure T2 grabs R2
                        if locks[1].acquire("T1", timeout_seconds=lock_timeout_sec):
                            try:
                                tasks_completed += 1
                            finally:
                                locks[1].release("T1")
                        else:
                            tasks_aborted += 1
                    finally:
                        locks[0].release("T1")
                else:
                    tasks_aborted += 1

            def task_2():
                nonlocal tasks_completed, tasks_aborted
                if locks[1].acquire("T2", timeout_seconds=lock_timeout_sec):
                    try:
                        time.sleep(0.1)  # Deliberate pause to ensure T1 grabs R1
                        if locks[0].acquire("T2", timeout_seconds=lock_timeout_sec):
                            try:
                                tasks_completed += 1
                            finally:
                                locks[0].release("T2")
                        else:
                            tasks_aborted += 1
                    finally:
                        locks[1].release("T2")
                else:
                    tasks_aborted += 1

            t1 = threading.Thread(target=task_1, name="Deadlock-Task-1")
            t2 = threading.Thread(target=task_2, name="Deadlock-Task-2")
            active_threads.extend([t1, t2])
            t1.start()
            t2.start()

            # Wait for deadlock observation or timeout
            t1.join(timeout=lock_timeout_sec + 2.0)
            t2.join(timeout=lock_timeout_sec + 2.0)

        elif params.mode == DeadlockMode.RECOVERY:
            # Recovery: detection triggers victim backoff and retry under lock ordering
            def recovering_task(t_name: str, primary_idx: int, secondary_idx: int):
                nonlocal tasks_completed, tasks_aborted
                max_retries = 3
                for attempt in range(max_retries):
                    first = locks[primary_idx]
                    second = locks[secondary_idx]
                    if first.acquire(t_name, timeout_seconds=0.4):
                        try:
                            time.sleep(0.05)
                            if second.acquire(t_name, timeout_seconds=0.4):
                                try:
                                    tasks_completed += 1
                                    return
                                finally:
                                    second.release(t_name)
                            else:
                                # Back off and release primary lock to break hold-and-wait!
                                tasks_aborted += 1
                        finally:
                            first.release(t_name)
                        time.sleep(0.05 * (attempt + 1))  # Exponential backoff
                        # On retry, adopt canonical safe ordering
                        primary_idx, secondary_idx = min(primary_idx, secondary_idx), max(primary_idx, secondary_idx)
                    else:
                        tasks_aborted += 1

            t1 = threading.Thread(target=recovering_task, args=("T1", 0, 1))
            t2 = threading.Thread(target=recovering_task, args=("T2", 1, 0))
            active_threads.extend([t1, t2])
            t1.start()
            t2.start()
            t1.join(timeout=5.0)
            t2.join(timeout=5.0)

    finally:
        stop_monitor.set()
        mon_thread.join(timeout=1.0)
        # Cleanly join all threads under a deadline
        for t in active_threads:
            if t.is_alive():
                t.join(timeout=1.0)

    # Build graph nodes
    nodes: List[ResourceGraphNode] = []
    for i in range(params.task_count):
        nodes.append(ResourceGraphNode(id=f"T{i+1}", label=f"Task T{i+1}", type="task"))
    for i in range(params.resource_count):
        nodes.append(ResourceGraphNode(id=f"R{i+1}", label=f"Resource R{i+1}", type="resource"))

    # Coffman conditions analysis derived from real state
    # 1. Mutual exclusion: TracedLock is exclusive
    # 2. Hold and wait: Task held one lock while requesting second
    # 3. No preemption: Locks cannot be forcefully stolen
    # 4. Circular wait: Cyclic dependency in RAG
    coffman = CoffmanState(
        mutual_exclusion=True,
        hold_and_wait=True if params.mode != DeadlockMode.SAFE_ORDERING else False,
        no_preemption=True,
        circular_wait=cycle_detected,
        deadlock_present=cycle_detected,
        explanation=(
            "Coffman Conditions Analysis: (1) Mutual Exclusion: YES (locks are non-sharable); "
            "(2) Hold and Wait: " + ("YES (threads held one resource while requesting another)" if params.mode != DeadlockMode.SAFE_ORDERING else "BROKEN (ordered acquisition)") + "; "
            "(3) No Preemption: YES (locks cannot be forcibly seized by the OS); "
            "(4) Circular Wait: " + ("YES (cycle detected between tasks and locks)" if cycle_detected else "NO (no cyclic dependencies formed)") + ". "
            "All four conditions must hold simultaneously for deadlock to occur. Breaking even one prevents deadlock."
        )
    )

    explanation = (
        f"Mode: {params.mode.value}. Cycle detected: {cycle_detected}. "
        f"Tasks completed: {tasks_completed}, tasks timed-out/aborted: {tasks_aborted}. "
        + ("Safe lock ordering prevented any circular wait from forming." if params.mode == DeadlockMode.SAFE_ORDERING else
           "In controlled deadlock, opposing acquisition orders caused mutual blocking until bounded timeouts expired." if not cycle_detected else
           f"Deadlock detected! Cycle formed between: {', '.join(cycle_nodes)}. Monitor caught the cyclic dependency.")
    )

    result = DeadlockResult(
        mode=params.mode,
        cycle_detected=cycle_detected,
        cycle_nodes=cycle_nodes,
        graph_nodes=nodes,
        graph_edges=final_edges,
        coffman=coffman,
        tasks_completed=tasks_completed,
        tasks_aborted_or_timed_out=tasks_aborted,
        explanation=explanation,
        traces=recorder.get_events()[:200]
    )
    return result.model_dump()
