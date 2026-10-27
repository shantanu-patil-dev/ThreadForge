import {
  EnvironmentInfo, ServerLimits, ExperimentCatalogItem, JobSummary
} from '../types';

export class ApiError extends Error {
  code: string;
  hint?: string;
  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.hint = hint;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errCode = `HTTP_${res.status}`;
    let errMsg = `Request failed with status ${res.status}`;
    let errHint: string | undefined;

    try {
      const data = await res.json();
      if (data.error) {
        errCode = data.error.code || errCode;
        errMsg = data.error.message || errMsg;
        errHint = data.error.hint;
      } else if (data.detail) {
        errMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // Non-JSON error payload
    }
    throw new ApiError(errCode, errMsg, errHint);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getHealth(): Promise<{ status: string; version: string }> {
    const res = await fetch('/api/health');
    return handleResponse(res);
  },

  async getEnvironment(): Promise<EnvironmentInfo> {
    const res = await fetch('/api/environment');
    return handleResponse<EnvironmentInfo>(res);
  },

  async getLimits(): Promise<ServerLimits> {
    const res = await fetch('/api/limits');
    return handleResponse<ServerLimits>(res);
  },

  async getCatalog(): Promise<ExperimentCatalogItem[]> {
    const res = await fetch('/api/experiments');
    return handleResponse<ExperimentCatalogItem[]>(res);
  },

  async startExperiment(experimentType: string, params: Record<string, any>): Promise<{ job_id: string; status: string; message: string }> {
    const res = await fetch(`/api/experiments/${experimentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },

  async getJob(jobId: string): Promise<JobSummary> {
    const res = await fetch(`/api/jobs/${jobId}`);
    return handleResponse<JobSummary>(res);
  },

  async cancelJob(jobId: string): Promise<any> {
    const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
    return handleResponse(res);
  },

  async pauseJob(jobId: string): Promise<any> {
    const res = await fetch(`/api/jobs/${jobId}/pause`, { method: 'POST' });
    return handleResponse(res);
  },

  async resumeJob(jobId: string): Promise<any> {
    const res = await fetch(`/api/jobs/${jobId}/resume`, { method: 'POST' });
    return handleResponse(res);
  },
};
