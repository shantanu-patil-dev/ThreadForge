import os
import sys
import platform
from backend.app.schemas.job import EnvironmentInfo

def get_environment_info() -> EnvironmentInfo:
    gil_enabled = True
    if hasattr(sys, "_is_gil_enabled"):
        gil_enabled = sys._is_gil_enabled()
    
    return EnvironmentInfo(
        os_name=platform.system(),
        os_version=platform.version(),
        platform=platform.platform(),
        cpu_count=os.cpu_count() or 1,
        python_version=sys.version.split()[0],
        python_implementation=sys.implementation.name,
        gil_enabled=gil_enabled,
        free_threaded=(not gil_enabled)
    )
