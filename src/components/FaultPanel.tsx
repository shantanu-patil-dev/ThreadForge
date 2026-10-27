import React from 'react';
import type { FaultScenario } from '../types/sensor';
import {
  ShieldCheck,
  Flame,
  Gauge,
  Activity,
  Unplug,
  AlertOctagon,
  RotateCcw,
  Info,
} from 'lucide-react';

interface FaultPanelProps {
  currentScenario: FaultScenario;
  onSelectScenario: (scenario: FaultScenario) => void;
  onResetScenario: () => void;
}

export const FaultPanel: React.FC<FaultPanelProps> = ({
  currentScenario,
  onSelectScenario,
  onResetScenario,
}) => {
  const scenarios: {
    id: FaultScenario;
    label: string;
    icon: React.ElementType;
    badge: 'NORMAL' | 'THRESHOLD_WARNING' | 'COMMUNICATION_FAILURE' | 'INVALID_ADC';
    channelKey: string;
    description: string;
    physicalContext: string;
    alertColor: string;
  }[] = [
    {
      id: 'NORMAL',
      label: 'Normal Nominal State',
      icon: ShieldCheck,
      badge: 'NORMAL',
      channelKey: 'All D0–D3',
      description: 'All 4 sensor channels operate within calibrated safe thresholds.',
      physicalContext: 'Healthy mechanical baseline with standard environmental noise.',
      alertColor: '#14532D',
    },
    {
      id: 'HIGH_TEMP',
      label: 'High Temperature Spike',
      icon: Flame,
      badge: 'THRESHOLD_WARNING',
      channelKey: 'Channel D0',
      description: 'Bearing temperature spikes above safe trip limit (>85.0°C).',
      physicalContext: 'Simulates bearing friction, lubrication starvation, or cooling jacket failure.',
      alertColor: '#B42318',
    },
    {
      id: 'PRESSURE_SPIKE',
      label: 'Hydraulic Pressure Surge',
      icon: Gauge,
      badge: 'THRESHOLD_WARNING',
      channelKey: 'Channel D1',
      description: 'Hydraulic line pressure surges to 11.4 bar (critical threshold = 10.0 bar).',
      physicalContext: 'Simulates relief valve blockage or accumulator pressure surge.',
      alertColor: '#B42318',
    },
    {
      id: 'VIBRATION_FAULT',
      label: 'Turbine Vibration Anomaly',
      icon: Activity,
      badge: 'THRESHOLD_WARNING',
      channelKey: 'Channel D2',
      description: 'Bearing vibration velocity reaches 5.2 mm/s, breaching ISO 10816 Class II limit.',
      physicalContext: 'Simulates rotor unbalance, shaft misalignment, or impeller blade pitting.',
      alertColor: '#B42318',
    },
    {
      id: 'SENSOR_DISCONNECTED',
      label: 'Open-Circuit Wire Break',
      icon: Unplug,
      badge: 'COMMUNICATION_FAILURE',
      channelKey: 'Channel D3',
      description: 'Sensor loop opens. Input drops to 0.00V pull-down showing "NO SIGNAL".',
      physicalContext: 'Simulates cut cable, loosened screw terminal, or probe detachment in plant.',
      alertColor: '#B7791F',
    },
    {
      id: 'INVALID_READING',
      label: 'ADC Rail Saturation / Error',
      icon: AlertOctagon,
      badge: 'INVALID_ADC',
      channelKey: 'Channel D1',
      description: 'Raw voltage jumps to 5.65V, exceeding microcontroller 5.00V ADC reference.',
      physicalContext: 'Simulates internal sensor op-amp short to unregulated Vcc power rail.',
      alertColor: '#B42318',
    },
  ];

  return (
    <div className="bg-white border border-[#DED8CC] rounded-xl p-5 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#DED8CC] gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#18352A] flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-[#B42318]" />
            Fault Injection & Diagnostic Simulation Panel
          </h3>
          <p className="text-xs text-[#3D5549] mt-0.5">
            Test how the 4:1 multiplexer and monitoring firmware distinguish between normal readings, physical threshold violations, open-circuit breaks, and ADC hardware failures.
          </p>
        </div>

        <button
          onClick={onResetScenario}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EDE4D3] text-[#18352A] hover:bg-[#DED8CC] transition-colors"
          title="Reset to Normal Nominal Operation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Faults</span>
        </button>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isActive = currentScenario === sc.id;
          return (
            <div
              key={sc.id}
              className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
                isActive
                  ? 'bg-[#F0FDF4] border-[#14532D] ring-2 ring-[#14532D]/20 shadow-sm'
                  : 'bg-[#FAF9F6] border-[#DED8CC] hover:bg-white hover:border-[#B3ABA0]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive
                          ? 'bg-[#14532D] text-[#FAF9F6]'
                          : 'bg-[#EDE4D3] text-[#18352A]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#18352A] leading-tight">
                        {sc.label}
                      </h4>
                      <span className="font-mono text-[10px] text-[#3D5549]">
                        Target: {sc.channelKey}
                      </span>
                    </div>
                  </div>

                  {/* Badge */}
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                      sc.badge === 'NORMAL'
                        ? 'bg-[#F0FDF4] text-[#14532D] border border-[#86EFAC]'
                        : sc.badge === 'COMMUNICATION_FAILURE'
                        ? 'bg-[#EDE4D3] text-[#3D5549] border border-[#DED8CC]'
                        : sc.badge === 'INVALID_ADC'
                        ? 'bg-[#FEE2E2] text-[#B42318] border border-[#B42318]'
                        : 'bg-[#FEF3C7] text-[#B7791F] border border-[#B7791F]'
                    }`}
                  >
                    {sc.badge.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-[#18352A] font-medium mb-1.5">
                  {sc.description}
                </p>

                <p className="text-[11px] text-[#3D5549] bg-[#EDE4D3]/60 p-2 rounded border border-[#DED8CC]/60 leading-relaxed mb-3">
                  <strong>Engineering Cause:</strong> {sc.physicalContext}
                </p>
              </div>

              <button
                onClick={() => onSelectScenario(sc.id)}
                className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#14532D] text-[#FAF9F6] shadow-xs cursor-default'
                    : 'bg-[#EDE4D3] text-[#18352A] hover:bg-[#14532D] hover:text-[#FAF9F6]'
                }`}
              >
                {isActive ? 'Scenario Active in System' : 'Inject This Fault'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Distinction Guide Footer */}
      <div className="mt-4 p-3 bg-[#EDE4D3] border border-[#DED8CC] rounded-lg flex items-start gap-2.5 text-xs text-[#3D5549]">
        <Info className="w-4 h-4 text-[#14532D] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-[#18352A]">Educational Note on Diagnostic Classification:</strong>
          <p>
            An industrial monitoring system must never confuse an <strong>open-circuit break</strong> (zero voltage / no signal) with a <strong>threshold violation</strong> (valid reading beyond safe limit) or an <strong>analog ADC saturation failure</strong> (input exceeding V<sub>REF</sub>). All 4 scenarios are verified separately above.
          </p>
        </div>
      </div>
    </div>
  );
};
