import time
import os
import tempfile
import hashlib
import zlib

def run_wait_task(wait_ms: float) -> int:
    """Wait-bound task stand-in for network or disk wait."""
    if wait_ms > 0:
        time.sleep(wait_ms / 1000.0)
    return 1

def run_temp_io_task(size_bytes: int = 4096) -> int:
    """Real temp-file I/O variant that cleans up immediately."""
    with tempfile.NamedTemporaryFile(delete=False) as f:
        temp_path = f.name
        f.write(b"T" * size_bytes)
        f.flush()
    try:
        with open(temp_path, "rb") as f:
            data = f.read()
        return len(data)
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

def run_cpu_bound_primes(limit: int) -> int:
    """Pure-Python CPU-bound prime counting."""
    if limit < 2:
        return 0
    count = 0
    for num in range(2, limit + 1):
        is_prime = True
        for i in range(2, int(num ** 0.5) + 1):
            if num % i == 0:
                is_prime = False
                break
        if is_prime:
            count += 1
    return count

def run_gil_releasing_work(buffer_size: int = 100000, iterations: int = 10) -> int:
    """CPU work using hashlib/zlib in C extension, which explicitly releases the GIL."""
    data = b"ThreadForge Laboratory Performance Buffer " * (max(1, buffer_size // 40))
    total_len = 0
    for _ in range(max(1, iterations)):
        # hashlib.sha256 in CPython releases the GIL for inputs > 2048 bytes
        h = hashlib.sha256(data).digest()
        # zlib.compress also releases the GIL
        c = zlib.compress(data, level=1)
        total_len += len(h) + len(c)
    return total_len

def run_tiny_task(val: int) -> int:
    """Micro-task to expose thread/process scheduling overhead."""
    return val + 1
