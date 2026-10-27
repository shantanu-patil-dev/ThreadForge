import pytest
from backend.app.schemas.base import SyncMethod
from backend.app.schemas.experiment_inputs import SynchronizationInput
from backend.app.schemas.experiment_results import SynchronizationResult
from backend.app.experiments.synchronization import run_synchronization_experiment

def test_synchronization_strategies_correctness_and_overhead():
    params = SynchronizationInput(
        strategies=[SyncMethod.MUTEX, SyncMethod.ATOMIC, SyncMethod.THREAD_LOCAL, SyncMethod.LOCK_STRIPING],
        workers=3,
        increments_per_worker=1000,
        stripe_count=3,
        trials=1
    )
    res_dict = run_synchronization_experiment(params)
    res = SynchronizationResult.model_validate(res_dict)

    assert res.strategies["mutex"].correctness is True
    assert res.strategies["atomic"].correctness is True
    assert res.strategies["thread_local"].correctness is True
    assert res.strategies["lock_striping"].correctness is True
    assert res.strategies["thread_local"].stats.median_ms > 0
    assert res.strategies["mutex"].stats.median_ms > 0
