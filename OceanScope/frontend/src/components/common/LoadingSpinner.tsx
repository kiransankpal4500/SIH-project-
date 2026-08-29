import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading ocean telemetry...',
  size = 'md',
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-2 text-ocean-300">
      <Loader2 className={`${sizes[size]} animate-spin text-ocean-400`} />
      {label && <span className="text-xs font-mono text-slate-400">{label}</span>}
    </div>
  );
};
