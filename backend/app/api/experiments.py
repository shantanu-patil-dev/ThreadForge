from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from backend.app.schemas.base import ExperimentType, ErrorResponse
from backend.app.schemas.experiment_inputs import (
    BenchmarkInput, RaceConditionInput, SynchronizationInput, DeadlockInput,
    ThreadPoolInput, ScalingInput
)
from backend.app.services.job_manager import job_manager
from backend.app.experiments.benchmark import run_benchmark_experiment
from backend.app.experiments.race_condition import run_race_condition_experiment
from backend.app.experiments.synchronization import run_synchronization_experiment
from backend.app.experiments.deadlock import run_deadlock_experiment
from backend.app.experiments.thread_pool import run_thread_pool_experiment
from backend.app.experiments.scaling import run_scaling_experiment

router = APIRouter(prefix="/experiments")

class JobAcceptedResponse(BaseModel):
    job_id: str
    status: str
    message: str

def _dispatch_job(exp_type: ExperimentType, timeout_s: int, worker_fn, params):
    active = job_manager.get_active_job()
    if active is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "CONCURRENT_JOB_RUNNING",
                    "message": f"Job '{active.job_id}' is currently running ({active.experiment_type.value})",
                    "hint": "ThreadForge permits only one active lab run at a time to prevent CPU resource competition. Cancel the active job or wait for completion."
                }
            }
        )
    
    job = job_manager.create_job(experiment_type=exp_type, timeout_seconds=timeout_s)
    job_manager.start_job(job, lambda ctx: worker_fn(params, ctx))
    return JobAcceptedResponse(
        job_id=job.job_id,
        status="queued",
        message=f"Experiment '{exp_type.value}' queued successfully"
    )

@router.post("/benchmark", status_code=status.HTTP_202_ACCEPTED, response_model=JobAcceptedResponse, responses={409: {"model": ErrorResponse}})
def start_benchmark(params: BenchmarkInput):
    return _dispatch_job(ExperimentType.BENCHMARK, params.timeout_seconds, run_benchmark_experiment, params)

@router.post("/race-condition", status_code=status.HTTP_202_ACCEPTED, response_model=JobAcceptedResponse, responses={409: {"model": ErrorResponse}})
def start_race_condition(params: RaceConditionInput):
    return _dispatch_job(ExperimentType.RACE_CONDITION, params.timeout_seconds, run_race_condition_experiment, params)

@router.post("/synchronization", status_code=status.HTTP_202_ACCEPTED, response_model=JobAcceptedResponse, responses={409: {"model": ErrorResponse}})
def start_synchronization(params: SynchronizationInput):
    return _dispatch_job(ExperimentType.SYNCHRONIZATION, params.timeout_seconds, run_synchronization_experiment, params)

@router.post("/deadlock", status_code=status.HTTP_202_ACCEPTED, response_model=JobAcceptedResponse, responses={409: {"model": ErrorResponse}})
def start_deadlock(params: DeadlockInput):
    return _dispatch_job(ExperimentType.DEADLOCK, params.timeout_seconds, run_deadlock_experiment, params)

@router.post("/thread-pool", status_code=status.HTTP_202_ACCEPTED, response_model=JobAcceptedResponse, responses={409: {"model": ErrorResponse}})
def start_thread_pool(params: ThreadPoolInput):
    return _dispatch_job(ExperimentType.THREAD_POOL, params.timeout_seconds, run_thread_pool_experiment, params)

@router.post("/scaling", status_code=status.HTTP_202_ACCEPTED, response_model=JobAcceptedResponse, responses={409: {"model": ErrorResponse}})
def start_scaling(params: ScalingInput):
    return _dispatch_job(ExperimentType.SCALING, params.timeout_seconds, run_scaling_experiment, params)
