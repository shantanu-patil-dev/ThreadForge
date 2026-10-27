export type ChannelId = 0 | 1 | 2 | 3;
export type ChannelKey = 'D0' | 'D1' | 'D2' | 'D3';
export type ChannelStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'DISCONNECTED' | 'INVALID';

export interface SensorDataPoint {
  timestamp: string;
  timeFormatted: string;
  value: number | null;
  voltage: number | null;
  status: ChannelStatus;
}

export interface SensorConfig {
  id: ChannelId;
  key: ChannelKey;
  name: string;
  unit: string;
  threshold: number;         // Warning threshold
  criticalThreshold: number; // Critical threshold
  nominalMin: number;
  nominalMax: number;
  voltageMin: number;        // e.g. 0.5V
  voltageMax: number;        // e.g. 4.5V
  enabled: boolean;
}

export interface SensorState extends SensorConfig {
  currentValue: number | null;
  rawVoltage: number | null;
  status: ChannelStatus;
  statusMessage: string;
  history: SensorDataPoint[];
}

export type FaultScenario = 
  | 'NORMAL'
  | 'HIGH_TEMP'
  | 'PRESSURE_SPIKE'
  | 'VIBRATION_FAULT'
  | 'SENSOR_DISCONNECTED'
  | 'INVALID_READING';

export interface SystemEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  channelId?: ChannelId;
  channelKey?: ChannelKey;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'FAULT_INJECTION' | 'CONFIG_CHANGE';
  message: string;
  details?: string;
}

export interface MuxHardwareSpec {
  chipName: string;
  description: string;
  analogBandwidth: string;
  onResistance: string;
  supplyVoltage: string;
  switchingTime: string;
  packageType: string;
  estimatedCost: string;
}
