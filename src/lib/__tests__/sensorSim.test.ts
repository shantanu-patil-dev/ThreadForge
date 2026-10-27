import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SENSOR_CONFIGS,
  initializeSensorStates,
  simulateChannelReading,
  calculateVoltageFromValue,
} from '../sensorSim';

describe('Sensor Simulation Engine', () => {
  let initialChannels = initializeSensorStates(DEFAULT_SENSOR_CONFIGS);

  beforeEach(() => {
    initialChannels = initializeSensorStates(DEFAULT_SENSOR_CONFIGS);
  });

  it('initializes 4 distinct channels with nominal history and valid ranges', () => {
    expect(initialChannels.length).toBe(4);
    initialChannels.forEach((ch, idx) => {
      expect(ch.id).toBe(idx);
      expect(ch.enabled).toBe(true);
      expect(ch.status).toBe('OK');
      expect(ch.currentValue).not.toBeNull();
      expect(ch.rawVoltage).toBeGreaterThanOrEqual(ch.voltageMin);
      expect(ch.rawVoltage).toBeLessThanOrEqual(ch.voltageMax);
      expect(ch.history.length).toBeGreaterThan(0);
    });
  });

  it('correctly maps engineering values to ADC voltages', () => {
    const config = DEFAULT_SENSOR_CONFIGS[0]; // Nominal 50-68°C, 0.5-4.5V
    const midVolt = calculateVoltageFromValue((config.nominalMin + config.nominalMax) / 2, config);
    expect(midVolt).toBeCloseTo(2.5, 0.5);
  });

  it('triggers CRITICAL status on D0 during HIGH_TEMP fault', () => {
    const d0 = initialChannels[0];
    const updated = simulateChannelReading(d0, 'HIGH_TEMP');
    expect(updated.status).toBe('CRITICAL');
    expect(updated.currentValue).toBeGreaterThan(d0.criticalThreshold);
    expect(updated.statusMessage).toContain('Critical over-temperature');
  });

  it('triggers CRITICAL status on D1 during PRESSURE_SPIKE fault', () => {
    const d1 = initialChannels[1];
    const updated = simulateChannelReading(d1, 'PRESSURE_SPIKE');
    expect(updated.status).toBe('CRITICAL');
    expect(updated.currentValue).toBeGreaterThan(d1.criticalThreshold);
    expect(updated.statusMessage).toContain('Hydraulic over-pressure');
  });

  it('triggers DISCONNECTED status and 0V raw voltage on D3 during SENSOR_DISCONNECTED fault', () => {
    const d3 = initialChannels[3];
    const updated = simulateChannelReading(d3, 'SENSOR_DISCONNECTED');
    expect(updated.status).toBe('DISCONNECTED');
    expect(updated.currentValue).toBeNull();
    expect(updated.rawVoltage).toBe(0.0);
    expect(updated.statusMessage).toContain('open circuit');
  });

  it('handles INVALID_READING fault with saturation voltage flag', () => {
    const d1 = initialChannels[1];
    const updated = simulateChannelReading(d1, 'INVALID_READING');
    expect(updated.status).toBe('INVALID');
    expect(updated.rawVoltage).toBeGreaterThan(5.0);
    expect(updated.statusMessage).toContain('saturation');
  });

  it('returns DISCONNECTED and null readings when a channel is disabled in config', () => {
    const disabledChannel = { ...initialChannels[0], enabled: false };
    const updated = simulateChannelReading(disabledChannel, 'NORMAL');
    expect(updated.status).toBe('DISCONNECTED');
    expect(updated.currentValue).toBeNull();
    expect(updated.rawVoltage).toBeNull();
  });
});
