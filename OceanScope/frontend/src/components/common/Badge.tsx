import React from 'react';
import { RiskLevel } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | RiskLevel;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'sm',
  className = '',
}) => {
  const styles: Record<string, string> = {
    cyan: 'bg-[#E0F7FA] text-[#0E7490] border-[#BAE6FD]',
    blue: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
    emerald: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    amber: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
    rose: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
    slate: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
    LOW: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    MODERATE: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
    MEDIUM: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
    HIGH: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]',
    CRITICAL: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA] font-bold',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${styles[variant] || styles.cyan} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};
