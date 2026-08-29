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
    'inline-flex items-center justify-center font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-ocean-400 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-ocean-400 text-ocean-950 hover:bg-ocean-300 font-semibold shadow-sm',
    secondary: 'bg-ocean-800 text-slate-100 hover:bg-ocean-700 border border-ocean-700',
    outline: 'bg-transparent text-ocean-300 border border-ocean-400/40 hover:bg-ocean-400/10',
    ghost: 'bg-transparent text-slate-300 hover:bg-ocean-800/60 hover:text-white',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
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
