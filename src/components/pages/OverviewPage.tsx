import React from 'react';
import type { SensorState, SystemEvent, FaultScenario } from '../../types/sensor';
import type { BinaryBit } from '../../lib/mux';
import {
  Layers,
  Activity,
  AlertTriangle,
  Cpu,
  ArrowRight,
  ListFilter,
  ShieldCheck,
  Split,
} from 'lucide-react';
import type { NavTabId } from '../Navigation';

interface OverviewPageProps {
  sensors: SensorState[];
  selectedChannelIndex: number;
  s1: BinaryBit;
  s0: BinaryBit;
  systemMode: 'SIMULATION' | 'HARDWARE';
  currentScenario: FaultScenario;
  events: SystemEvent[];
  onNavigate: (tab: NavTabId) => void;
  onSelectChannel: (idx: number) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  sensors,
  selectedChannelIndex,
  s1,
  s0,
  systemMode,
  currentScenario,
  events,
  onNavigate,
  onSelectChannel,
}) => {
  const currentSensor = sensors[selectedChannelIndex];
  const activeAlerts = sensors.filter(
    (s) => s.status === 'WARNING' || s.status === 'CRITICAL' || s.status === 'INVALID' || s.status === 'DISCONNECTED'
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner with Executive Overview */}
      <div className="bg-white border border-[#DED8CC] rounded-xl p-6 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDE4D3] text-[#14532D] text-xs font-semibold mb-3 border border-[#DED8CC]">
            <Cpu className="w-3.5 h-3.5" />
            <span>Electronics & Instrumentation Project</span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-[#18352A] tracking-tight">
            Smart Industrial 4:1 Multiplexer Monitoring System
          </h2>

          <p className="text-sm text-[#3D5549] mt-2 leading-relaxed">
            In multi-sensor industrial applications, individual ADCs for every transducer introduce excessive hardware cost, pin count overhead, and board footprint. This system demonstrates how a <strong>4:1 Multiplexer (MUX)</strong> time-division selects between four real-time transducers—<strong>Bearing Temperature, Hydraulic Pressure, Vibration Velocity, and Humidity</strong>—funneling all four signals into a single ADC measurement channel with automated fault discrimination.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('monitoring')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#14532D] hover:bg-[#166534] text-[#FAF9F6] text-xs font-bold rounded-lg transition-colors shadow-xs"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Launch Live Monitoring</span>
            </button>

            <button
              onClick={() => onNavigate('mux-explorer')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#EDE4D3] hover:bg-[#DED8CC] text-[#18352A] text-xs font-bold rounded-lg border border-[#DED8CC] transition-colors"
            >
              <Split className="w-3.5 h-3.5 text-[#14532D]" />
              <span>Explore 4:1 MUX Gates</span>
            </button>

            <button
              onClick={() => onNavigate('experiment-lab')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FAF9F6] hover:bg-[#EDE4D3] text-[#18352A] text-xs font-bold rounded-lg border border-[#DED8CC] transition-colors"
            >
              <span>Exhaustive Truth Table Test (64 Cases)</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#14532D]" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: System Mode */}
        <div className="p-4 bg-white border border-[#DED8CC] rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-[#3D5549] block">Operation Mode</span>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-base font-bold text-[#18352A]">
              {systemMode === 'SIMULATION' ? 'Simulation Engine' : 'Hardware (Dummy)'}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#14532D] animate-ping"></span>
          </div>
          <p className="text-[11px] text-[#3D5549] mt-1">
            Pure mathematical MUX gate logic running
          </p>
        </div>

        {/* Metric 2: Multiplexer Selection */}
        <div className="p-4 bg-white border border-[#DED8CC] rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-[#3D5549] block">Active MUX Address</span>
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-mono text-xl font-black text-[#14532D]">
              S1S0 = {s1}{s0}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded font-bold bg-[#EDE4D3] text-[#14532D]">
              CH D{selectedChannelIndex}
            </span>
          </div>
          <p className="text-[11px] text-[#3D5549] mt-1">
            Bridged to: {currentSensor.name}
          </p>
        </div>

        {/* Metric 3: Active Reading */}
        <div className="p-4 bg-white border border-[#DED8CC] rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-[#3D5549] block">MUX Output Reading</span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="font-mono text-xl font-black text-[#18352A]">
              {currentSensor.currentValue !== null ? currentSensor.currentValue : 'NO SIGNAL'}
            </span>
            <span className="text-xs font-bold text-[#3D5549]">{currentSensor.unit}</span>
          </div>
          <p className="text-[11px] font-mono text-[#3D5549] mt-1">
            Raw: {currentSensor.rawVoltage !== null ? `${currentSensor.rawVoltage.toFixed(2)} V` : '0.00 V'}
          </p>
        </div>

        {/* Metric 4: System Health */}
        <div className="p-4 bg-white border border-[#DED8CC] rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-[#3D5549] block">System Health Status</span>
          <div className="flex items-center gap-2 mt-1.5">
            {activeAlerts.length > 0 ? (
              <>
                <AlertTriangle className="w-5 h-5 text-[#B7791F]" />
                <span className="text-sm font-bold text-[#B7791F]">
                  {activeAlerts.length} Fault/Alert Active
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-[#14532D]" />
                <span className="text-sm font-bold text-[#14532D]">
                  All 4 Lines Nominal
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-[#3D5549] mt-1">
            Scenario: <strong className="text-[#18352A]">{currentScenario}</strong>
          </p>
        </div>
      </div>

      {/* Data Acquisition Chain Diagram */}
      <div className="bg-white border border-[#DED8CC] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DED8CC]">
          <div>
            <h3 className="text-sm font-bold text-[#18352A] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#14532D]" />
              Data Acquisition (DAQ) System Architecture
            </h3>
            <p className="text-xs text-[#3D5549] mt-0.5">
              Demonstrating 4 transducers sharing a single analog-to-digital converter (ADC) via solid-state CMOS multiplexing.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#EDE4D3] text-[#14532D] rounded">
            Resource Sharing Principle
          </span>
        </div>

        {/* Responsive Architecture Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
          {/* Step 1: 4 Sensors */}
          <div className="p-3.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#14532D] block mb-1">
              Stage 1: Transducers
            </span>
            <h4 className="text-xs font-bold text-[#18352A]">4 Field Sensors</h4>
            <div className="text-[11px] text-[#3D5549] font-mono mt-1.5 space-y-0.5 text-left bg-white p-2 rounded border border-[#DED8CC]">
              <div>• D0: Temp (°C)</div>
              <div>• D1: Pressure (bar)</div>
              <div>• D2: Vibration (mm/s)</div>
              <div>• D3: Humidity (%RH)</div>
            </div>
          </div>

          {/* Step 2: 4:1 Multiplexer */}
          <div className="p-3.5 bg-[#F0FDF4] border border-[#14532D] rounded-lg relative ring-2 ring-[#14532D]/20">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#14532D] block mb-1">
              Stage 2: Selector
            </span>
            <h4 className="text-xs font-bold text-[#14532D]">4:1 MUX (CD4052 / 74HC153)</h4>
            <div className="text-[11px] text-[#14532D] font-mono mt-1.5 bg-white p-2 rounded border border-[#86EFAC] text-left">
              <div>S1={s1}, S0={s0} selects D{selectedChannelIndex}</div>
              <div className="font-bold text-[#18352A] mt-1">Output = CH {selectedChannelIndex}</div>
            </div>
          </div>

          {/* Step 3: Single ADC Channel */}
          <div className="p-3.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#14532D] block mb-1">
              Stage 3: Quantization
            </span>
            <h4 className="text-xs font-bold text-[#18352A]">Single ADC Channel</h4>
            <div className="text-[11px] text-[#3D5549] font-mono mt-1.5 bg-white p-2 rounded border border-[#DED8CC] text-left">
              <div>• Resolution: 10/12-bit</div>
              <div>• Voltage Ref: 5.00V</div>
              <div>• Saves 3 ADC hardware units!</div>
            </div>
          </div>

          {/* Step 4: Microcontroller & Web App */}
          <div className="p-3.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#14532D] block mb-1">
              Stage 4: Diagnostics
            </span>
            <h4 className="text-xs font-bold text-[#18352A]">Firmware / Web UI</h4>
            <div className="text-[11px] text-[#3D5549] font-mono mt-1.5 bg-white p-2 rounded border border-[#DED8CC] text-left">
              <div>• Round-Robin Polling</div>
              <div>• Threshold Comparison</div>
              <div>• Fault Classification</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Channel Matrix & Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Channel Matrix (Left 7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#DED8CC] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DED8CC]">
            <h3 className="text-sm font-bold text-[#18352A] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#14532D]" />
              Sensor Channel Quick Status Matrix
            </h3>
            <button
              onClick={() => onNavigate('monitoring')}
              className="text-xs text-[#14532D] font-bold hover:underline flex items-center gap-1"
            >
              <span>View Live Charts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {sensors.map((sensor, idx) => {
              const isSelected = selectedChannelIndex === idx;
              return (
                <div
                  key={sensor.id}
                  className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#F0FDF4] border-[#14532D] ring-1 ring-[#14532D]/30 shadow-xs'
                      : 'bg-[#FAF9F6] border-[#DED8CC] hover:bg-[#EDE4D3]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-[#EDE4D3] text-[#14532D] border border-[#DED8CC]">
                      {sensor.key}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[#18352A]">{sensor.name}</h4>
                      <span className="text-[11px] text-[#3D5549]">
                        Thresholds: Warn ≥ {sensor.threshold} | Crit ≥ {sensor.criticalThreshold} {sensor.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-sm font-black text-[#18352A]">
                        {sensor.currentValue !== null ? `${sensor.currentValue} ${sensor.unit}` : 'NO SIGNAL'}
                      </div>
                      <span className="text-[10px] font-mono text-[#3D5549]">
                        {sensor.rawVoltage !== null ? `${sensor.rawVoltage.toFixed(2)}V` : '0.00V'}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectChannel(idx)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                        isSelected
                          ? 'bg-[#14532D] text-[#FAF9F6]'
                          : 'bg-[#EDE4D3] text-[#18352A] hover:bg-[#DED8CC]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Route'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-Time Diagnostics Event Log (Right 5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#DED8CC] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#DED8CC]">
              <h3 className="text-sm font-bold text-[#18352A] flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-[#14532D]" />
                Recent System Events & Alerts
              </h3>
              <span className="text-[10px] font-mono text-[#3D5549]">
                Live Buffer
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <p className="text-xs text-[#3D5549] text-center py-8">
                  No system anomalies recorded. All channels nominal.
                </p>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-lg border text-xs bg-[#FAF9F6] border-[#DED8CC]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#3D5549]">
                        {evt.timeFormatted}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          evt.type === 'CRITICAL'
                            ? 'bg-[#FEE2E2] text-[#B42318]'
                            : evt.type === 'WARNING'
                            ? 'bg-[#FEF3C7] text-[#B7791F]'
                            : 'bg-[#EDE4D3] text-[#14532D]'
                        }`}
                      >
                        {evt.type}
                      </span>
                    </div>
                    <p className="font-semibold text-[#18352A]">{evt.message}</p>
                    {evt.details && (
                      <p className="text-[11px] text-[#3D5549] mt-0.5">{evt.details}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#DED8CC] text-[11px] text-[#3D5549] flex items-center justify-between">
            <span>Buffer length: {events.length} events</span>
            <button
              onClick={() => onNavigate('fault-simulator')}
              className="text-[#14532D] font-bold hover:underline"
            >
              Simulate Fault Scenarios →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
