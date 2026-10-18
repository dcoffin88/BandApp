import React from 'react';

interface MicrophoneSelectorProps {
  id: string;
  devices: MediaDeviceInfo[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  isRequesting: boolean;
  isStopping: boolean;
}
export const MicrophoneSelector: React.FC<MicrophoneSelectorProps> = ({
  id,
  devices,
  value,
  onChange,
  disabled,
  isRequesting,
  isStopping,
}) => (
  <div className="space-y-2 text-left">
    <label htmlFor={id} className="block text-xs font-semibold text-zinc-300">
      Microphone
    </label>
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 disabled:opacity-60"
    >
      <option value="">System default microphone</option>
      {devices
        .filter((device) => device.deviceId)
        .map((device, index) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${index + 1}`}
          </option>
        ))}
    </select>
    <p role="status" className="text-xs text-zinc-400">
      {isRequesting
        ? 'Waiting for microphone access. Check the browser address bar for a permission request.'
        : isStopping
          ? 'Finishing your recording…'
          : 'Start recording to request access. Connect or enable a microphone if no input is available.'}
    </p>
  </div>
);
