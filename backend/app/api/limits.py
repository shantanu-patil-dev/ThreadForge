import os
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ServerLimits(BaseModel):
    max_tasks: int
    max_thread_per_task: int
    min_threads: int
    max_threads: int
    min_processes: int
    max_processes: int
    min_trials: int
    max_trials: int
    min_warmup: int
    max_warmup: int
    max_wait_ms: float
    default_timeout_s: int
    max_timeout_s: int
    max_request_bytes: int

@router.get("/limits", response_model=ServerLimits)
def get_limits():
    cpu_cnt = os.cpu_count() or 1
    max_procs = min(16, 2 * cpu_cnt)
    return ServerLimits(
        max_tasks=10000,
        max_thread_per_task=2000,
        min_threads=1,
        max_threads=64,
        min_processes=1,
        max_processes=max_procs,
        min_trials=1,
        max_trials=20,
        min_warmup=0,
        max_warmup=3,
        max_wait_ms=500.0,
        default_timeout_s=30,
        max_timeout_s=120,
        max_request_bytes=16384
    )
