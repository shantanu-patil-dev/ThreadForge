from fastapi import APIRouter
from backend.app.schemas.job import EnvironmentInfo
from backend.app.services.environment import get_environment_info

router = APIRouter()

@router.get("/environment", response_model=EnvironmentInfo)
def get_env():
    return get_environment_info()
