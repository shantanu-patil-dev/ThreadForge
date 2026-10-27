import time
import threading
from typing import List, Optional, Dict, Any
from backend.app.schemas.base import TraceEventKind
from backend.app.schemas.trace import TraceEvent, TraceCollection

class TraceRecorder:
    def __init__(self, run_id: str, is_simulation: bool = False):
        self.run_id = run_id
        self.is_simulation = is_simulation
        self.start_ns = time.perf_counter_ns()
        self._events: List[TraceEvent] = []
        self._lock = threading.Lock()
        self._overhead_ns = self._measure_overhead()

    def _measure_overhead(self) -> int:
        # Measure cost of recording 100 sample events
        n = 100
        t0 = time.perf_counter_ns()
        for i in range(n):
            _ = time.perf_counter_ns()
        t1 = time.perf_counter_ns()
        return max(1, (t1 - t0) // n)

    def record(
        self,
        task_id: int,
        worker_id: str,
        kind: TraceEventKind,
        duration_ns: Optional[int] = None,
        meta: Optional[Dict[str, Any]] = None
    ) -> TraceEvent:
        now_ns = time.perf_counter_ns() - self.start_ns
        event = TraceEvent(
            run_id=self.run_id,
            task_id=task_id,
            worker_id=worker_id,
            kind=kind,
            t_ns=now_ns,
            duration_ns=duration_ns,
            meta=meta
        )
        with self._lock:
            # Bound memory to max 10,000 trace events
            if len(self._events) < 10000:
                self._events.append(event)
        return event

    def get_events(self) -> List[TraceEvent]:
        with self._lock:
            return list(self._events)

    def get_collection(self) -> TraceCollection:
        with self._lock:
            return TraceCollection(
                run_id=self.run_id,
                is_simulation=self.is_simulation,
                overhead_ns=self._overhead_ns,
                events=list(self._events)
            )
