/**
 * Multiplexer Core Logic Module (mux.ts)
 * 
 * Implements pure 4:1 digital multiplexer gate logic, analog channel routing,
 * intermediate gate term decomposition, and automated 64-case truth table verification.
 */

export type BinaryBit = 0 | 1;

export interface MuxInputs {
  d0: BinaryBit;
  d1: BinaryBit;
  d2: BinaryBit;
  d3: BinaryBit;
}

export interface MuxSelects {
  s1: BinaryBit;
  s0: BinaryBit;
}

export interface GateDiagnostics {
  notS1: BinaryBit;
  notS0: BinaryBit;
  term0: BinaryBit; // D0 * !S1 * !S0
  term1: BinaryBit; // D1 * !S1 * S0
  term2: BinaryBit; // D2 * S1 * !S0
  term3: BinaryBit; // D3 * S1 * S0
  y: BinaryBit;     // Term0 + Term1 + Term2 + Term3
  activeChannelIndex: number;
}

export interface TruthTableTestCase {
  id: number;
  s1: BinaryBit;
  s0: BinaryBit;
  d0: BinaryBit;
  d1: BinaryBit;
  d2: BinaryBit;
  d3: BinaryBit;
  expectedY: BinaryBit;
  actualY: BinaryBit;
  passed: boolean;
  selectedChannel: string;
}

export interface TruthTableReport {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  allPassed: boolean;
  timestamp: string;
  cases: TruthTableTestCase[];
}

/**
 * Pure 4:1 Multiplexer Boolean Evaluation
 * Boolean Formula:
 * Y = (D0 & ~S1 & ~S0) | (D1 & ~S1 & S0) | (D2 & S1 & ~S0) | (D3 & S1 & S0)
 */
export function evaluateMux41(
  d: [BinaryBit, BinaryBit, BinaryBit, BinaryBit],
  s1: BinaryBit,
  s0: BinaryBit
): BinaryBit {
  const [d0, d1, d2, d3] = d;
  const notS1: BinaryBit = s1 === 0 ? 1 : 0;
  const notS0: BinaryBit = s0 === 0 ? 1 : 0;

  const t0 = (d0 & notS1 & notS0) as BinaryBit;
  const t1 = (d1 & notS1 & s0) as BinaryBit;
  const t2 = (d2 & s1 & notS0) as BinaryBit;
  const t3 = (d3 & s1 & s0) as BinaryBit;

  return ((t0 | t1 | t2 | t3) > 0 ? 1 : 0) as BinaryBit;
}

/**
 * Returns detailed gate diagnostics (inverters, individual 3-input AND terms, and 4-input OR gate)
 * for interactive circuit visualization.
 */
export function computeGateDiagnostics(
  d: [BinaryBit, BinaryBit, BinaryBit, BinaryBit],
  s1: BinaryBit,
  s0: BinaryBit
): GateDiagnostics {
  const [d0, d1, d2, d3] = d;
  const notS1: BinaryBit = s1 === 0 ? 1 : 0;
  const notS0: BinaryBit = s0 === 0 ? 1 : 0;

  const term0 = ((d0 & notS1 & notS0) === 1 ? 1 : 0) as BinaryBit;
  const term1 = ((d1 & notS1 & s0) === 1 ? 1 : 0) as BinaryBit;
  const term2 = ((d2 & s1 & notS0) === 1 ? 1 : 0) as BinaryBit;
  const term3 = ((d3 & s1 & s0) === 1 ? 1 : 0) as BinaryBit;
  const y = ((term0 | term1 | term2 | term3) > 0 ? 1 : 0) as BinaryBit;
  const activeChannelIndex = (s1 << 1) | s0;

  return {
    notS1,
    notS0,
    term0,
    term1,
    term2,
    term3,
    y,
    activeChannelIndex,
  };
}

/**
 * Channel index selector helper:
 * S1 S0 -> 0 (D0), 1 (D1), 2 (D2), 3 (D3)
 */
export function getSelectedChannelIndex(s1: BinaryBit, s0: BinaryBit): number {
  return (s1 << 1) | s0;
}

/**
 * Analog channel router (simulates solid-state CMOS switch CD4051 / 74HC4051)
 * Routes the selected channel's arbitrary signal (analog voltage, object, string) to output.
 */
export function routeAnalogChannel<T>(
  channels: [T, T, T, T],
  s1: BinaryBit,
  s0: BinaryBit
): T {
  const index = getSelectedChannelIndex(s1, s0);
  return channels[index];
}

/**
 * Runs the exhaustive 64-case truth table validation test.
 * 2^2 (select combinations) * 2^4 (data input combinations) = 4 * 16 = 64 test cases.
 */
export function runTruthTableExhaustiveTest(): TruthTableReport {
  const cases: TruthTableTestCase[] = [];
  let passedCases = 0;
  let caseId = 1;

  for (let s1Val = 0; s1Val <= 1; s1Val++) {
    for (let s0Val = 0; s0Val <= 1; s0Val++) {
      const s1 = s1Val as BinaryBit;
      const s0 = s0Val as BinaryBit;
      const selIdx = getSelectedChannelIndex(s1, s0);
      const selName = `D${selIdx}`;

      for (let d0Val = 0; d0Val <= 1; d0Val++) {
        for (let d1Val = 0; d1Val <= 1; d1Val++) {
          for (let d2Val = 0; d2Val <= 1; d2Val++) {
            for (let d3Val = 0; d3Val <= 1; d3Val++) {
              const d0 = d0Val as BinaryBit;
              const d1 = d1Val as BinaryBit;
              const d2 = d2Val as BinaryBit;
              const d3 = d3Val as BinaryBit;
              const dArray: [BinaryBit, BinaryBit, BinaryBit, BinaryBit] = [d0, d1, d2, d3];

              // Expected output is strictly the value of the selected channel
              const expectedY = dArray[selIdx];
              // Actual output computed via Boolean gate logic
              const actualY = evaluateMux41(dArray, s1, s0);
              const passed = expectedY === actualY;

              if (passed) passedCases++;

              cases.push({
                id: caseId++,
                s1,
                s0,
                d0,
                d1,
                d2,
                d3,
                expectedY,
                actualY,
                passed,
                selectedChannel: selName,
              });
            }
          }
        }
      }
    }
  }

  return {
    totalCases: cases.length,
    passedCases,
    failedCases: cases.length - passedCases,
    allPassed: passedCases === cases.length,
    timestamp: new Date().toISOString(),
    cases,
  };
}
