import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
}) => {
  return (
    <div className={`bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-[0_2px_10px_rgba(15,23,42,0.06)] ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between pb-3.5 mb-4 border-b border-[#F1F5F9] ${headerClassName}`}>
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-[#172033] tracking-tight">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5 font-normal">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
