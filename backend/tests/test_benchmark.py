import pytest
from backend.app.schemas.base import WorkloadType
from backend.app.schemas.experiment_inputs import BenchmarkInput
from backend.app.schemas.experiment_results import BenchmarkResult
from backend.app.experiments.benchmark import run_benchmark_experiment

def test_benchmark_wait_bound_correctness():
    params = BenchmarkInput(
        workload=WorkloadType.WAIT_BOUND,
        tasks=10,
        threads=2,
        include_process_pool=False,
        wait_ms=1.0,
        trials=1,
        warmup_trials=0
    )
    raw_res = run_benchmark_experiment(params)
    result = BenchmarkResult.model_validate(raw_res)
    
    assert "Sequential" in result.approaches
    assert "ThreadPool" in result.approaches
    assert result.approaches["Sequential"].correctness_verified is True
    assert result.approaches["ThreadPool"].correctness_verified is True
    assert result.approaches["Sequential"].stats.median_ms > 0
    assert result.approaches["ThreadPool"].stats.median_ms > 0

def test_benchmark_gil_releasing_workload():
    params = BenchmarkInput(
        workload=WorkloadType.GIL_RELEASING,
        tasks=6,
        threads=2,
        include_process_pool=False,
        cpu_intensity=500,
        trials=1,
        warmup_trials=0
    )
    raw_res = run_benchmark_experiment(params)
    result = BenchmarkResult.model_validate(raw_res)
    assert result.approaches["ThreadPool"].throughput_tasks_per_sec > 0
    assert len(result.traces) > 0

def test_benchmark_process_pool_spawn_execution():
    params = BenchmarkInput(
        workload=WorkloadType.CPU_BOUND,
        tasks=4,
        threads=2,
        processes=2,
        include_process_pool=True,
        cpu_intensity=200,
        trials=1,
        warmup_trials=0
    )
    raw_res = run_benchmark_experiment(params)
    result = BenchmarkResult.model_validate(raw_res)
    assert "ProcessPool" in result.approaches
    assert result.approaches["ProcessPool"].correctness_verified is True
    assert result.approaches["ProcessPool"].startup_cost_ms is not None
