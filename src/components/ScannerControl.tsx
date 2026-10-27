import React from 'react';
import type { BinaryBit } from '../lib/mux';
import { Play, Pause, FastForward, Clock, ArrowRight } from 'lucide-react';
import type { SensorState } from '../types/sensor';

interface ScannerControlProps {
  sensors: SensorState[];
  currentChannelIndex: number;
  nextChannelIndex: number;
  isAutoScanning: boolean;
  scanIntervalMs: number;
  lastScanTimestamp: string;
  onToggleAutoScan: () => void;
  onSelectChannel: (channelIndex: number) => void;
  onChangeInterval: (intervalMs: number) => void;
  onStepNext: () => void;
}

export const ScannerControl: React.FC<ScannerControlProps> = ({
  sensors,
  currentChannelIndex,
  nextChannelIndex,
  isAutoScanning,
  scanIntervalMs,
  lastScanTimestamp,
  onToggleAutoScan,
  onSelectChannel,
  onChangeInterval,
  onStepNext,
}) => {
  const currentSensor = sensors[currentChannelIndex];
  const nextSensor = sensors[nextChannelIndex];

  // Convert current index to S1 and S0 bits
  const s1 = ((currentChannelIndex >> 1) & 1) as BinaryBit;
  const s0 = (currentChannelIndex & 1) as BinaryBit;

  return (
    <div className="bg-white border border-[#DED8CC] rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-[#DED8CC] gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#18352A] flex items-center gap-2">
            <FastForward className="w-4 h-4 text-[#14532D]" />
            Multiplexer Polling & Channel Scanner Control
          </h3>
          <p className="text-xs text-[#3D5549] mt-0.5">
            Configure manual address selection or automated round-robin time-division polling across sensors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAutoScan}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              isAutoScanning
                ? 'bg-[#14532D] text-[#FAF9F6] ring-2 ring-[#14532D]/30'
                : 'bg-[#EDE4D3] text-[#18352A] hover:bg-[#DED8CC]'
            }`}
          >
            {isAutoScanning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Auto-Scanning Active</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Enable Auto-Scan</span>
              </>
            )}
          </button>

          <button
            onClick={onStepNext}
            disabled={isAutoScanning}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#DED8CC] ${
              isAutoScanning
                ? 'opacity-40 cursor-not-allowed bg-[#FAF9F6] text-[#3D5549]'
                : 'bg-[#EDE4D3] text-[#18352A] hover:bg-[#DED8CC]'
            }`}
            title="Step to next enabled channel manually"
          >
            <span>Next Ch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Channel Selection Buttons */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-[#3D5549] block">
            Manual Select (Sets S1, S0 bits):
          </span>
          <div className="grid grid-cols-2 gap-2">
            {sensors.map((sensor, idx) => {
              const isSelected = currentChannelIndex === idx;
              const sensorS1 = (idx >> 1) & 1;
              const sensorS0 = idx & 1;
              return (
                <button
                  key={sensor.id}
                  onClick={() => onSelectChannel(idx)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-[#F0FDF4] border-[#14532D] ring-2 ring-[#14532D]/20 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#DED8CC] hover:bg-[#EDE4D3]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#14532D]">
                      {sensor.key}
                    </span>
                    <span className="font-mono text-[10px] text-[#3D5549]">
                      S1S0={sensorS1}{sensorS0}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#18352A] truncate">
                    {sensor.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Polling State & Cycle Indicators */}
        <div className="p-3 bg-[#FAF9F6] border border-[#DED8CC] rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#3D5549]">Current Polled Channel:</span>
            <span className="font-mono font-bold text-[#14532D] bg-[#EDE4D3] px-2 py-0.5 rounded border border-[#DED8CC]">
              {currentSensor.key} (S1={s1}, S0={s0})
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#3D5549]">Next Scheduled Channel:</span>
            <span className="font-mono font-bold text-[#18352A] bg-white px-2 py-0.5 rounded border border-[#DED8CC]">
              {nextSensor.key} ({nextSensor.name})
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#3D5549] pt-1.5 border-t border-[#DED8CC]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#14532D]" />
              Last Polled:
            </span>
            <span className="font-mono font-semibold text-[#18352A]">
              {lastScanTimestamp || 'Initializing...'}
            </span>
          </div>
        </div>

        {/* Auto-Scan Interval Slider & Hardware Timing Note */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#3D5549]">Auto-Scan Interval:</span>
            <span className="font-mono font-bold text-[#14532D]">
              {(scanIntervalMs / 1000).toFixed(1)} seconds
            </span>
          </div>

          <input
            type="range"
            min="1000"
            max="6000"
            step="500"
            value={scanIntervalMs}
            onChange={(e) => onChangeInterval(Number(e.target.value))}
            className="w-full accent-[#14532D] cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-[#3D5549] font-mono">
            <span>Fast (1.0s)</span>
            <span>Standard (3.0s)</span>
            <span>Slow (6.0s)</span>
          </div>

          <p className="text-[10px] text-[#3D5549] italic bg-[#EDE4D3] p-1.5 rounded border border-[#DED8CC]">
            Note: In physical data acquisition, MUX settling time (t<sub>SETTLE</sub> ~ 1-5 µs) is much faster than display polling intervals.
          </p>
        </div>
      </div>
    </div>
  );
};
