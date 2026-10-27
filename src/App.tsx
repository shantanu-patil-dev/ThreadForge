import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import type { NavTabId } from './components/Navigation';
import { OverviewPage } from './components/pages/OverviewPage';
import { MonitoringPage } from './components/pages/MonitoringPage';
import { MuxExplorerPage } from './components/pages/MuxExplorerPage';
import { ExperimentLabPage } from './components/pages/ExperimentLabPage';
import { SensorConfigPage } from './components/pages/SensorConfigPage';
import { DocumentationPage } from './components/pages/DocumentationPage';
import { FaultPanel } from './components/FaultPanel';
import type { BinaryBit } from './lib/mux';
import type {
  SensorConfig,
  SensorState,
  FaultScenario,
  SystemEvent,
} from './types/sensor';
import {
  loadSensorConfigs,
  saveSensorConfigs,
  resetSensorConfigs,
  initializeSensorStates,
  simulateChannelReading,
} from './lib/sensorSim';

export const App: React.FC = () => {
  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTabId>('overview');

  // Operational Mode (Simulation mode active, Hardware mode documented as future integration)
  const [systemMode] = useState<'SIMULATION' | 'HARDWARE'>('SIMULATION');

  // Sensor configurations and state
  const [configs, setConfigs] = useState<SensorConfig[]>(loadSensorConfigs);
  const [sensors, setSensors] = useState<SensorState[]>(() =>
    initializeSensorStates(configs)
  );

  // MUX Select Lines
  const [s1, setS1] = useState<BinaryBit>(0);
  const [s0, setS0] = useState<BinaryBit>(0);

  // Polling / Scanning state
  const [isAutoScanning, setIsAutoScanning] = useState<boolean>(false);
  const [scanIntervalMs, setScanIntervalMs] = useState<number>(3000);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string>('');

  // Active fault scenario
  const [faultScenario, setFaultScenario] = useState<FaultScenario>('NORMAL');

  // System Diagnostics Events
  const [events, setEvents] = useState<SystemEvent[]>([
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour12: false }),
      type: 'INFO',
      message: '4:1 MUX Data Acquisition Controller initialized in Simulation Mode.',
      details: 'All 4 transducer channels calibrated. Single ADC channel online.',
    },
  ]);

  const currentChannelIndex = (s1 << 1) | s0;

  // Calculate next channel in round-robin sequence (skipping disabled channels)
  const getNextChannelIndex = (currentIdx: number): number => {
    for (let offset = 1; offset <= 4; offset++) {
      const candidate = (currentIdx + offset) % 4;
      if (sensors[candidate].enabled) {
        return candidate;
      }
    }
    return currentIdx;
  };

  const nextChannelIndex = getNextChannelIndex(currentChannelIndex);

  // Helper to append diagnostic event
  const addEvent = (
    type: SystemEvent['type'],
    message: string,
    details?: string,
    channelId?: 0 | 1 | 2 | 3
  ) => {
    const newEvt: SystemEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour12: false }),
      type,
      message,
      details,
      channelId,
    };
    setEvents((prev) => [newEvt, ...prev.slice(0, 49)]); // keep last 50
  };

  // Channel selection handler (updates S1, S0 select bits)
  const handleSelectChannel = (channelIdx: number) => {
    const newS1 = ((channelIdx >> 1) & 1) as BinaryBit;
    const newS0 = (channelIdx & 1) as BinaryBit;
    setS1(newS1);
    setS0(newS0);
    setLastScanTimestamp(new Date().toLocaleTimeString([], { hour12: false }));

    addEvent(
      'INFO',
      `MUX Select Lines changed to S1S0=${newS1}${newS0}. Routing Channel D${channelIdx} (${sensors[channelIdx].name}).`,
      `Time-division switch updated hardware bus address to input ${channelIdx}.`
    );
  };

  // Step to next channel manually
  const handleStepNext = () => {
    handleSelectChannel(nextChannelIndex);
  };

  // Toggle auto scan mode
  const handleToggleAutoScan = () => {
    const nextState = !isAutoScanning;
    setIsAutoScanning(nextState);
    addEvent(
      'INFO',
      nextState
        ? `Automatic channel scanning enabled (${(scanIntervalMs / 1000).toFixed(1)}s interval).`
        : 'Automatic channel scanning paused. Manual channel addressing active.'
    );
  };

  // Interval timer for telemetry updates and auto-scanning
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Advance channel if auto-scanning is enabled
      if (isAutoScanning) {
        const nextIdx = getNextChannelIndex(currentChannelIndex);
        const newS1 = ((nextIdx >> 1) & 1) as BinaryBit;
        const newS0 = (nextIdx & 1) as BinaryBit;
        setS1(newS1);
        setS0(newS0);
        setLastScanTimestamp(new Date().toLocaleTimeString([], { hour12: false }));
      }

      // 2. Sample and update all channels
      setSensors((prev) => {
        const updated = prev.map((channel) =>
          simulateChannelReading(channel, faultScenario)
        );

        // Check for newly triggered threshold breaches on the active channel
        const activeCh = updated[currentChannelIndex];
        if (activeCh.status === 'CRITICAL' && prev[currentChannelIndex].status !== 'CRITICAL') {
          addEvent(
            'CRITICAL',
            `Critical trip breached on ${activeCh.key} (${activeCh.name})`,
            activeCh.statusMessage,
            activeCh.id
          );
        } else if (activeCh.status === 'WARNING' && prev[currentChannelIndex].status === 'OK') {
          addEvent(
            'WARNING',
            `Warning threshold approached on ${activeCh.key} (${activeCh.name})`,
            activeCh.statusMessage,
            activeCh.id
          );
        }

        return updated;
      });
    }, isAutoScanning ? scanIntervalMs : 2000);

    return () => clearInterval(interval);
  }, [isAutoScanning, scanIntervalMs, currentChannelIndex, faultScenario, sensors]);

  // Fault scenario handler
  const handleSelectFault = (scenario: FaultScenario) => {
    setFaultScenario(scenario);
    if (scenario === 'NORMAL') {
      addEvent('INFO', 'Fault scenario reset. All sensors operating within normal parameters.');
    } else {
      addEvent(
        'FAULT_INJECTION',
        `Fault scenario activated: ${scenario.replace('_', ' ')}`,
        'Demonstrating hardware anomaly classification and alert generation.'
      );
    }
  };

  // Reset Demo to factory defaults
  const handleResetDemo = () => {
    const defaultConfigs = resetSensorConfigs();
    setConfigs(defaultConfigs);
    setSensors(initializeSensorStates(defaultConfigs));
    setS1(0);
    setS0(0);
    setIsAutoScanning(false);
    setFaultScenario('NORMAL');
    setLastScanTimestamp(new Date().toLocaleTimeString([], { hour12: false }));
    addEvent(
      'INFO',
      'System Demo reset to factory initial state.',
      'All channels enabled, nominal baselines restored, select address set to S1S0=00.'
    );
  };

  // Save updated configurations
  const handleSaveConfigs = (newConfigs: SensorConfig[]) => {
    saveSensorConfigs(newConfigs);
    setConfigs(newConfigs);
    setSensors((prev) =>
      prev.map((ch, idx) => ({
        ...ch,
        ...newConfigs[idx],
      }))
    );
    addEvent('CONFIG_CHANGE', 'Sensor channel parameters and threshold settings updated in storage.');
  };

  // Restore configs
  const handleRestoreDefaultConfigs = () => {
    handleResetDemo();
  };

  // Active alerts count
  const activeAlertCount = sensors.filter(
    (s) => s.status === 'WARNING' || s.status === 'CRITICAL' || s.status === 'INVALID' || s.status === 'DISCONNECTED'
  ).length;

  const currentSensor = sensors[currentChannelIndex];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#18352A] flex flex-col font-sans">
      {/* Header */}
      <Header
        systemMode={systemMode}
        activeAlertCount={activeAlertCount}
        selectedChannelName={currentSensor.name}
        selectedChannelKey={currentSensor.key}
        onResetDemo={handleResetDemo}
      />

      {/* Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {currentTab === 'overview' && (
          <OverviewPage
            sensors={sensors}
            selectedChannelIndex={currentChannelIndex}
            s1={s1}
            s0={s0}
            systemMode={systemMode}
            currentScenario={faultScenario}
            events={events}
            onNavigate={setCurrentTab}
            onSelectChannel={handleSelectChannel}
          />
        )}

        {currentTab === 'monitoring' && (
          <MonitoringPage
            sensors={sensors}
            currentChannelIndex={currentChannelIndex}
            nextChannelIndex={nextChannelIndex}
            isAutoScanning={isAutoScanning}
            scanIntervalMs={scanIntervalMs}
            lastScanTimestamp={lastScanTimestamp}
            onSelectChannel={handleSelectChannel}
            onToggleAutoScan={handleToggleAutoScan}
            onChangeInterval={setScanIntervalMs}
            onStepNext={handleStepNext}
          />
        )}

        {currentTab === 'mux-explorer' && <MuxExplorerPage />}

        {currentTab === 'experiment-lab' && <ExperimentLabPage />}

        {currentTab === 'fault-simulator' && (
          <div className="space-y-6">
            <FaultPanel
              currentScenario={faultScenario}
              onSelectScenario={handleSelectFault}
              onResetScenario={() => handleSelectFault('NORMAL')}
            />

            {/* Quick Link to Monitor */}
            <div className="p-4 bg-white border border-[#DED8CC] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-xs font-bold text-[#18352A] block">
                  Verify Live Telemetry Impact:
                </span>
                <p className="text-xs text-[#3D5549]">
                  Switch to the Live Monitoring page to observe how this fault renders on the real-time telemetry chart and channel status pills.
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('monitoring')}
                className="px-4 py-2 bg-[#14532D] hover:bg-[#166534] text-[#FAF9F6] text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                Go to Live Monitoring →
              </button>
            </div>
          </div>
        )}

        {currentTab === 'sensor-config' && (
          <SensorConfigPage
            configs={configs}
            onSaveConfigs={handleSaveConfigs}
            onRestoreDefaults={handleRestoreDefaultConfigs}
          />
        )}

        {currentTab === 'documentation' && <DocumentationPage />}
      </main>

      {/* Industrial Footer */}
      <footer className="bg-[#EDE4D3] border-t border-[#DED8CC] py-4 px-4 lg:px-8 text-xs text-[#3D5549] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#18352A]">
              Smart 4:1 Multiplexer Monitoring System
            </span>
            <span>•</span>
            <span>Electronics & Communication Engineering DAQ Demo</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Palette: Warm White #FAF9F6 / Bottle Green #14532D</span>
            <span>•</span>
            <span className="text-[#14532D] font-bold">http://localhost:3000</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
