import React from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { SensorState, SensorDataPoint } from '../types/sensor';
import { AlertCircle, LineChart as ChartIcon } from 'lucide-react';

interface LiveChartProps {
  sensor: SensorState;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: SensorDataPoint;
}

const CustomDot: React.FC<CustomDotProps> = ({ cx, cy, payload }) => {
  if (cx === undefined || cy === undefined || !payload || payload.value === null) {
    return null;
  }

  let fill = '#14532D'; // Bottle Green for normal
  let stroke = '#14532D';
  let r = 3.5;

  if (payload.status === 'CRITICAL' || payload.status === 'INVALID') {
    fill = '#B42318'; // Red for critical
    stroke = '#7F1D1D';
    r = 5;
  } else if (payload.status === 'WARNING') {
    fill = '#B7791F'; // Amber for warning
    stroke = '#78350F';
    r = 4.5;
  }

  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} />;
};

export const LiveChart: React.FC<LiveChartProps> = ({ sensor }) => {
  const data = sensor.history;
  const hasValidData = data.some((d) => d.value !== null);

  if (!sensor.enabled || !hasValidData) {
    return (
      <div className="bg-white border border-[#DED8CC] rounded-xl p-8 flex flex-col items-center justify-center min-h-[340px] text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#EDE4D3] text-[#3D5549] flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h4 className="text-sm font-bold text-[#18352A]">No Data Available for Channel</h4>
        <p className="text-xs text-[#3D5549] max-w-sm mt-1">
          {!sensor.enabled
            ? `Channel ${sensor.key} (${sensor.name}) is currently disabled in hardware/channel configuration.`
            : `Channel ${sensor.key} has an open-circuit / disconnected status. Re-enable channel or clear fault in Fault Simulator.`}
        </p>
      </div>
    );
  }

  // Calculate dynamic Y-axis domain
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const minVal = Math.min(...values, sensor.nominalMin);
  const maxVal = Math.max(...values, sensor.criticalThreshold * 1.05);
  const yDomain = [
    Math.floor(minVal * 0.9),
    Math.ceil(maxVal * 1.05),
  ];

  return (
    <div className="bg-white border border-[#DED8CC] rounded-xl p-5 shadow-xs">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3 border-b border-[#DED8CC] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EDE4D3] text-[#14532D] flex items-center justify-center">
            <ChartIcon className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#18352A]">
              Real-Time Telemetry: {sensor.name} ({sensor.key})
            </h3>
            <span className="text-xs text-[#3D5549]">
              Unit: <strong className="text-[#18352A]">{sensor.unit}</strong> | Sampling through 4:1 MUX to ADC
            </span>
          </div>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-[#14532D]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#14532D]"></span>
            Nominal
          </span>
          <span className="flex items-center gap-1.5 text-[#B7791F]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B7791F]"></span>
            Warning (≥{sensor.threshold})
          </span>
          <span className="flex items-center gap-1.5 text-[#B42318]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B42318]"></span>
            Critical (≥{sensor.criticalThreshold})
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE4D3" vertical={false} />
            <XAxis
              dataKey="timeFormatted"
              tick={{ fill: '#3D5549', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              stroke="#DED8CC"
              tickLine={{ stroke: '#DED8CC' }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#3D5549', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              stroke="#DED8CC"
              tickLine={{ stroke: '#DED8CC' }}
              unit={` ${sensor.unit}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as SensorDataPoint;
                  return (
                    <div className="bg-[#FAF9F6] border border-[#DED8CC] rounded-lg p-2.5 shadow-md font-mono text-xs">
                      <div className="text-[11px] text-[#3D5549]">{pt.timeFormatted}</div>
                      <div className="font-bold text-[#18352A] mt-0.5">
                        Reading: {pt.value !== null ? `${pt.value} ${sensor.unit}` : 'NO SIGNAL'}
                      </div>
                      <div className="text-[11px] text-[#3D5549]">
                        ADC Raw: {pt.voltage !== null ? `${pt.voltage.toFixed(2)} V` : '0.00 V'}
                      </div>
                      <div
                        className={`text-[11px] font-semibold mt-1 ${
                          pt.status === 'CRITICAL' || pt.status === 'INVALID'
                            ? 'text-[#B42318]'
                            : pt.status === 'WARNING'
                            ? 'text-[#B7791F]'
                            : 'text-[#14532D]'
                        }`}
                      >
                        Status: {pt.status}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Threshold Reference Lines */}
            <ReferenceLine
              y={sensor.threshold}
              stroke="#B7791F"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Warn: ${sensor.threshold}`,
                fill: '#B7791F',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
            <ReferenceLine
              y={sensor.criticalThreshold}
              stroke="#B42318"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Crit: ${sensor.criticalThreshold}`,
                fill: '#B42318',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke="#14532D"
              strokeWidth={2.5}
              dot={<CustomDot />}
              activeDot={{ r: 6, fill: '#14532D', stroke: '#FAF9F6', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 pt-2 border-t border-[#DED8CC] flex items-center justify-between text-xs text-[#3D5549]">
        <span>
          Plotted points: <strong className="font-mono text-[#18352A]">{data.length}</strong> samples
        </span>
        <span className="italic">
          Real-time time-division multiplexed ADC sample history
        </span>
      </div>
    </div>
  );
};
