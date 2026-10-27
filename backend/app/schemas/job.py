from typing import Optional, Any, Dict
from backend.app.schemas.base import StrictModel, JobStatus, ExperimentType

class EnvironmentInfo(StrictModel):
    os_name: str
    os_version: str
    platform: str
    cpu_count: int
    python_version: str
    python_implementation: str
    gil_enabled: bool
    free_threaded: bool

class JobSummary(StrictModel):
    job_id: str
    experiment_type: ExperimentType
    status: JobStatus
    progress_percent: float
    current_trial: int
    total_trials: int
    completed_tasks: int
    total_tasks: int
    message: Optional[str] = None
    created_at_iso: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
