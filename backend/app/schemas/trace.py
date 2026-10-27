from typing import Optional, Dict, Any, List
from backend.app.schemas.base import StrictModel, TraceEventKind

class TraceEvent(StrictModel):
    run_id: str
    task_id: int
    worker_id: str
    kind: TraceEventKind
    t_ns: int
    duration_ns: Optional[int] = None
    meta: Optional[Dict[str, Any]] = None

class TraceCollection(StrictModel):
    run_id: str
    is_simulation: bool = False
    overhead_ns: int
    events: List[TraceEvent]
