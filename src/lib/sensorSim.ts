import type {
  SensorConfig,
  SensorState,
  SensorDataPoint,
  FaultScenario,
  ChannelStatus,
} from '../types/sensor';

export const DEFAULT_SENSOR_CONFIGS: SensorConfig[] = [
  {
    id: 0,
    key: 'D0',
    name: 'Bearing Temperature',
    unit: '°C',
    threshold: 75.0,
    criticalThreshold: 85.0,
    nominalMin: 50.0,
    nominalMax: 68.0,
    voltageMin: 0.5,
    voltageMax: 4.5,
    enabled: true,
  },
  {
    id: 1,
    key: 'D1',
    name: 'Hydraulic Line Pressure',
    unit: 'bar',
    threshold: 8.5,
    criticalThreshold: 10.0,
    nominalMin: 5.2,
    nominalMax: 7.2,
    voltageMin: 0.5,
    voltageMax: 4.5,
    enabled: true,
  },
  {
    id: 2,
    key: 'D2',
    name: 'Turbine Vibration Velocity',
    unit: 'mm/s',
    threshold: 3.5,
    criticalThreshold: 4.8,
    nominalMin: 1.4,
    nominalMax: 2.6,
    voltageMin: 0.5,
    voltageMax: 4.5,
    enabled: true,
  },
  {
    id: 3,
    key: 'D3',
    name: 'Ambient Enclosure Humidity',
    unit: '%RH',
    threshold: 70.0,
    criticalThreshold: 80.0,
    nominalMin: 40.0,
    nominalMax: 55.0,
    voltageMin: 0.5,
    voltageMax: 4.5,
    enabled: true,
  },
];

const STORAGE_KEY = 'MUX_SMART_SENSOR_CONFIGS_V2';

export function loadSensorConfigs(): SensorConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 4) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load sensor configs from localStorage:', err);
  }
  return DEFAULT_SENSOR_CONFIGS;
}

export function saveSensorConfigs(configs: SensorConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.warn('Failed to save sensor configs to localStorage:', err);
  }
}

export function resetSensorConfigs(): SensorConfig[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear sensor configs:', err);
  }
  return DEFAULT_SENSOR_CONFIGS;
}

/**
 * Maps physical engineering value to simulated ADC voltage (0.5V - 4.5V range)
 */
export function calculateVoltageFromValue(val: number, config: SensorConfig): number {
  const span = config.nominalMax - config.nominalMin;
  const ratio = Math.max(0, Math.min(1.2, (val - config.nominalMin) / (span || 1)));
  const voltSpan = config.voltageMax - config.voltageMin;
  return Number((config.voltageMin + ratio * voltSpan).toFixed(2));
}

/**
 * Initializes the live sensor state with an initial history buffer
 */
export function initializeSensorStates(configs: SensorConfig[]): SensorState[] {
  const now = new Date();
  return configs.map((config) => {
    const nominalMid = (config.nominalMin + config.nominalMax) / 2;
    const initialHistory: SensorDataPoint[] = [];

    // Pre-populate 8 baseline readings
    for (let i = 8; i >= 1; i--) {
      const pointTime = new Date(now.getTime() - i * 3000);
      const jitter = (Math.random() - 0.5) * (config.nominalMax - config.nominalMin) * 0.15;
      const pointVal = Number((nominalMid + jitter).toFixed(1));
      initialHistory.push({
        timestamp: pointTime.toISOString(),
        timeFormatted: pointTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        value: pointVal,
        voltage: calculateVoltageFromValue(pointVal, config),
        status: 'OK',
      });
    }

    const currentVal = Number(nominalMid.toFixed(1));
    return {
      ...config,
      currentValue: config.enabled ? currentVal : null,
      rawVoltage: config.enabled ? calculateVoltageFromValue(currentVal, config) : null,
      status: config.enabled ? 'OK' : 'DISCONNECTED',
      statusMessage: config.enabled ? 'Operating within nominal limits' : 'Channel disabled in software config',
      history: initialHistory,
    };
  });
}

/**
 * Generates the next reading for a channel based on current fault scenario
 */
export function simulateChannelReading(
  channel: SensorState,
  scenario: FaultScenario,
  timestamp: Date = new Date()
): SensorState {
  if (!channel.enabled) {
    const point: SensorDataPoint = {
      timestamp: timestamp.toISOString(),
      timeFormatted: timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: null,
      voltage: null,
      status: 'DISCONNECTED',
    };
    return {
      ...channel,
      currentValue: null,
      rawVoltage: null,
      status: 'DISCONNECTED',
      statusMessage: 'Channel is disabled in hardware configuration',
      history: [...channel.history.slice(-29), point],
    };
  }

  let value: number | null = null;
  let rawVoltage: number | null = null;
  let status: ChannelStatus = 'OK';
  let statusMessage = 'Operating within nominal limits';

  // Check if this channel is targeted by an active fault scenario
  if (scenario === 'HIGH_TEMP' && channel.id === 0) {
    // Bearing Temp spike
    value = Number((88.5 + (Math.random() * 4 - 2)).toFixed(1));
    rawVoltage = calculateVoltageFromValue(value, channel);
    status = 'CRITICAL';
    statusMessage = `Critical over-temperature alert: ${value}${channel.unit} > ${channel.criticalThreshold}${channel.unit}`;
  } else if (scenario === 'PRESSURE_SPIKE' && channel.id === 1) {
    // Hydraulic Pressure Spike
    value = Number((11.4 + (Math.random() * 1.5 - 0.7)).toFixed(2));
    rawVoltage = calculateVoltageFromValue(value, channel);
    status = 'CRITICAL';
    statusMessage = `Hydraulic over-pressure burst risk: ${value}${channel.unit} > ${channel.criticalThreshold}${channel.unit}`;
  } else if (scenario === 'VIBRATION_FAULT' && channel.id === 2) {
    // Bearing Vibration velocity anomaly
    value = Number((5.2 + (Math.random() * 0.8 - 0.4)).toFixed(2));
    rawVoltage = calculateVoltageFromValue(value, channel);
    status = 'CRITICAL';
    statusMessage = `High mechanical vibration detected: ${value}${channel.unit} exceeds ISO threshold (${channel.criticalThreshold}${channel.unit})`;
  } else if (scenario === 'SENSOR_DISCONNECTED' && channel.id === 3) {
    // Disconnected sensor / open circuit
    value = null;
    rawVoltage = 0.0;
    status = 'DISCONNECTED';
    statusMessage = 'Channel open circuit / wire break fault (0.00V detected at ADC input)';
  } else if (scenario === 'INVALID_READING' && channel.id === 1) {
    // Invalid reading: ADC saturation or sensor failure
    value = 999.9;
    rawVoltage = 5.65; // Exceeds 5V VDD reference
    status = 'INVALID';
    statusMessage = 'ADC analog rail saturation error: 5.65V exceeds ADC 5.00V full-scale reference';
  } else {
    // Normal simulated nominal reading with gentle Brownian noise
    const prevVal = channel.currentValue ?? (channel.nominalMin + channel.nominalMax) / 2;
    const span = channel.nominalMax - channel.nominalMin;
    const delta = (Math.random() - 0.5) * (span * 0.08);
    let nextVal = prevVal + delta;

    // Pull toward center if drifting too far in normal operation
    const mid = (channel.nominalMin + channel.nominalMax) / 2;
    nextVal += (mid - nextVal) * 0.05;

    // Constrain within nominal margins
    nextVal = Math.max(channel.nominalMin * 0.95, Math.min(channel.nominalMax * 1.05, nextVal));
    value = Number(nextVal.toFixed(channel.unit === '°C' || channel.unit === '%RH' ? 1 : 2));
    rawVoltage = calculateVoltageFromValue(value, channel);

    // Check thresholds
    if (value >= channel.criticalThreshold) {
      status = 'CRITICAL';
      statusMessage = `Reading ${value}${channel.unit} breached critical threshold (${channel.criticalThreshold}${channel.unit})`;
    } else if (value >= channel.threshold) {
      status = 'WARNING';
      statusMessage = `Warning: ${value}${channel.unit} approached warning threshold (${channel.threshold}${channel.unit})`;
    } else {
      status = 'OK';
      statusMessage = 'Operating normally within nominal limits';
    }
  }

  const newPoint: SensorDataPoint = {
    timestamp: timestamp.toISOString(),
    timeFormatted: timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value,
    voltage: rawVoltage,
    status,
  };

  return {
    ...channel,
    currentValue: value,
    rawVoltage,
    status,
    statusMessage,
    history: [...channel.history.slice(-29), newPoint],
  };
}
