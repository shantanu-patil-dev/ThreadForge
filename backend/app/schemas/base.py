from enum import Enum
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

class ErrorDetail(StrictModel):
    code: str
    message: str
    hint: Optional[str] = None

class ErrorResponse(StrictModel):
    error: ErrorDetail

class ExperimentType(str, Enum):
    BENCHMARK = "benchmark"
    RACE_CONDITION = "race-condition"
    SYNCHRONIZATION = "synchronization"
    DEADLOCK = "deadlock"
    THREAD_POOL = "thread-pool"
    SCALING = "scaling"

class WorkloadType(str, Enum):
    WAIT_BOUND = "wait_bound"
    WAIT_BOUND_IO = "wait_bound_io"
    CPU_BOUND = "cpu_bound"
    GIL_RELEASING = "gil_releasing"
    TINY = "tiny"

class SyncMethod(str, Enum):
    NONE = "none"
    MUTEX = "mutex"
    ATOMIC = "atomic"
    THREAD_LOCAL = "thread_local"
    LOCK_STRIPING = "lock_striping"

class DeadlockMode(str, Enum):
    SAFE_ORDERING = "safe_ordering"
    CONTROLLED_DEADLOCK = "controlled_deadlock"
    DETECTION = "detection"
    RECOVERY = "recovery"

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"
    TIMED_OUT = "timed_out"

class TraceEventKind(str, Enum):
    QUEUED = "queued"
    STARTED = "started"
    WAITING = "waiting"
    ACQUIRED = "acquired"
    RELEASED = "released"
    FINISHED = "finished"
    FAILED = "failed"
    CANCELLED = "cancelled"
