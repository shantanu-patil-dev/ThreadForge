import pytest
from backend.app.schemas.base import SyncMethod
from backend.app.schemas.experiment_inputs import RaceConditionInput
from backend.app.schemas.experiment_results import RaceConditionResult
from backend.app.experiments.race_condition import (
    run_race_condition_experiment, enumerate_two_thread_interleavings
)

def test_mutex_counter_always_correct():
    params = RaceConditionInput(
        workers=4,
        increments_per_worker=500,
        sync_method=SyncMethod.MUTEX,
        race_window="amplified",
        trials=2
    )
    res_dict = run_race_condition_experiment(params)
    res = RaceConditionResult.model_validate(res_dict)
    
    assert res.failed_trials_count == 0
    assert res.verdict == "CORRECT"
    for trial in res.trials:
        assert trial.is_correct is True
        assert trial.lost_updates == 0
        assert trial.actual == trial.expected

def test_atomic_counter_always_correct():
    params = RaceConditionInput(
        workers=4,
        increments_per_worker=1000,
        sync_method=SyncMethod.ATOMIC,
        race_window="natural",
        trials=1
    )
    res_dict = run_race_condition_experiment(params)
    res = RaceConditionResult.model_validate(res_dict)
    
    assert res.verdict == "CORRECT"
    assert res.trials[0].actual == 4000
    assert res.cpython_atomic_detail_notice is not None

def test_simulation_interleaving_enumeration():
    model = enumerate_two_thread_interleavings()
    # Exactly 20 interleavings for two 3-step threads (6! / (3!*3!) = 20)
    assert model["total_interleavings"] == 20
    assert model["correct_end_at_two"] + model["lost_update_end_at_one"] == 20
    # In classic 3-step interleavings, exactly 2 interleavings are serial (correct) and 18 are interleaved
    assert model["lost_update_end_at_one"] > 0
    assert len(model["traces"]) == 20
