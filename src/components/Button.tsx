interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const variants = {
  primary:
    'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 active:scale-[0.98]',
  secondary:
    'bg-white text-gray-800 shadow-md shadow-gray-200/80 border border-gray-100 hover:bg-gray-50 active:scale-[0.98]',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:scale-[0.98]',
  danger: 'bg-red-500 text-white shadow-md hover:bg-red-600 active:scale-[0.98]',
};

const sizes = {
  sm: 'px-3 py-2 text-sm rounded-xl',
  md: 'px-5 py-3 text-sm font-semibold rounded-2xl',
  lg: 'px-6 py-4 text-base font-semibold rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
