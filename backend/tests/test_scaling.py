import pytest
from backend.app.schemas.base import WorkloadType
from backend.app.schemas.experiment_inputs import ScalingInput
from backend.app.schemas.experiment_results import ScalingResult
from backend.app.experiments.scaling import run_scaling_experiment

def test_scaling_analyzer_curve_and_amdahl():
    params = ScalingInput(
        workload=WorkloadType.WAIT_BOUND,
        tasks=8,
        worker_counts=[1, 2, 4],
        test_processes=False,
        wait_ms=1.0,
        trials=1
    )
    res_dict = run_scaling_experiment(params)
    res = ScalingResult.model_validate(res_dict)

    assert len(res.curves) >= 1
    thread_curve = res.curves[0]
    assert thread_curve.type == "threads"
    assert len(thread_curve.points) == 3
    assert thread_curve.points[0].workers == 1
    assert thread_curve.points[0].speedup == 1.0
    assert thread_curve.amdahl_fitted_serial_fraction is not None
    assert len(thread_curve.amdahl_curve_points) > 0
