import React from 'react';
import type { SensorState } from '../../types/sensor';
import { SensorCard } from '../SensorCard';
import { LiveChart } from '../LiveChart';
import { ScannerControl } from '../ScannerControl';
import { Activity, Cpu } from 'lucide-react';

interface MonitoringPageProps {
  sensors: SensorState[];
  currentChannelIndex: number;
  nextChannelIndex: number;
  isAutoScanning: boolean;
  scanIntervalMs: number;
  lastScanTimestamp: string;
  onSelectChannel: (idx: number) => void;
  onToggleAutoScan: () => void;
  onChangeInterval: (ms: number) => void;
  onStepNext: () => void;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({
  sensors,
  currentChannelIndex,
  nextChannelIndex,
  isAutoScanning,
  scanIntervalMs,
  lastScanTimestamp,
  onSelectChannel,
  onToggleAutoScan,
  onChangeInterval,
  onStepNext,
}) => {
  const currentSensor = sensors[currentChannelIndex];
  const s1 = (currentChannelIndex >> 1) & 1;
  const s0 = currentChannelIndex & 1;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#DED8CC] gap-2">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#18352A] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#14532D]" />
            Live Multi-Channel Telemetry & Sampling
          </h2>
          <p className="text-xs text-[#3D5549] mt-0.5">
            Real-time monitoring of all 4 input lines multiplexed through select bus address S1S0 = {s1}{s0}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#3D5549]">Active MUX Bridge:</span>
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[#14532D] text-[#FAF9F6]">
            {currentSensor.key} → ADC [{currentSensor.name}]
          </span>
        </div>
      </div>

      {/* Scanner Control Bar */}
      <ScannerControl
        sensors={sensors}
        currentChannelIndex={currentChannelIndex}
        nextChannelIndex={nextChannelIndex}
        isAutoScanning={isAutoScanning}
        scanIntervalMs={scanIntervalMs}
        lastScanTimestamp={lastScanTimestamp}
        onToggleAutoScan={onToggleAutoScan}
        onSelectChannel={onSelectChannel}
        onChangeInterval={onChangeInterval}
        onStepNext={onStepNext}
      />

      {/* 4 Sensor Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sensors.map((sensor, idx) => (
          <SensorCard
            key={sensor.id}
            sensor={sensor}
            isSelected={currentChannelIndex === idx}
            onSelect={() => onSelectChannel(idx)}
          />
        ))}
      </div>

      {/* Live Chart Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#18352A]">
              Historical Telemetry Stream
            </h3>
            <span className="text-xs text-[#3D5549]">
              (Currently charting channel <strong className="text-[#14532D] font-mono">{currentSensor.key}</strong>)
            </span>
          </div>

          <div className="text-xs text-[#3D5549] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#14532D]" />
            <span>ADC Resolution: 10-bit (4.88 mV/LSB)</span>
          </div>
        </div>

        <LiveChart sensor={currentSensor} />
      </div>
    </div>
  );
};
