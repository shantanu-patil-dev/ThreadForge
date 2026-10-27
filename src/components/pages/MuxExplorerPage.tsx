import React, { useState } from 'react';
import { MuxVisualizer } from '../MuxVisualizer';
import { Split, BookOpen } from 'lucide-react';

export const MuxExplorerPage: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<'SELECT_LOGIC' | 'ANALOG_VS_DIGITAL' | 'SETTLING_TIME'>('SELECT_LOGIC');

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#DED8CC] gap-2">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#18352A] flex items-center gap-2">
            <Split className="w-5 h-5 text-[#14532D]" />
            4:1 Multiplexer Architecture & Logic Explorer
          </h2>
          <p className="text-xs text-[#3D5549] mt-0.5">
            Test arbitrary digital data inputs (D0–D3) and selector bits (S1, S0) to observe instantaneous logic forwarding and gate term evaluation.
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#EDE4D3] text-[#14532D] rounded-md border border-[#DED8CC]">
          Boolean: Y = Σ(Di · mi)
        </span>
      </div>

      {/* Interactive Visualizer Component */}
      <MuxVisualizer
        initialD={[1, 0, 1, 0]}
        initialS1={0}
        initialS0={0}
        showGateLevelToggle={true}
      />

      {/* Engineering Deep-Dive Cards */}
      <div className="bg-white border border-[#DED8CC] rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#DED8CC]">
          <h3 className="text-sm font-bold text-[#18352A] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#14532D]" />
            Digital Electronics Theory & Physical Behavior
          </h3>

          <div className="flex items-center gap-1.5 bg-[#EDE4D3] p-1 rounded-lg border border-[#DED8CC] text-xs font-semibold">
            <button
              onClick={() => setSelectedTopic('SELECT_LOGIC')}
              className={`px-3 py-1 rounded-md transition-colors ${
                selectedTopic === 'SELECT_LOGIC'
                  ? 'bg-[#14532D] text-[#FAF9F6]'
                  : 'text-[#18352A] hover:text-[#14532D]'
              }`}
            >
              Binary Select Lines
            </button>
            <button
              onClick={() => setSelectedTopic('ANALOG_VS_DIGITAL')}
              className={`px-3 py-1 rounded-md transition-colors ${
                selectedTopic === 'ANALOG_VS_DIGITAL'
                  ? 'bg-[#14532D] text-[#FAF9F6]'
                  : 'text-[#18352A] hover:text-[#14532D]'
              }`}
            >
              Analog vs Digital MUX
            </button>
            <button
              onClick={() => setSelectedTopic('SETTLING_TIME')}
              className={`px-3 py-1 rounded-md transition-colors ${
                selectedTopic === 'SETTLING_TIME'
                  ? 'bg-[#14532D] text-[#FAF9F6]'
                  : 'text-[#18352A] hover:text-[#14532D]'
              }`}
            >
              Settling Time & Delay
            </button>
          </div>
        </div>

        {/* Selected Topic Content */}
        {selectedTopic === 'SELECT_LOGIC' && (
          <div className="space-y-3 text-xs leading-relaxed text-[#3D5549]">
            <p>
              A 4:1 multiplexer requires <strong className="text-[#18352A]">n = log<sub>2</sub>(4) = 2</strong> binary select lines, denoted as <strong className="text-[#18352A]">S1 (MSB)</strong> and <strong className="text-[#18352A]">S0 (LSB)</strong>. Together, these two bits yield four unique binary states (<strong className="font-mono text-[#14532D]">00, 01, 10, 11</strong>) that map directly to the four input channels:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 font-mono text-center">
              <div className="p-2.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <span className="block font-bold text-[#14532D]">S1S0 = 00</span>
                <span className="text-[#18352A]">Output Y = D0</span>
              </div>
              <div className="p-2.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <span className="block font-bold text-[#14532D]">S1S0 = 01</span>
                <span className="text-[#18352A]">Output Y = D1</span>
              </div>
              <div className="p-2.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <span className="block font-bold text-[#14532D]">S1S0 = 10</span>
                <span className="text-[#18352A]">Output Y = D2</span>
              </div>
              <div className="p-2.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <span className="block font-bold text-[#14532D]">S1S0 = 11</span>
                <span className="text-[#18352A]">Output Y = D3</span>
              </div>
            </div>
            <p>
              In digital hardware, changing non-selected inputs has zero impact on output Y because their respective AND gate terms are inhibited by inverted select lines. Only the active channel term is propagated through the final OR gate.
            </p>
          </div>
        )}

        {selectedTopic === 'ANALOG_VS_DIGITAL' && (
          <div className="space-y-3 text-xs leading-relaxed text-[#3D5549]">
            <p>
              A fundamental distinction in electronics is whether the multiplexer is <strong className="text-[#18352A]">Digital (Logic Gate)</strong> or <strong className="text-[#18352A]">Analog (Transmission Gate)</strong>:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <h4 className="font-bold text-[#14532D] mb-1">Digital MUX (e.g. 74HC153)</h4>
                <ul className="list-disc list-inside space-y-1 text-[#18352A]">
                  <li>Constructed using logic gates (AND, OR, NOT inverters).</li>
                  <li>Only accepts and regenerates discrete binary levels (0V or 5V logic).</li>
                  <li>Cannot pass continuous analog sensor voltages (e.g., 2.34V would be misread as high or low).</li>
                  <li>Unidirectional: inputs flow strictly toward the output.</li>
                </ul>
              </div>

              <div className="p-3 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <h4 className="font-bold text-[#14532D] mb-1">Analog MUX (e.g. CD4051 / CD4052 / 74HC4051)</h4>
                <ul className="list-disc list-inside space-y-1 text-[#18352A]">
                  <li>Constructed using complementary CMOS bilateral transmission gates (NMOS + PMOS pair).</li>
                  <li>Preserves continuous sensor analog voltages (0.00V to V<sub>DD</sub>) with low distortion.</li>
                  <li>Bidirectional: can route analog signals into an ADC or route DAC outputs outward.</li>
                  <li>Features low on-resistance (R<sub>ON</sub> ≈ 60Ω–100Ω).</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {selectedTopic === 'SETTLING_TIME' && (
          <div className="space-y-3 text-xs leading-relaxed text-[#3D5549]">
            <p>
              When a microcontroller changes the select lines (S1, S0), the analog multiplexer does not output the stable voltage instantly. Two hardware physical delays must be observed before reading the ADC:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-center">
              <div className="p-2.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <span className="block font-bold text-[#18352A]">Switching Time (t<sub>SW</sub>)</span>
                <span className="text-[#3D5549] text-[11px]">~ 20 ns to 80 ns</span>
                <p className="text-[10px] text-[#3D5549] mt-1 font-sans">
                  Time for CMOS gates to open and close. Break-before-make prevents shorting channels.
                </p>
              </div>

              <div className="p-2.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <span className="block font-bold text-[#18352A]">RC Settling Time (t<sub>SETTLE</sub>)</span>
                <span className="text-[#3D5549] text-[11px]">t = 5 × (R<sub>ON</sub> + R<sub>S</sub>) × C<sub>IN</sub></span>
                <p className="text-[10px] text-[#3D5549] mt-1 font-sans">
                  Time required for ADC sample-and-hold capacitor to charge to 99.3% accuracy (~1 µs).
                </p>
              </div>

              <div className="p-2.5 bg-[#FAF9F6] border border-[#DED8CC] rounded-lg">
                <span className="block font-bold text-[#18352A]">Charge Injection (Q<sub>INJ</sub>)</span>
                <span className="text-[#3D5549] text-[11px]">~ 1 pC to 5 pC</span>
                <p className="text-[10px] text-[#3D5549] mt-1 font-sans">
                  Small transient voltage spike injected into the signal line when gates toggle.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
