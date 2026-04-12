import React from 'react';

const config = {
  online:       { color: 'bg-green-500',  text: 'Online',       pulse: true },
  connecting:   { color: 'bg-yellow-500', text: 'Verbinde...',  pulse: true },
  reconnecting: { color: 'bg-orange-500', text: 'Reconnecting', pulse: true },
  error:        { color: 'bg-red-500',    text: 'Fehler',       pulse: false },
  stopped:      { color: 'bg-gray-500',   text: 'Gestoppt',     pulse: false },
};

export default function StatusBadge({ state }) {
  const cfg = config[state] || config.stopped;
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium">
      <span className={`relative flex h-2.5 w-2.5`}>
        {cfg.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.color}`} />
      </span>
      {cfg.text}
    </span>
  );
}
