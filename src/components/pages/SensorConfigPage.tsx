import React, { useState } from 'react';
import type { SensorConfig } from '../../types/sensor';
import { Sliders, RotateCcw, Save, CheckCircle2 } from 'lucide-react';

interface SensorConfigPageProps {
  configs: SensorConfig[];
  onSaveConfigs: (newConfigs: SensorConfig[]) => void;
  onRestoreDefaults: () => void;
}

export const SensorConfigPage: React.FC<SensorConfigPageProps> = ({
  configs,
  onSaveConfigs,
  onRestoreDefaults,
}) => {
  const [formData, setFormData] = useState<SensorConfig[]>(configs);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleChange = (
    index: number,
    field: keyof SensorConfig,
    value: string | number | boolean
  ) => {
    const updated = [...formData];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setFormData(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfigs(formData);
    setSaveMessage('Channel configurations successfully saved to browser storage.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleRestore = () => {
    onRestoreDefaults();
    setSaveMessage('Factory channel configurations restored.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#DED8CC] gap-2">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#18352A] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#14532D]" />
            Sensor Channel & Threshold Configuration
          </h2>
          <p className="text-xs text-[#3D5549] mt-0.5">
            Customize transducer channel names, measurement engineering units, alert thresholds, and pin enable states.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestore}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#EDE4D3] text-[#18352A] hover:bg-[#DED8CC] rounded-lg transition-colors border border-[#DED8CC]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Factory Defaults</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] text-[#14532D] rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {formData.map((ch, idx) => (
            <div
              key={ch.id}
              className={`p-4 md:p-5 rounded-xl border transition-all ${
                ch.enabled
                  ? 'bg-white border-[#DED8CC] shadow-xs'
                  : 'bg-[#FAF9F6] border-[#DED8CC] opacity-75'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 mb-3 border-b border-[#DED8CC] gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-[#EDE4D3] text-[#14532D] border border-[#DED8CC]">
                    Pin {ch.key} (CH {ch.id})
                  </span>
                  <h3 className="text-sm font-bold text-[#18352A]">
                    {ch.name}
                  </h3>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ch.enabled}
                    onChange={(e) => handleChange(idx, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded text-[#14532D] accent-[#14532D] focus:ring-[#14532D]"
                  />
                  <span className="text-xs font-semibold text-[#18352A]">
                    {ch.enabled ? 'Channel Enabled' : 'Channel Disabled (Inhibited)'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Channel Name */}
                <div>
                  <label className="block text-[#3D5549] font-medium mb-1">
                    Channel Display Name
                  </label>
                  <input
                    type="text"
                    value={ch.name}
                    disabled={!ch.enabled}
                    onChange={(e) => handleChange(idx, 'name', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#DED8CC] bg-[#FAF9F6] text-[#18352A] font-semibold focus:bg-white disabled:opacity-50"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-[#3D5549] font-medium mb-1">
                    Engineering Unit
                  </label>
                  <input
                    type="text"
                    value={ch.unit}
                    disabled={!ch.enabled}
                    onChange={(e) => handleChange(idx, 'unit', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#DED8CC] bg-[#FAF9F6] text-[#18352A] font-mono font-bold focus:bg-white disabled:opacity-50"
                  />
                </div>

                {/* Warning Threshold */}
                <div>
                  <label className="block text-[#B7791F] font-bold mb-1">
                    Warning Threshold ({ch.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ch.threshold}
                    disabled={!ch.enabled}
                    onChange={(e) => handleChange(idx, 'threshold', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#DED8CC] bg-[#FAF9F6] text-[#B7791F] font-mono font-bold focus:bg-white disabled:opacity-50"
                  />
                </div>

                {/* Critical Threshold */}
                <div>
                  <label className="block text-[#B42318] font-bold mb-1">
                    Critical Threshold ({ch.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ch.criticalThreshold}
                    disabled={!ch.enabled}
                    onChange={(e) => handleChange(idx, 'criticalThreshold', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#DED8CC] bg-[#FAF9F6] text-[#B42318] font-mono font-bold focus:bg-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#14532D] hover:bg-[#166534] text-[#FAF9F6] text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Channel Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
};
