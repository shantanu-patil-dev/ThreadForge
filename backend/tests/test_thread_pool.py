import pytest
from backend.app.schemas.base import WorkloadType
from backend.app.schemas.experiment_inputs import ThreadPoolInput
from backend.app.schemas.experiment_results import ThreadPoolResult
from backend.app.experiments.thread_pool import (
    run_thread_pool_experiment, run_thread_creation_microbenchmark
)

def test_thread_creation_microbenchmark():
    overhead_ns = run_thread_creation_microbenchmark()
    assert overhead_ns > 0

def test_thread_pool_optimizer_execution():
    params = ThreadPoolInput(
        workload=WorkloadType.WAIT_BOUND,
        tasks=12,
        pool_workers=3,
        wait_ms=1.0,
        trials=1
    )
    res_dict = run_thread_pool_experiment(params)
    res = ThreadPoolResult.model_validate(res_dict)
    
    assert "Sequential" in res.approaches
    assert "ThreadPerTask" in res.approaches
    assert "ThreadPool" in res.approaches
    assert res.approaches["ThreadPool"].correctness is True
    assert res.approaches["ThreadPool"].total_time_ms > 0
