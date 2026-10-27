import React from 'react';
import { Cpu, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  systemMode: 'SIMULATION' | 'HARDWARE';
  activeAlertCount: number;
  selectedChannelName: string;
  selectedChannelKey: string;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemMode,
  activeAlertCount,
  selectedChannelName,
  selectedChannelKey,
  onResetDemo,
}) => {
  return (
    <header className="bg-[#FAF9F6] border-b border-[#DED8CC] sticky top-0 z-40 px-4 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Title and Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#14532D] text-[#FAF9F6] flex items-center justify-center shadow-xs">
            <Cpu className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#18352A]">
                Smart 4:1 Multiplexer Sensor Monitor
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-[#EDE4D3] text-[#14532D] border border-[#DED8CC]">
                4:1 MUX / ADC
              </span>
            </div>
            <p className="text-xs text-[#3D5549]">
              Industrial Data Acquisition & Automated Fault Diagnostics Platform
            </p>
          </div>
        </div>

        {/* Status Indicators & Global Actions */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs">
          {/* Mode Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDE4D3] border border-[#DED8CC]">
            <span className="w-2 h-2 rounded-full bg-[#14532D] animate-pulse"></span>
            <span className="text-[#3D5549]">Mode:</span>
            <span className="font-semibold text-[#18352A]">
              {systemMode === 'SIMULATION' ? 'Simulation Active' : 'Hardware (Inactive)'}
            </span>
          </div>

          {/* Active Channel Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF9F6] border border-[#DED8CC]">
            <Activity className="w-3.5 h-3.5 text-[#14532D]" />
            <span className="text-[#3D5549]">Selected Line:</span>
            <span className="font-mono font-bold text-[#14532D]">{selectedChannelKey}</span>
            <span className="text-[#3D5549] truncate max-w-[110px]">({selectedChannelName})</span>
          </div>

          {/* System Health Badge */}
          {activeAlertCount > 0 ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FEF3C7] border border-[#B7791F] text-[#B7791F] font-medium">
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{activeAlertCount} {activeAlertCount === 1 ? 'Alert' : 'Alerts'} Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F0FDF4] border border-[#14532D] text-[#14532D] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Normal Operation</span>
            </div>
          )}

          {/* Global Reset Demo Button */}
          <button
            onClick={onResetDemo}
            className="px-3 py-1 rounded-md bg-[#14532D] hover:bg-[#166534] text-[#FAF9F6] font-medium transition-colors shadow-xs active:scale-95"
            title="Reset system to initial factory state"
          >
            Reset Demo
          </button>
        </div>
      </div>
    </header>
  );
};
