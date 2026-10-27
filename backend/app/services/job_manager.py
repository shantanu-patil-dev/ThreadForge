import time
import uuid
import datetime
import threading
import queue
from typing import Dict, Any, Optional, Callable
from backend.app.schemas.base import JobStatus, ExperimentType
from backend.app.schemas.job import JobSummary

class JobContext:
    def __init__(self, job_id: str, experiment_type: ExperimentType, timeout_seconds: int = 30):
        self.job_id = job_id
        self.experiment_type = experiment_type
        self.status = JobStatus.QUEUED
        self.timeout_seconds = timeout_seconds
        self.progress_percent = 0.0
        self.current_trial = 0
        self.total_trials = 1
        self.completed_tasks = 0
        self.total_tasks = 1
        self.message = "Job queued"
        self.created_at_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        
        # Concurrency coordination
        self.cancel_event = threading.Event()
        self.pause_event = threading.Event()  # cleared when paused, set when running
        self.pause_event.set()
        
        # SSE Event Stream queue
        self.event_queues: list[queue.Queue] = []
        self._lock = threading.Lock()

    def is_cancelled(self) -> bool:
        return self.cancel_event.is_set()

    def check_pause(self):
        """Cooperative pause check."""
        self.pause_event.wait()

    def emit_event(self, event_type: str, data: Dict[str, Any]):
        """Publish event to SSE subscribers."""
        payload = {
            "job_id": self.job_id,
            "type": event_type,
            "timestamp": time.time(),
            "data": data
        }
        with self._lock:
            for q in list(self.event_queues):
                try:
                    q.put_nowait(payload)
                except queue.Full:
                    pass

    def add_subscriber(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=1000)
        with self._lock:
            self.event_queues.append(q)
        return q

    def remove_subscriber(self, q: queue.Queue):
        with self._lock:
            if q in self.event_queues:
                self.event_queues.remove(q)

    def to_summary(self) -> JobSummary:
        with self._lock:
            return JobSummary(
                job_id=self.job_id,
                experiment_type=self.experiment_type,
                status=self.status,
                progress_percent=round(self.progress_percent, 1),
                current_trial=self.current_trial,
                total_trials=self.total_trials,
                completed_tasks=self.completed_tasks,
                total_tasks=self.total_tasks,
                message=self.message,
                created_at_iso=self.created_at_iso,
                result=self.result,
                error=self.error
            )

class JobManager:
    _instance = None
    _singleton_lock = threading.Lock()

    def __new__(cls):
        with cls._singleton_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._init()
            return cls._instance

    def _init(self):
        self._jobs: Dict[str, JobContext] = {}
        self._active_job_id: Optional[str] = None
        self._lock = threading.RLock()

    def get_active_job(self) -> Optional[JobContext]:
        with self._lock:
            if self._active_job_id:
                job = self._jobs.get(self._active_job_id)
                if job and job.status in (JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.PAUSED):
                    return job
            return None

    def create_job(self, experiment_type: ExperimentType, timeout_seconds: int = 30) -> JobContext:
        with self._lock:
            active = self.get_active_job()
            if active is not None:
                raise RuntimeError(f"Job {active.job_id} is currently running")
            
            job_id = str(uuid.uuid4())[:8]
            job = JobContext(job_id=job_id, experiment_type=experiment_type, timeout_seconds=timeout_seconds)
            self._jobs[job_id] = job
            self._active_job_id = job_id
            return job

    def get_job(self, job_id: str) -> Optional[JobContext]:
        with self._lock:
            return self._jobs.get(job_id)

    def start_job(self, job: JobContext, worker_fn: Callable[[JobContext], Dict[str, Any]]):
        def runner():
            job.status = JobStatus.RUNNING
            job.message = "Running experiment"
            job.emit_event("status_changed", {"status": JobStatus.RUNNING.value})
            
            start_time = time.time()
            try:
                # Execute in separate thread, not event loop
                result = worker_fn(job)
                if job.is_cancelled():
                    job.status = JobStatus.CANCELLED
                    job.message = "Job cancelled by user"
                    job.emit_event("status_changed", {"status": JobStatus.CANCELLED.value})
                elif time.time() - start_time > job.timeout_seconds:
                    job.status = JobStatus.TIMED_OUT
                    job.message = f"Job exceeded timeout of {job.timeout_seconds}s"
                    job.emit_event("status_changed", {"status": JobStatus.TIMED_OUT.value})
                else:
                    job.status = JobStatus.COMPLETED
                    job.progress_percent = 100.0
                    job.result = result
                    job.message = "Experiment completed successfully"
                    job.emit_event("status_changed", {"status": JobStatus.COMPLETED.value})
                    job.emit_event("result", result)
            except Exception as e:
                if job.is_cancelled():
                    job.status = JobStatus.CANCELLED
                    job.message = "Job cancelled"
                    job.emit_event("status_changed", {"status": JobStatus.CANCELLED.value})
                else:
                    job.status = JobStatus.FAILED
                    job.error = str(e)
                    job.message = f"Execution failed: {e}"
                    job.emit_event("status_changed", {"status": JobStatus.FAILED.value, "error": str(e)})
            finally:
                with self._lock:
                    if self._active_job_id == job.job_id:
                        self._active_job_id = None

        thread = threading.Thread(target=runner, name=f"ThreadForge-Worker-{job.job_id}", daemon=True)
        thread.start()

    def cancel_job(self, job_id: str) -> bool:
        job = self.get_job(job_id)
        if not job:
            return False
        job.cancel_event.set()
        job.pause_event.set()  # Unpause if paused so thread can exit
        job.status = JobStatus.CANCELLED
        job.message = "Cancelling job..."
        job.emit_event("status_changed", {"status": JobStatus.CANCELLED.value})
        with self._lock:
            if self._active_job_id == job_id:
                self._active_job_id = None
        return True

    def pause_job(self, job_id: str) -> bool:
        job = self.get_job(job_id)
        if not job or job.status != JobStatus.RUNNING:
            return False
        job.pause_event.clear()
        job.status = JobStatus.PAUSED
        job.message = "Job paused"
        job.emit_event("status_changed", {"status": JobStatus.PAUSED.value})
        return True

    def resume_job(self, job_id: str) -> bool:
        job = self.get_job(job_id)
        if not job or job.status != JobStatus.PAUSED:
            return False
        job.pause_event.set()
        job.status = JobStatus.RUNNING
        job.message = "Job resumed"
        job.emit_event("status_changed", {"status": JobStatus.RUNNING.value})
        return True

job_manager = JobManager()
