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
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <Loader2 className={`${sizes[size]} animate-spin text-[#0B84C6]`} />
      {label && <span className="text-xs text-[#64748B] font-medium">{label}</span>}
    </div>
  );
};
