import sys
import time
import httpx

BASE_URL = "http://localhost:8000"

def wait_for_server(timeout_sec: int = 20) -> bool:
    print(f"[*] Waiting for server at {BASE_URL}/api/health (timeout {timeout_sec}s)...")
    t0 = time.time()
    while time.time() - t0 < timeout_sec:
        try:
            r = httpx.get(f"{BASE_URL}/api/health", timeout=2.0)
            if r.status_code == 200:
                print(f"[+] Server online: {r.json()}")
                return True
        except Exception:
            time.sleep(0.5)
    return False

def wait_for_job_completion(client: httpx.Client, job_id: str, timeout_sec: int = 15) -> dict:
    t0 = time.time()
    while time.time() - t0 < timeout_sec:
        r = client.get(f"{BASE_URL}/api/jobs/{job_id}", timeout=2.0)
        assert r.status_code == 200, f"Failed to get job {job_id}: {r.text}"
        data = r.json()
        status = data.get("status")
        if status in ("completed", "failed", "cancelled", "timed_out"):
            return data
        time.sleep(0.1)
    raise TimeoutError(f"Job {job_id} did not finish within {timeout_sec}s")

def main():
    if not wait_for_server():
        print("[-] Server failed to respond in time.")
        sys.exit(1)

    client = httpx.Client(timeout=10.0)
    results_table = []

    # 1. Environment Check
    try:
        r = client.get(f"{BASE_URL}/api/environment")
        assert r.status_code == 200
        env = r.json()
        assert env["cpu_count"] > 0
        results_table.append(("Environment API", "GET /api/environment", "PASS", f"Cores: {env['cpu_count']}, Python: {env['python_version']}"))
    except Exception as e:
        results_table.append(("Environment API", "GET /api/environment", "FAIL", str(e)))

    # 2. Limits Check
    try:
        r = client.get(f"{BASE_URL}/api/limits")
        assert r.status_code == 200
        lim = r.json()
        assert lim["max_tasks"] == 10000
        results_table.append(("Limits API", "GET /api/limits", "PASS", f"Max Tasks: {lim['max_tasks']}, Max Threads: {lim['max_threads']}"))
    except Exception as e:
        results_table.append(("Limits API", "GET /api/limits", "FAIL", str(e)))

    # 3. Catalog Check
    try:
        r = client.get(f"{BASE_URL}/api/experiments")
        assert r.status_code == 200
        cat = r.json()
        assert len(cat) == 6
        results_table.append(("Catalog API", "GET /api/experiments", "PASS", f"Total Experiments: {len(cat)}"))
    except Exception as e:
        results_table.append(("Catalog API", "GET /api/experiments", "FAIL", str(e)))

    # 3b. Root SPA Static Mount Check
    try:
        r = client.get(f"{BASE_URL}/")
        assert r.status_code == 200
        assert "ThreadForge" in r.text or "html" in r.text.lower()
        results_table.append(("Root SPA Static Mount", "GET /", "PASS", "HTTP 200 (index.html served)"))
    except Exception as e:
        results_table.append(("Root SPA Static Mount", "GET /", "FAIL", str(e)))

    # 4. Tiny Benchmark Run
    try:
        r = client.post(f"{BASE_URL}/api/experiments/benchmark", json={
            "workload": "wait_bound",
            "tasks": 5,
            "threads": 2,
            "wait_ms": 1.0,
            "trials": 1,
            "warmup_trials": 0
        })
        assert r.status_code == 202
        job_data = wait_for_job_completion(client, r.json()["job_id"])
        assert job_data["status"] == "completed"
        assert "Sequential" in job_data["result"]["approaches"]
        results_table.append(("Benchmark Experiment", "POST /api/experiments/benchmark", "PASS", f"Speedup: {job_data['result']['approaches']['ThreadPool']['speedup_median']}x"))
    except Exception as e:
        results_table.append(("Benchmark Experiment", "POST /api/experiments/benchmark", "FAIL", str(e)))

    # 5. Tiny Race Condition Run
    try:
        r = client.post(f"{BASE_URL}/api/experiments/race-condition", json={
            "workers": 2,
            "increments_per_worker": 500,
            "sync_method": "mutex",
            "race_window": "amplified",
            "trials": 1
        })
        assert r.status_code == 202
        job_data = wait_for_job_completion(client, r.json()["job_id"])
        assert job_data["status"] == "completed"
        assert job_data["result"]["verdict"] == "CORRECT"
        results_table.append(("Race Condition Experiment", "POST /api/experiments/race-condition", "PASS", f"Verdict: {job_data['result']['verdict']}"))
    except Exception as e:
        results_table.append(("Race Condition Experiment", "POST /api/experiments/race-condition", "FAIL", str(e)))

    # 6. Tiny Synchronization Run
    try:
        r = client.post(f"{BASE_URL}/api/experiments/synchronization", json={
            "strategies": ["mutex", "atomic", "thread_local"],
            "workers": 2,
            "increments_per_worker": 500,
            "trials": 1
        })
        assert r.status_code == 202
        job_data = wait_for_job_completion(client, r.json()["job_id"])
        assert job_data["status"] == "completed"
        results_table.append(("Synchronization Experiment", "POST /api/experiments/synchronization", "PASS", f"Strategies tested: 3"))
    except Exception as e:
        results_table.append(("Synchronization Experiment", "POST /api/experiments/synchronization", "FAIL", str(e)))

    # 7. Tiny Deadlock Run
    try:
        r = client.post(f"{BASE_URL}/api/experiments/deadlock", json={
            "mode": "safe_ordering",
            "resource_count": 2,
            "task_count": 2,
            "lock_timeout_ms": 500
        })
        assert r.status_code == 202
        job_data = wait_for_job_completion(client, r.json()["job_id"])
        assert job_data["status"] == "completed"
        assert job_data["result"]["cycle_detected"] is False
        results_table.append(("Deadlock Experiment", "POST /api/experiments/deadlock", "PASS", f"Safe Ordering Cycle: False"))
    except Exception as e:
        results_table.append(("Deadlock Experiment", "POST /api/experiments/deadlock", "FAIL", str(e)))

    # 8. Tiny Thread Pool Run
    try:
        r = client.post(f"{BASE_URL}/api/experiments/thread-pool", json={
            "workload": "wait_bound",
            "tasks": 6,
            "pool_workers": 2,
            "wait_ms": 1.0
        })
        assert r.status_code == 202
        job_data = wait_for_job_completion(client, r.json()["job_id"])
        assert job_data["status"] == "completed"
        assert "ThreadPool" in job_data["result"]["approaches"]
        results_table.append(("Thread Pool Experiment", "POST /api/experiments/thread-pool", "PASS", f"Utilization: {job_data['result']['approaches']['ThreadPool']['worker_utilization_percent']}%"))
    except Exception as e:
        results_table.append(("Thread Pool Experiment", "POST /api/experiments/thread-pool", "FAIL", str(e)))

    # 9. Tiny Scaling Run
    try:
        r = client.post(f"{BASE_URL}/api/experiments/scaling", json={
            "workload": "wait_bound",
            "tasks": 4,
            "worker_counts": [1, 2],
            "wait_ms": 1.0
        })
        assert r.status_code == 202
        job_data = wait_for_job_completion(client, r.json()["job_id"])
        assert job_data["status"] == "completed"
        results_table.append(("Scaling Experiment", "POST /api/experiments/scaling", "PASS", f"Fitted s: {job_data['result']['curves'][0]['amdahl_fitted_serial_fraction']}"))
    except Exception as e:
        results_table.append(("Scaling Experiment", "POST /api/experiments/scaling", "FAIL", str(e)))

    # Print Table
    print("\n" + "=" * 80)
    print(f"{'EXPERIMENT / SUBSYSTEM':<28} | {'ENDPOINT':<32} | {'STATUS':<6} | {'DETAILS'}")
    print("-" * 80)
    all_pass = True
    for name, endpoint, status, details in results_table:
        print(f"{name:<28} | {endpoint:<32} | {status:<6} | {details}")
        if status != "PASS":
            all_pass = False
    print("=" * 80)

    if all_pass:
        print("\n[SUCCESS] ALL RUNTIME EXPERIMENTS VERIFIED PASSING!\n")
        sys.exit(0)
    else:
        print("\n[FAILURE] SOME EXPERIMENTS FAILED VERIFICATION.\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
