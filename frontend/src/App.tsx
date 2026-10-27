import React, { useState, useEffect, useRef } from 'react';
import {
  EnvironmentInfo, ServerLimits, ExperimentCatalogItem, JobSummary,
  SavedExperimentRun, TraceEvent
} from './types';
import { api, ApiError } from './services/api';
import { historyStorage } from './services/historyStorage';
import { TopBar } from './components/TopBar';
import { NavigationRail, PageId } from './components/NavigationRail';
import { RunConsole, ConsoleEvent } from './components/RunConsole';

// Pages
import { OverviewDashboard } from './pages/OverviewDashboard';
import { ConcurrencyLab } from './pages/ConcurrencyLab';
import { PerformanceBenchmarkPage } from './pages/PerformanceBenchmarkPage';
import { RaceConditionPage } from './pages/RaceConditionPage';
import { SynchronizationPage } from './pages/SynchronizationPage';
import { DeadlockPage } from './pages/DeadlockPage';
import { ThreadPoolPage } from './pages/ThreadPoolPage';
import { TimelinePage } from './pages/TimelinePage';
import { ScalingPage } from './pages/ScalingPage';
import { HistoryPage } from './pages/HistoryPage';
import { DocumentationPage } from './pages/DocumentationPage';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [limits, setLimits] = useState<ServerLimits | null>(null);
  const [catalog, setCatalog] = useState<ExperimentCatalogItem[]>([]);
  const [activeJob, setActiveJob] = useState<JobSummary | null>(null);
  const [history, setHistory] = useState<SavedExperimentRun[]>([]);
  const [consoleEvents, setConsoleEvents] = useState<ConsoleEvent[]>([]);
  const [activeTraces, setActiveTraces] = useState<TraceEvent[]>([]);
  const [isGuidedDemo, setIsGuidedDemo] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);

  // Experiment result states
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [raceResult, setRaceResult] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [deadlockResult, setDeadlockResult] = useState<any>(null);
  const [threadPoolResult, setThreadPoolResult] = useState<any>(null);
  const [scalingResult, setScalingResult] = useState<any>(null);

  const activeEventSourceRef = useRef<EventSource | null>(null);

  const addConsoleEvent = (type: string, message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleEvents((prev) => [...prev, { timestamp, type, message, data }].slice(-500));
  };

  const refreshHistory = () => {
    setHistory(historyStorage.getAll());
  };

  const checkHealthAndLoadMetadata = async () => {
    try {
      await api.getHealth();
      setIsOnline(true);
      const [env, lim, cat] = await Promise.all([
        api.getEnvironment(),
        api.getLimits(),
        api.getCatalog(),
      ]);
      setEnvironment(env);
      setLimits(lim);
      setCatalog(cat);
      addConsoleEvent('SYSTEM', `Connected to ThreadForge Laboratory (Python ${env.python_version}, ${env.cpu_count} cores, GIL: ${env.gil_enabled ? 'Active' : 'Free-Threaded'}).`);
    } catch {
      setIsOnline(false);
      addConsoleEvent('OFFLINE', 'Backend offline. Run command: cmd /c .venv\\Scripts\\python.exe -m uvicorn backend.app.main:app --port 8000');
    }
  };

  useEffect(() => {
    checkHealthAndLoadMetadata();
    refreshHistory();
  }, []);

  // Poll or stream active job
  const subscribeToJobEvents = (jobId: string) => {
    if (activeEventSourceRef.current) {
      activeEventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/jobs/${jobId}/events`);
    activeEventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        addConsoleEvent('EVENT', `Job ${jobId}: ${parsed.type}`, parsed.data);
      } catch {
        // raw string
      }
    };

    eventSource.addEventListener('status_changed', (e: any) => {
      const data = JSON.parse(e.data);
      addConsoleEvent('STATUS', `Job ${jobId} status -> ${data.data?.status}`);
      if (['completed', 'failed', 'cancelled', 'timed_out'].includes(data.data?.status)) {
        eventSource.close();
        pollFinalResult(jobId);
      }
    });

    eventSource.addEventListener('progress', (e: any) => {
      const p = JSON.parse(e.data);
      addConsoleEvent('PROGRESS', `Trial ${p.data?.trial}: ${p.data?.duration_ms} ms (${p.data?.approach || p.data?.strategy || ''})`);
    });

    eventSource.addEventListener('result', (e: any) => {
      const res = JSON.parse(e.data);
      applyJobResult(res.experiment_type || activeJob?.experiment_type || '', res);
    });

    eventSource.onerror = () => {
      eventSource.close();
      pollFinalResult(jobId);
    };
  };

  const pollFinalResult = async (jobId: string) => {
    try {
      const job = await api.getJob(jobId);
      setActiveJob(job);
      if (job.result) {
        applyJobResult(job.experiment_type, job.result);
      }
    } catch (e: any) {
      addConsoleEvent('ERROR', `Failed to poll final job status: ${e.message}`);
    }
  };

  const applyJobResult = (expType: string, resultData: any) => {
    if (resultData.traces && resultData.traces.length > 0) {
      setActiveTraces(resultData.traces);
    }
    switch (expType) {
      case 'benchmark':
        setBenchmarkResult(resultData);
        break;
      case 'race-condition':
        setRaceResult(resultData);
        break;
      case 'synchronization':
        setSyncResult(resultData);
        break;
      case 'deadlock':
        setDeadlockResult(resultData);
        break;
      case 'thread-pool':
        setThreadPoolResult(resultData);
        break;
      case 'scaling':
        setScalingResult(resultData);
        break;
    }
    addConsoleEvent('RESULT', `Execution results verified for ${expType}.`);
  };

  const handleStartExperiment = async (expType: string, params: Record<string, any>) => {
    try {
      addConsoleEvent('START', `Queueing experiment: ${expType}...`, params);
      const res = await api.startExperiment(expType, params);
      addConsoleEvent('QUEUED', `Job scheduled with ID: ${res.job_id}`);
      setActiveJob({
        job_id: res.job_id,
        experiment_type: expType,
        status: 'running',
        progress_percent: 0,
        current_trial: 0,
        total_trials: 1,
        completed_tasks: 0,
        total_tasks: 1,
        message: 'Running experiment',
        created_at_iso: new Date().toISOString(),
      });
      subscribeToJobEvents(res.job_id);
    } catch (e: any) {
      if (e instanceof ApiError && e.code === 'CONCURRENT_JOB_RUNNING') {
        alert(`Concurrency Conflict (409): ${e.message}\n${e.hint || ''}`);
      } else {
        alert(`Execution Error: ${e.message}`);
      }
      addConsoleEvent('ERROR', e.message);
    }
  };

  const handleCancelActiveJob = async () => {
    if (!activeJob) return;
    try {
      await api.cancelJob(activeJob.job_id);
      addConsoleEvent('CANCEL', `Cancellation sent to job ${activeJob.job_id}`);
    } catch (e: any) {
      addConsoleEvent('ERROR', `Failed to cancel: ${e.message}`);
    }
  };

  const handleSaveToHistory = (res: any, config: any) => {
    if (!environment) return;
    const expName = currentPage.replace('_', '-');
    const saved = historyStorage.save({
      experiment_type: expName,
      timestamp: new Date().toISOString(),
      environment_snapshot: environment,
      configuration: config,
      result: res,
    });
    if (saved) {
      addConsoleEvent('SAVE', `Experiment saved to local history (${saved.id})`);
      refreshHistory();
    }
  };

  // Keyboard Shortcuts: Ctrl+Enter to run, Esc to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeJob) {
        handleCancelActiveJob();
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setCurrentPage('documentation');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeJob]);

  // Page title mapping
  const pageTitles: Record<PageId, string> = {
    overview: 'Overview Dashboard',
    concurrency_lab: 'Concurrency Lab',
    benchmark: 'Performance Benchmark',
    race_condition: 'Race Condition Laboratory',
    synchronization: 'Synchronization Comparison',
    deadlock: 'Deadlock Playground',
    thread_pool: 'Thread Pool Optimizer',
    timeline: 'Thread Timeline Gantt',
    scaling: 'Scaling Analyzer & Amdahl',
    history: 'Experiment History & Reports',
    documentation: 'Documentation & Viva Defense',
  };

  const isRunning = activeJob?.status === 'running' || activeJob?.status === 'queued';

  return (
    <div className="min-h-screen bg-paper text-heading flex flex-col font-sans">
      <TopBar
        pageTitle={pageTitles[currentPage]}
        isOnline={isOnline}
        onRetryConnection={checkHealthAndLoadMetadata}
        environment={environment}
        activeJob={activeJob}
        isGuidedDemo={isGuidedDemo}
        onToggleGuidedDemo={() => setIsGuidedDemo(!isGuidedDemo)}
      />

      {/* Guided Demo Banner if active */}
      {isGuidedDemo && (
        <div className="bg-primary text-white px-4 py-2 text-xs font-mono flex items-center justify-between z-30">
          <div className="flex items-center space-x-2">
            <span className="font-bold uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded">
              8-MIN DEMO STEP {demoStep + 1} / 5
            </span>
            <span>
              {demoStep === 0 && 'Step 1: Point to real environment hardware specs. Launch Benchmark wait-bound vs CPU.'}
              {demoStep === 1 && 'Step 2: Demonstrate Race Condition amplified window vs Mutex protection.'}
              {demoStep === 2 && 'Step 3: Show Synchronization fast-but-wrong badge and thread-local throughput.'}
              {demoStep === 3 && 'Step 4: Execute Deadlock controlled cycle and show Coffman conditions breakdown.'}
              {demoStep === 4 && 'Step 5: View Thread Timeline Gantt chart and export RFC 4180 CSV.'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const nextStep = (demoStep + 1) % 5;
                setDemoStep(nextStep);
                const stepPages: PageId[] = ['benchmark', 'race_condition', 'synchronization', 'deadlock', 'timeline'];
                setCurrentPage(stepPages[nextStep]);
              }}
              className="px-2 py-0.5 bg-white text-primary rounded font-bold hover:bg-white/90"
            >
              Next Step ›
            </button>
            <button onClick={() => setIsGuidedDemo(false)} className="text-white/80 hover:text-white">
              Exit Demo
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        <NavigationRail currentPage={currentPage} onSelectPage={(p) => setCurrentPage(p)} />

        <main className="flex-1 p-6 overflow-y-auto pb-16">
          {currentPage === 'overview' && (
            <OverviewDashboard
              catalog={catalog}
              environment={environment}
              activeJob={activeJob}
              history={history}
              onNavigate={(p) => setCurrentPage(p)}
              onQuickStart={(id, p) => {
                handleStartExperiment(id, p);
                const pMap: Record<string, PageId> = {
                  benchmark: 'benchmark',
                  'race-condition': 'race_condition',
                  synchronization: 'synchronization',
                  deadlock: 'deadlock',
                  'thread-pool': 'thread_pool',
                  scaling: 'scaling',
                };
                if (pMap[id]) setCurrentPage(pMap[id]);
              }}
            />
          )}

          {currentPage === 'concurrency_lab' && (
            <ConcurrencyLab
              catalog={catalog}
              environment={environment}
              onNavigate={(p) => setCurrentPage(p)}
              onQuickRun={(id, p) => {
                handleStartExperiment(id, p);
                const pMap: Record<string, PageId> = {
                  benchmark: 'benchmark',
                  'race-condition': 'race_condition',
                  synchronization: 'synchronization',
                  deadlock: 'deadlock',
                  'thread-pool': 'thread_pool',
                  scaling: 'scaling',
                };
                if (pMap[id]) setCurrentPage(pMap[id]);
              }}
            />
          )}

          {currentPage === 'benchmark' && (
            <PerformanceBenchmarkPage
              onRun={(p) => handleStartExperiment('benchmark', p)}
              onCancel={handleCancelActiveJob}
              isRunning={isRunning}
              result={benchmarkResult}
              environment={environment}
              onSaveToHistory={handleSaveToHistory}
            />
          )}

          {currentPage === 'race_condition' && (
            <RaceConditionPage
              onRun={(p) => handleStartExperiment('race-condition', p)}
              onCancel={handleCancelActiveJob}
              isRunning={isRunning}
              result={raceResult}
              environment={environment}
              onSaveToHistory={handleSaveToHistory}
            />
          )}

          {currentPage === 'synchronization' && (
            <SynchronizationPage
              onRun={(p) => handleStartExperiment('synchronization', p)}
              onCancel={handleCancelActiveJob}
              isRunning={isRunning}
              result={syncResult}
              environment={environment}
              onSaveToHistory={handleSaveToHistory}
            />
          )}

          {currentPage === 'deadlock' && (
            <DeadlockPage
              onRun={(p) => handleStartExperiment('deadlock', p)}
              onCancel={handleCancelActiveJob}
              isRunning={isRunning}
              result={deadlockResult}
              environment={environment}
              onSaveToHistory={handleSaveToHistory}
            />
          )}

          {currentPage === 'thread_pool' && (
            <ThreadPoolPage
              onRun={(p) => handleStartExperiment('thread-pool', p)}
              onCancel={handleCancelActiveJob}
              isRunning={isRunning}
              result={threadPoolResult}
              environment={environment}
              onSaveToHistory={handleSaveToHistory}
            />
          )}

          {currentPage === 'timeline' && (
            <TimelinePage history={history} activeTraces={activeTraces} />
          )}

          {currentPage === 'scaling' && (
            <ScalingPage
              onRun={(p) => handleStartExperiment('scaling', p)}
              onCancel={handleCancelActiveJob}
              isRunning={isRunning}
              result={scalingResult}
              environment={environment}
              onSaveToHistory={handleSaveToHistory}
            />
          )}

          {currentPage === 'history' && (
            <HistoryPage history={history} onRefreshHistory={refreshHistory} />
          )}

          {currentPage === 'documentation' && <DocumentationPage />}
        </main>
      </div>

      {/* Live Run Console */}
      <RunConsole events={consoleEvents} onClear={() => setConsoleEvents([])} />
    </div>
  );
};

export default App;
