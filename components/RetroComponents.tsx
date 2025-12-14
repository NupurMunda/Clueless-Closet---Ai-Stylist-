import React from 'react';

// Windows 95 / Retro Button
export const RetroButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'success' }> = ({ 
  children, 
  className = '', 
  variant = 'primary',
  ...props 
}) => {
  const baseStyle = "font-bold font-serif border-2 active:border-t-gray-800 active:border-l-gray-800 active:border-b-white active:border-r-white active:bg-gray-200 outline-none px-4 py-2 transition-transform active:scale-95";
  
  // Windows 95 Bevel logic
  const bevel = "border-t-white border-l-white border-b-gray-800 border-r-gray-800 bg-gray-200 text-black";
  
  // Clueless Pink/Yellow overrides
  const primary = "bg-clueless-pink text-white border-t-pink-300 border-l-pink-300 border-b-pink-800 border-r-pink-800 hover:bg-pink-400";
  
  const finalClass = variant === 'primary' 
    ? `${baseStyle} ${primary} ${className}`
    : `${baseStyle} ${bevel} ${className}`;

  return (
    <button className={finalClass} {...props}>
      {children}
    </button>
  );
};

// Retro Card (Window)
export const RetroWindow: React.FC<{ title: string; children: React.ReactNode; className?: string; onClose?: () => void }> = ({ 
  title, 
  children, 
  className = '',
  onClose
}) => {
  return (
    <div className={`bg-gray-200 border-2 border-t-white border-l-white border-b-gray-800 border-r-gray-800 shadow-xl text-black ${className}`}>
      {/* Title Bar */}
      <div className="bg-win-blue text-white px-2 py-1 flex justify-between items-center font-bold select-none">
        <span className="truncate mr-2 font-mono tracking-wider">{title}</span>
        <div className="flex gap-1">
            {onClose && (
                 <button onClick={onClose} className="w-5 h-5 bg-gray-200 text-black border-2 border-t-white border-l-white border-b-gray-800 border-r-gray-800 flex items-center justify-center text-sm font-bold leading-none active:border-t-gray-800 active:border-l-gray-800">
                 x
               </button>
            )}
        </div>
      </div>
      {/* Content */}
      <div className="p-4 text-black">
        {children}
      </div>
    </div>
  );
};

export const RetroInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return (
    <input 
      {...props}
      className={`border-2 border-t-gray-800 border-l-gray-800 border-b-white border-r-white p-2 font-mono bg-white text-black outline-none focus:bg-yellow-50 ${props.className || ''}`}
    />
  );
};

// Fix: Added FashionLoader component to resolve import error in App.tsx
export const FashionLoader: React.FC = () => {
  return (
    <div className="w-12 h-12 border-4 border-gray-400 border-t-pink-600 rounded-full animate-spin" />
  );
};