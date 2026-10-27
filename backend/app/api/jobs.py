import json
import asyncio
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from backend.app.services.job_manager import job_manager
from backend.app.schemas.job import JobSummary
from backend.app.schemas.base import ErrorResponse, ErrorDetail

router = APIRouter(prefix="/jobs")

@router.get("/{job_id}", response_model=JobSummary, responses={404: {"model": ErrorResponse}})
def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job {job_id} was not found", "hint": "Check the job ID or start a new experiment."}}
        )
    return job.to_summary()

@router.get("/{job_id}/events")
async def stream_job_events(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job {job_id} was not found", "hint": "Check the job ID or start a new experiment."}}
        )

    q = job.add_subscriber()

    async def event_generator():
        try:
            # Emit initial snapshot
            init_data = json.dumps(job.to_summary().model_dump())
            yield f"event: snapshot\ndata: {init_data}\n\n"
            
            while True:
                # Non-blocking poll of subscriber queue
                try:
                    event = q.get_nowait()
                    data_str = json.dumps(event)
                    event_type = event.get("type", "message")
                    yield f"event: {event_type}\ndata: {data_str}\n\n"
                    if event_type == "status_changed" and event.get("data", {}).get("status") in ("completed", "cancelled", "failed", "timed_out"):
                        break
                except Exception:
                    await asyncio.sleep(0.05)
                    # Heartbeat check
                    if job.status.value in ("completed", "cancelled", "failed", "timed_out") and q.empty():
                        break
        finally:
            job.remove_subscriber(q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/{job_id}/cancel")
def cancel_job(job_id: str):
    success = job_manager.cancel_job(job_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Cannot cancel job {job_id}", "hint": "Job might have already completed or does not exist."}}
        )
    return {"status": "cancelling", "job_id": job_id}

@router.post("/{job_id}/pause")
def pause_job(job_id: str):
    success = job_manager.pause_job(job_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "PAUSE_FAILED", "message": f"Cannot pause job {job_id}", "hint": "Only active running jobs can be paused."}}
        )
    return {"status": "paused", "job_id": job_id}

@router.post("/{job_id}/resume")
def resume_job(job_id: str):
    success = job_manager.resume_job(job_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "RESUME_FAILED", "message": f"Cannot resume job {job_id}", "hint": "Only paused jobs can be resumed."}}
        )
    return {"status": "resumed", "job_id": job_id}
