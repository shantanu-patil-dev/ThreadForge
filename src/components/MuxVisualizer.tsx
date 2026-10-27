import React, { useState } from 'react';
import type { BinaryBit } from '../lib/mux';
import { computeGateDiagnostics, evaluateMux41 } from '../lib/mux';
import { ToggleLeft, ToggleRight, RotateCcw, Cpu, CheckCircle2 } from 'lucide-react';

interface MuxVisualizerProps {
  initialD?: [BinaryBit, BinaryBit, BinaryBit, BinaryBit];
  initialS1?: BinaryBit;
  initialS0?: BinaryBit;
  onSelectChange?: (s1: BinaryBit, s0: BinaryBit) => void;
  externalS1?: BinaryBit;
  externalS0?: BinaryBit;
  showGateLevelToggle?: boolean;
}

export const MuxVisualizer: React.FC<MuxVisualizerProps> = ({
  initialD = [1, 0, 1, 0],
  initialS1 = 0,
  initialS0 = 0,
  onSelectChange,
  externalS1,
  externalS0,
  showGateLevelToggle = true,
}) => {
  const [d, setD] = useState<[BinaryBit, BinaryBit, BinaryBit, BinaryBit]>(initialD);
  const [internalS1, setInternalS1] = useState<BinaryBit>(initialS1);
  const [internalS0, setInternalS0] = useState<BinaryBit>(initialS0);
  const [viewMode, setViewMode] = useState<'SCHEMATIC' | 'GATE_LEVEL'>('SCHEMATIC');

  // Allow external control if provided (e.g. from scanner or live monitor)
  const s1 = externalS1 !== undefined ? externalS1 : internalS1;
  const s0 = externalS0 !== undefined ? externalS0 : internalS0;

  const y = evaluateMux41(d, s1, s0);
  const gateDiag = computeGateDiagnostics(d, s1, s0);
  const selectedChannelIndex = (s1 << 1) | s0;

  const toggleD = (index: number) => {
    const nextD = [...d] as [BinaryBit, BinaryBit, BinaryBit, BinaryBit];
    nextD[index] = nextD[index] === 0 ? 1 : 0;
    setD(nextD);
  };

  const setSelects = (newS1: BinaryBit, newS0: BinaryBit) => {
    setInternalS1(newS1);
    setInternalS0(newS0);
    if (onSelectChange) {
      onSelectChange(newS1, newS0);
    }
  };

  const handleReset = () => {
    setD([1, 0, 1, 0]);
    setSelects(0, 0);
  };

  return (
    <div className="bg-[#FAF9F6] border border-[#DED8CC] rounded-xl p-5 md:p-6 shadow-xs">
      {/* Visualizer Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#DED8CC] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-[#18352A] flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#14532D]" />
              Interactive 4:1 Multiplexer Circuit
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-[#EDE4D3] text-[#14532D]">
              Y = D{selectedChannelIndex}
            </span>
          </div>
          <p className="text-xs text-[#3D5549] mt-0.5">
            Binary select lines (S1, S0) configure the digital routing path to output Y.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {showGateLevelToggle && (
            <div className="inline-flex rounded-lg bg-[#EDE4D3] p-1 border border-[#DED8CC]">
              <button
                onClick={() => setViewMode('SCHEMATIC')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'SCHEMATIC'
                    ? 'bg-[#14532D] text-[#FAF9F6] shadow-xs'
                    : 'text-[#18352A] hover:text-[#14532D]'
                }`}
              >
                Symbol View
              </button>
              <button
                onClick={() => setViewMode('GATE_LEVEL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'GATE_LEVEL'
                    ? 'bg-[#14532D] text-[#FAF9F6] shadow-xs'
                    : 'text-[#18352A] hover:text-[#14532D]'
                }`}
              >
                Gate Level (AND-OR)
              </button>
            </div>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#18352A] bg-[#EDE4D3] hover:bg-[#DED8CC] border border-[#DED8CC] rounded-lg transition-colors"
            title="Reset inputs to initial states"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Diagram Area */}
      {viewMode === 'SCHEMATIC' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Data Inputs Column (Left) */}
          <div className="lg:col-span-3 space-y-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#3D5549] block mb-1">
              Data Inputs (D0 – D3)
            </span>
            {d.map((val, idx) => {
              const isSelected = selectedChannelIndex === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-[#F0FDF4] border-[#14532D] ring-2 ring-[#14532D]/20 shadow-xs'
                      : 'bg-white border-[#DED8CC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#14532D] text-[#FAF9F6]'
                          : 'bg-[#EDE4D3] text-[#18352A]'
                      }`}
                    >
                      D{idx}
                    </span>
                    <span className="text-xs text-[#3D5549]">Channel {idx}</span>
                  </div>

                  <button
                    onClick={() => toggleD(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                      val === 1
                        ? 'bg-[#14532D] text-[#FAF9F6]'
                        : 'bg-[#EDE4D3] text-[#3D5549] hover:bg-[#DED8CC]'
                    }`}
                  >
                    <span>{val === 1 ? 'HIGH (1)' : 'LOW (0)'}</span>
                    {val === 1 ? (
                      <ToggleRight className="w-4 h-4 text-[#FAF9F6]" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-[#3D5549]" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* SVG Schematic & MUX Symbol (Center) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center p-3 bg-white border border-[#DED8CC] rounded-xl shadow-xs">
            <svg
              viewBox="0 0 540 280"
              className="w-full max-w-[500px] h-auto overflow-visible select-none"
            >
              {/* Wire paths from D0..D3 to MUX body */}
              {[
                { y: 50, idx: 0 },
                { y: 100, idx: 1 },
                { y: 150, idx: 2 },
                { y: 200, idx: 3 },
              ].map(({ y: wireY, idx }) => {
                const isSelected = selectedChannelIndex === idx;
                const isHigh = d[idx] === 1;
                const wireColor = isSelected
                  ? isHigh
                    ? '#14532D'
                    : '#3D5549'
                  : '#DED8CC';
                return (
                  <g key={idx}>
                    <line
                      x1="20"
                      y1={wireY}
                      x2="160"
                      y2={wireY}
                      stroke={wireColor}
                      strokeWidth={isSelected ? '4' : '2'}
                      strokeDasharray={isSelected ? '6,3' : 'none'}
                      className={isSelected ? 'animate-signal-flow' : ''}
                    />
                    <circle
                      cx="20"
                      cy={wireY}
                      r="4"
                      fill={isHigh ? '#14532D' : '#3D5549'}
                    />
                    <text
                      x="10"
                      y={wireY + 4}
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="JetBrains Mono"
                      fill="#18352A"
                      textAnchor="end"
                    >
                      D{idx}
                    </text>
                  </g>
                );
              })}

              {/* MUX Trapezoid Body */}
              <polygon
                points="160,20 340,65 340,215 160,260"
                fill="#EDE4D3"
                stroke="#14532D"
                strokeWidth="2.5"
                className="filter drop-shadow-xs"
              />

              {/* MUX Internal Labeling */}
              <text
                x="245"
                y="110"
                fontSize="18"
                fontWeight="800"
                fontFamily="Inter"
                fill="#18352A"
                textAnchor="middle"
              >
                4:1 MUX
              </text>
              <text
                x="245"
                y="130"
                fontSize="11"
                fontWeight="600"
                fontFamily="Inter"
                fill="#3D5549"
                textAnchor="middle"
              >
                74HC153 / CD4052
              </text>

              {/* Internal Channel Pin Labels */}
              <text x="175" y="55" fontSize="11" fontFamily="JetBrains Mono" fontWeight="600" fill="#18352A">0 (D0)</text>
              <text x="175" y="105" fontSize="11" fontFamily="JetBrains Mono" fontWeight="600" fill="#18352A">1 (D1)</text>
              <text x="175" y="155" fontSize="11" fontFamily="JetBrains Mono" fontWeight="600" fill="#18352A">2 (D2)</text>
              <text x="175" y="205" fontSize="11" fontFamily="JetBrains Mono" fontWeight="600" fill="#18352A">3 (D3)</text>

              {/* Internal Active Routing Line */}
              <path
                d={`M 200,${50 + selectedChannelIndex * 50} Q 260,140 340,140`}
                fill="none"
                stroke="#14532D"
                strokeWidth="4"
                strokeDasharray="6,3"
                className="animate-signal-flow"
              />

              {/* Select Lines entering from bottom */}
              <line
                x1="220"
                y1="270"
                x2="220"
                y2="242"
                stroke={s1 === 1 ? '#14532D' : '#3D5549'}
                strokeWidth={s1 === 1 ? '3' : '2'}
              />
              <line
                x1="270"
                y1="270"
                x2="270"
                y2="231"
                stroke={s0 === 1 ? '#14532D' : '#3D5549'}
                strokeWidth={s0 === 1 ? '3' : '2'}
              />
              <text x="220" y="282" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700" fill="#18352A" textAnchor="middle">
                S1={s1}
              </text>
              <text x="270" y="282" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700" fill="#18352A" textAnchor="middle">
                S0={s0}
              </text>

              {/* Output Wire to Right */}
              <line
                x1="340"
                y1="140"
                x2="480"
                y2="140"
                stroke={y === 1 ? '#14532D' : '#3D5549'}
                strokeWidth={y === 1 ? '4' : '2'}
                strokeDasharray={y === 1 ? '6,3' : 'none'}
                className={y === 1 ? 'animate-signal-flow' : ''}
              />
              <circle
                cx="480"
                cy="140"
                r="6"
                fill={y === 1 ? '#14532D' : '#EDE4D3'}
                stroke="#14532D"
                strokeWidth="2"
              />
              <text
                x="500"
                y="145"
                fontSize="14"
                fontWeight="800"
                fontFamily="JetBrains Mono"
                fill={y === 1 ? '#14532D' : '#18352A'}
              >
                Y={y}
              </text>
            </svg>

            {/* Select Lines Control Panel below MUX */}
            <div className="w-full mt-2 pt-3 border-t border-[#DED8CC] flex flex-wrap items-center justify-between gap-3 px-3">
              <span className="text-xs font-semibold text-[#3D5549]">
                Binary Select Lines (S1, S0):
              </span>

              <div className="flex items-center gap-3">
                {/* S1 Toggle */}
                <button
                  onClick={() => setSelects(s1 === 0 ? 1 : 0, s0)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all ${
                    s1 === 1
                      ? 'bg-[#14532D] text-[#FAF9F6] border-[#14532D]'
                      : 'bg-[#EDE4D3] text-[#18352A] border-[#DED8CC] hover:bg-[#DED8CC]'
                  }`}
                >
                  <span>S1 (MSB):</span>
                  <span>{s1}</span>
                </button>

                {/* S0 Toggle */}
                <button
                  onClick={() => setSelects(s1, s0 === 0 ? 1 : 0)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all ${
                    s0 === 1
                      ? 'bg-[#14532D] text-[#FAF9F6] border-[#14532D]'
                      : 'bg-[#EDE4D3] text-[#18352A] border-[#DED8CC] hover:bg-[#DED8CC]'
                  }`}
                >
                  <span>S0 (LSB):</span>
                  <span>{s0}</span>
                </button>

                {/* Quick 4-channel Select Buttons */}
                <div className="hidden sm:flex items-center gap-1 bg-[#EDE4D3] p-0.5 rounded-md border border-[#DED8CC]">
                  {([
                    [0, 0, 'D0'],
                    [0, 1, 'D1'],
                    [1, 0, 'D2'],
                    [1, 1, 'D3'],
                  ] as [BinaryBit, BinaryBit, string][]).map(([bit1, bit0, label], i) => (
                    <button
                      key={label}
                      onClick={() => setSelects(bit1, bit0)}
                      className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded ${
                        selectedChannelIndex === i
                          ? 'bg-[#14532D] text-[#FAF9F6]'
                          : 'text-[#18352A] hover:bg-[#DED8CC]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Output Y Column (Right) */}
          <div className="lg:col-span-3 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#3D5549] block mb-1">
              Multiplexed Output (Y)
            </span>

            <div className="p-4 bg-white border border-[#DED8CC] rounded-xl shadow-xs text-center">
              <div
                className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center border-2 transition-all ${
                  y === 1
                    ? 'bg-[#F0FDF4] border-[#14532D] text-[#14532D] shadow-md shadow-[#14532D]/20'
                    : 'bg-[#EDE4D3] border-[#DED8CC] text-[#3D5549]'
                }`}
              >
                <span className="font-mono text-2xl font-black">{y}</span>
              </div>

              <div className="mt-3">
                <span className="text-xs text-[#3D5549] block">Output Logic Level</span>
                <span className="text-sm font-bold text-[#18352A]">
                  {y === 1 ? 'LOGIC HIGH (1)' : 'LOGIC LOW (0)'}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-[#DED8CC] text-xs text-[#3D5549]">
                Follows selected channel <strong className="text-[#14532D]">D{selectedChannelIndex}</strong> value (<strong className="font-mono">{d[selectedChannelIndex]}</strong>)
              </div>
            </div>

            {/* Quick Signal Path Explanation */}
            <div className="p-3 bg-[#EDE4D3] border border-[#DED8CC] rounded-lg text-xs space-y-1">
              <span className="font-bold text-[#18352A] block">Active Route:</span>
              <p className="text-[#3D5549]">
                Selectors <span className="font-mono font-bold">S1S0 = {s1}{s0}</span> decode to binary index <span className="font-mono font-bold">{selectedChannelIndex}</span>.
              </p>
              <p className="text-[#3D5549]">
                Input <span className="font-mono font-bold">D{selectedChannelIndex}</span> is bridged to output <span className="font-mono font-bold">Y</span>.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Gate Level Diagram: Inverters, four 3-input AND gates, 4-input OR gate */
        <div className="bg-white border border-[#DED8CC] rounded-xl p-4 md:p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#18352A]">
              Gate-Level Logic Implementation (AND-OR Architecture)
            </h3>
            <p className="text-xs text-[#3D5549]">
              Visualizing the underlying Boolean SOP terms: 4 AND gates gated by inverted select lines, combining into a 4-input OR gate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              {
                term: 'T0',
                expr: 'D0 · S1̄ · S0̄',
                active: gateDiag.term0 === 1,
                val: gateDiag.term0,
                dVal: d[0],
                s1Term: gateDiag.notS1,
                s0Term: gateDiag.notS0,
                selected: selectedChannelIndex === 0,
              },
              {
                term: 'T1',
                expr: 'D1 · S1̄ · S0',
                active: gateDiag.term1 === 1,
                val: gateDiag.term1,
                dVal: d[1],
                s1Term: gateDiag.notS1,
                s0Term: s0,
                selected: selectedChannelIndex === 1,
              },
              {
                term: 'T2',
                expr: 'D2 · S1 · S0̄',
                active: gateDiag.term2 === 1,
                val: gateDiag.term2,
                dVal: d[2],
                s1Term: s1,
                s0Term: gateDiag.notS0,
                selected: selectedChannelIndex === 2,
              },
              {
                term: 'T3',
                expr: 'D3 · S1 · S0',
                active: gateDiag.term3 === 1,
                val: gateDiag.term3,
                dVal: d[3],
                s1Term: s1,
                s0Term: s0,
                selected: selectedChannelIndex === 3,
              },
            ].map((gate, i) => (
              <div
                key={gate.term}
                className={`p-3.5 rounded-lg border transition-all ${
                  gate.selected
                    ? 'bg-[#F0FDF4] border-[#14532D] ring-2 ring-[#14532D]/20 shadow-xs'
                    : 'bg-[#FAF9F6] border-[#DED8CC]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[#14532D]">
                    AND Gate {i} ({gate.term})
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      gate.active
                        ? 'bg-[#14532D] text-[#FAF9F6]'
                        : 'bg-[#EDE4D3] text-[#3D5549]'
                    }`}
                  >
                    Output = {gate.val}
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-[#18352A] mb-2">
                  {gate.expr}
                </div>

                <div className="text-[11px] text-[#3D5549] space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Data Input D{i}:</span>
                    <strong className="text-[#18352A]">{gate.dVal}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Select S1 condition:</span>
                    <strong className="text-[#18352A]">{gate.s1Term}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Select S0 condition:</span>
                    <strong className="text-[#18352A]">{gate.s0Term}</strong>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#DED8CC] flex items-center justify-between text-[11px]">
                  <span className="text-[#3D5549]">Select Match:</span>
                  <span
                    className={`font-semibold ${
                      gate.selected ? 'text-[#14532D]' : 'text-[#3D5549]'
                    }`}
                  >
                    {gate.selected ? 'ACTIVE (Enabled)' : 'INHIBITED'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Summation OR Gate */}
          <div className="mt-4 p-4 rounded-lg bg-[#EDE4D3] border border-[#DED8CC] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#14532D] block">
                Final 4-Input OR Gate
              </span>
              <span className="font-mono text-xs font-semibold text-[#18352A]">
                Y = T0 + T1 + T2 + T3 = {gateDiag.term0} + {gateDiag.term1} + {gateDiag.term2} + {gateDiag.term3}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#3D5549]">Evaluated Output:</span>
              <span className="font-mono text-lg font-bold px-3 py-1 bg-[#14532D] text-[#FAF9F6] rounded-md shadow-xs">
                Y = {y}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Boolean Equation & Truth Table Snippet */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Boolean Expression Card */}
        <div className="p-4 bg-white border border-[#DED8CC] rounded-xl shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3D5549] block mb-1">
            Canonical Boolean SOP Equation
          </span>
          <div className="p-2.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg font-mono text-xs md:text-sm text-[#18352A] overflow-x-auto leading-relaxed">
            Y = (D0 · S1̄ · S0̄) + (D1 · S1̄ · S0) + (D2 · S1 · S0̄) + (D3 · S1 · S0)
          </div>
          <div className="mt-2 text-xs text-[#3D5549]">
            Active term for current select (S1={s1}, S0={s0}):{' '}
            <strong className="text-[#14532D] font-mono">
              D{selectedChannelIndex} · {s1 === 0 ? 'S1̄' : 'S1'} · {s0 === 0 ? 'S0̄' : 'S0'}
            </strong>
          </div>
        </div>

        {/* Truth Table Snippet */}
        <div className="p-4 bg-white border border-[#DED8CC] rounded-xl shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3D5549] block mb-1">
            Multiplexer Truth Table Mapping
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[#DED8CC] text-[#3D5549]">
                  <th className="py-1 px-2 text-left">S1</th>
                  <th className="py-1 px-2 text-left">S0</th>
                  <th className="py-1 px-2 text-left">Selected</th>
                  <th className="py-1 px-2 text-left">Output (Y)</th>
                  <th className="py-1 px-2 text-left">State</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { s1: 0, s0: 0, sel: 'D0' },
                  { s1: 0, s0: 1, sel: 'D1' },
                  { s1: 1, s0: 0, sel: 'D2' },
                  { s1: 1, s0: 1, sel: 'D3' },
                ].map((row, idx) => {
                  const isCurrent = s1 === row.s1 && s0 === row.s0;
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-[#FAF9F6] transition-colors ${
                        isCurrent
                          ? 'bg-[#F0FDF4] font-bold text-[#14532D]'
                          : 'text-[#18352A]'
                      }`}
                    >
                      <td className="py-1 px-2">{row.s1}</td>
                      <td className="py-1 px-2">{row.s0}</td>
                      <td className="py-1 px-2">{row.sel}</td>
                      <td className="py-1 px-2">
                        {isCurrent ? `${row.sel} (${d[idx]})` : row.sel}
                      </td>
                      <td className="py-1 px-2">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#14532D]">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVE
                          </span>
                        ) : (
                          <span className="text-[#3D5549] text-[10px]">Inactive</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
