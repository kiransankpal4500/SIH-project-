import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#0B84C6] disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#0B84C6] text-white hover:bg-[#085A8A] font-semibold shadow-sm',
    secondary: 'bg-[#F8FAFC] text-[#172033] hover:bg-[#F1F5F9] border border-[#E2E8F0] shadow-sm',
    outline: 'bg-transparent text-[#0B84C6] border border-[#0B84C6] hover:bg-[#E0F2FE]',
    ghost: 'bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033]',
    danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold gap-2',
    lg: 'px-5 py-2.5 text-sm font-semibold gap-2.5',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
