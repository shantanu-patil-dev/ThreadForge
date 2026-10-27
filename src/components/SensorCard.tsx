import React from 'react';
import type { SensorState, ChannelStatus } from '../types/sensor';
import {
  Thermometer,
  Gauge,
  Activity,
  Droplets,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Radio,
  ArrowRight,
} from 'lucide-react';

interface SensorCardProps {
  sensor: SensorState;
  isSelected: boolean;
  onSelect: () => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  sensor,
  isSelected,
  onSelect,
}) => {
  const getIcon = () => {
    switch (sensor.id) {
      case 0:
        return Thermometer;
      case 1:
        return Gauge;
      case 2:
        return Activity;
      case 3:
        return Droplets;
      default:
        return Radio;
    }
  };

  const Icon = getIcon();

  const getStatusBadge = (status: ChannelStatus) => {
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F0FDF4] text-[#14532D] border border-[#86EFAC]">
            <CheckCircle className="w-3 h-3 text-[#14532D]" />
            Nominal
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#B7791F] border border-[#B7791F]">
            <AlertTriangle className="w-3 h-3 text-[#B7791F]" />
            Warning
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEE2E2] text-[#B42318] border border-[#B42318] animate-pulse">
            <AlertTriangle className="w-3 h-3 text-[#B42318]" />
            Critical Fault
          </span>
        );
      case 'DISCONNECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EDE4D3] text-[#3D5549] border border-[#DED8CC]">
            <XCircle className="w-3 h-3 text-[#3D5549]" />
            Disconnected
          </span>
        );
      case 'INVALID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEE2E2] text-[#B42318] border border-[#B42318]">
            <XCircle className="w-3 h-3 text-[#B42318]" />
            ADC Error
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 relative p-4.5 bg-white shadow-xs ${
        isSelected
          ? 'border-[#14532D] ring-2 ring-[#14532D]/20 shadow-md'
          : 'border-[#DED8CC] hover:border-[#B3ABA0]'
      }`}
    >
      {/* Top Bar with Channel ID, Name and MUX Selected Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-[#14532D] text-[#FAF9F6]'
                : 'bg-[#EDE4D3] text-[#14532D]'
            }`}
          >
            <Icon className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-[#EDE4D3] text-[#14532D] border border-[#DED8CC]">
                {sensor.key}
              </span>
              <h3 className="text-sm font-bold text-[#18352A] leading-tight">
                {sensor.name}
              </h3>
            </div>
            <span className="text-[11px] text-[#3D5549]">
              MUX Input Pin {sensor.id}
            </span>
          </div>
        </div>

        <div>{getStatusBadge(sensor.status)}</div>
      </div>

      {/* Main Measurement Value Display */}
      <div className="py-2.5 px-3 rounded-lg bg-[#FAF9F6] border border-[#DED8CC] mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#3D5549]">
            Signal Measurement
          </span>
          <span className="text-[11px] font-mono text-[#3D5549]">
            {sensor.rawVoltage !== null ? `${sensor.rawVoltage.toFixed(2)} V ADC` : '0.00 V (High-Z)'}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 mt-1">
          {sensor.currentValue !== null ? (
            <>
              <span
                className={`font-mono text-2xl font-black tracking-tight ${
                  sensor.status === 'CRITICAL'
                    ? 'text-[#B42318]'
                    : sensor.status === 'WARNING'
                    ? 'text-[#B7791F]'
                    : 'text-[#18352A]'
                }`}
              >
                {sensor.currentValue}
              </span>
              <span className="text-sm font-bold text-[#3D5549]">{sensor.unit}</span>
            </>
          ) : (
            <span className="font-mono text-lg font-bold text-[#B42318]">
              NO SIGNAL
            </span>
          )}
        </div>

        {/* Status Message Snippet */}
        <p className="text-[11px] text-[#3D5549] mt-1 line-clamp-1">
          {sensor.statusMessage}
        </p>
      </div>

      {/* Threshold Reference Limits */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-3.5">
        <div className="p-2 rounded bg-white border border-[#DED8CC]">
          <span className="text-[#3D5549] block text-[10px]">Warning Limit</span>
          <span className="font-bold text-[#B7791F]">
            ≥ {sensor.threshold} {sensor.unit}
          </span>
        </div>
        <div className="p-2 rounded bg-white border border-[#DED8CC]">
          <span className="text-[#3D5549] block text-[10px]">Critical Limit</span>
          <span className="font-bold text-[#B42318]">
            ≥ {sensor.criticalThreshold} {sensor.unit}
          </span>
        </div>
      </div>

      {/* Selection Control Button */}
      <div className="pt-2 border-t border-[#DED8CC] flex items-center justify-between">
        {isSelected ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#14532D]">
            <span className="w-2 h-2 rounded-full bg-[#14532D] animate-ping"></span>
            <span>Routed to ADC via MUX</span>
          </div>
        ) : (
          <span className="text-xs text-[#3D5549]">Idle on MUX input</span>
        )}

        <button
          onClick={onSelect}
          disabled={isSelected}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            isSelected
              ? 'bg-[#14532D] text-[#FAF9F6] cursor-default'
              : 'bg-[#EDE4D3] text-[#18352A] hover:bg-[#14532D] hover:text-[#FAF9F6]'
          }`}
        >
          <span>{isSelected ? 'Active Line' : 'Route to MUX'}</span>
          {!isSelected && <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
