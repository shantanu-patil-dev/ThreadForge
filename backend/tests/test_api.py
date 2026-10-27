import pytest
import time
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.job_manager import job_manager
from backend.app.schemas.base import ExperimentType, JobStatus

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["version"] == "2.0.0"

def test_api_environment():
    res = client.get("/api/environment")
    assert res.status_code == 200
    data = res.json()
    assert "cpu_count" in data
    assert "python_version" in data
    assert "gil_enabled" in data
    assert data["cpu_count"] > 0

def test_api_limits():
    res = client.get("/api/limits")
    assert res.status_code == 200
    data = res.json()
    assert data["max_tasks"] == 10000
    assert data["max_threads"] == 64

def test_api_catalog():
    res = client.get("/api/experiments")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 6
    ids = [item["id"] for item in items]
    assert "benchmark" in ids
    assert "race-condition" in ids
    assert "deadlock" in ids

def test_validation_error_format():
    # Sending invalid task count (> 10000)
    bad_payload = {"tasks": 50000}
    res = client.post("/api/experiments/benchmark", json=bad_payload)
    assert res.status_code == 422
    err_body = res.json()
    assert "error" in err_body
    assert err_body["error"]["code"] == "VALIDATION_ERROR"

def test_concurrent_job_returns_409():
    # Directly set an active running job in the manager
    job = job_manager.create_job(ExperimentType.BENCHMARK, timeout_seconds=30)
    job.status = JobStatus.RUNNING
    try:
        # Attempt to dispatch an experiment while another is active
        res = client.post("/api/experiments/race-condition", json={
            "workers": 2,
            "increments_per_worker": 100
        })
        assert res.status_code == 409
        err = res.json()
        assert err["error"]["code"] == "CONCURRENT_JOB_RUNNING"
    finally:
        # Cleanly release active state
        job.status = JobStatus.COMPLETED
        with job_manager._lock:
            job_manager._active_job_id = None

def test_job_not_found():
    res = client.get("/api/jobs/nonexistent-job")
    assert res.status_code == 404
    err = res.json()
    assert err["error"]["code"] == "JOB_NOT_FOUND"
