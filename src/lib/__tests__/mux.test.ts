import { describe, it, expect } from 'vitest';
import {
  evaluateMux41,
  computeGateDiagnostics,
  getSelectedChannelIndex,
  routeAnalogChannel,
  runTruthTableExhaustiveTest,
  type BinaryBit,
} from '../mux';

describe('4:1 Multiplexer Digital Logic (evaluateMux41)', () => {
  it('selects D0 when S1S0 = 00', () => {
    expect(evaluateMux41([0, 1, 1, 1], 0, 0)).toBe(0);
    expect(evaluateMux41([1, 0, 0, 0], 0, 0)).toBe(1);
  });

  it('selects D1 when S1S0 = 01', () => {
    expect(evaluateMux41([1, 0, 1, 1], 0, 1)).toBe(0);
    expect(evaluateMux41([0, 1, 0, 0], 0, 1)).toBe(1);
  });

  it('selects D2 when S1S0 = 10', () => {
    expect(evaluateMux41([1, 1, 0, 1], 1, 0)).toBe(0);
    expect(evaluateMux41([0, 0, 1, 0], 1, 0)).toBe(1);
  });

  it('selects D3 when S1S0 = 11', () => {
    expect(evaluateMux41([1, 1, 1, 0], 1, 1)).toBe(0);
    expect(evaluateMux41([0, 0, 0, 1], 1, 1)).toBe(1);
  });

  it('does NOT change output when non-selected inputs toggle', () => {
    // S1S0 = 00 (D0 selected). D0 = 1.
    // Changing D1, D2, D3 must have zero effect on output Y.
    const s1: BinaryBit = 0;
    const s0: BinaryBit = 0;
    const baseD: [BinaryBit, BinaryBit, BinaryBit, BinaryBit] = [1, 0, 0, 0];
    expect(evaluateMux41(baseD, s1, s0)).toBe(1);

    expect(evaluateMux41([1, 1, 0, 0], s1, s0)).toBe(1);
    expect(evaluateMux41([1, 0, 1, 0], s1, s0)).toBe(1);
    expect(evaluateMux41([1, 0, 0, 1], s1, s0)).toBe(1);
    expect(evaluateMux41([1, 1, 1, 1], s1, s0)).toBe(1);

    // If D0 = 0, changing D1, D2, D3 leaves output at 0
    expect(evaluateMux41([0, 0, 0, 0], s1, s0)).toBe(0);
    expect(evaluateMux41([0, 1, 1, 1], s1, s0)).toBe(0);
  });

  it('immediately updates output when selected input toggles', () => {
    // Channel D2 selected (S1S0 = 10)
    expect(evaluateMux41([0, 0, 0, 0], 1, 0)).toBe(0);
    expect(evaluateMux41([0, 0, 1, 0], 1, 0)).toBe(1);
    expect(evaluateMux41([0, 0, 0, 0], 1, 0)).toBe(0);
  });

  it('verifies getSelectedChannelIndex correctly maps binary select lines', () => {
    expect(getSelectedChannelIndex(0, 0)).toBe(0);
    expect(getSelectedChannelIndex(0, 1)).toBe(1);
    expect(getSelectedChannelIndex(1, 0)).toBe(2);
    expect(getSelectedChannelIndex(1, 1)).toBe(3);
  });
});

describe('Gate Diagnostics and Term Decomposition', () => {
  it('correctly activates only the selected AND gate term and generates Y', () => {
    // Select channel 1 (S1=0, S0=1), D1=1, others 0
    const diag = computeGateDiagnostics([0, 1, 0, 0], 0, 1);
    expect(diag.notS1).toBe(1);
    expect(diag.notS0).toBe(0);
    expect(diag.term0).toBe(0); // D0 * !S1 * !S0
    expect(diag.term1).toBe(1); // D1 * !S1 * S0 -> 1 * 1 * 1 = 1
    expect(diag.term2).toBe(0);
    expect(diag.term3).toBe(0);
    expect(diag.y).toBe(1);
    expect(diag.activeChannelIndex).toBe(1);
  });

  it('correctly reports inactive output when selected input is 0 even if other inputs are 1', () => {
    // Select channel 2 (S1=1, S0=0), but D2=0 while D0=1, D1=1, D3=1
    const diag = computeGateDiagnostics([1, 1, 0, 1], 1, 0);
    expect(diag.term0).toBe(0); // !S1 is 0, so 0
    expect(diag.term1).toBe(0); // !S1 is 0, so 0
    expect(diag.term2).toBe(0); // D2 is 0, so 0
    expect(diag.term3).toBe(0); // S0 is 0, so 0
    expect(diag.y).toBe(0);
  });
});

describe('Analog Channel Routing', () => {
  it('routes generic analog sensor values faithfully according to select bits', () => {
    const sensorVoltages: [number, number, number, number] = [1.25, 3.42, 0.88, 4.15];
    expect(routeAnalogChannel(sensorVoltages, 0, 0)).toBe(1.25);
    expect(routeAnalogChannel(sensorVoltages, 0, 1)).toBe(3.42);
    expect(routeAnalogChannel(sensorVoltages, 1, 0)).toBe(0.88);
    expect(routeAnalogChannel(sensorVoltages, 1, 1)).toBe(4.15);
  });
});

describe('Exhaustive 64-Case Truth Table Verification (runTruthTableExhaustiveTest)', () => {
  it('executes all 64 combinations with 100% pass rate (0 failures)', () => {
    const report = runTruthTableExhaustiveTest();
    expect(report.totalCases).toBe(64);
    expect(report.passedCases).toBe(64);
    expect(report.failedCases).toBe(0);
    expect(report.allPassed).toBe(true);

    // Verify all cases match expected Boolean logic
    report.cases.forEach((tc) => {
      expect(tc.passed).toBe(true);
      expect(tc.actualY).toBe(tc.expectedY);
    });
  });
});
