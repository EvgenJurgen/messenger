import { useRef } from 'react';

interface AvatarProps {
  src: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onFileSelect?: (file: File) => void;
  /** Online status: green circle when true, gray when false. Omit to hide indicator. */
  online?: boolean;
}

const sizeClasses = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
const statusSizeClasses = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };

export function Avatar({ src, alt, size = 'md', className = '', onFileSelect, online }: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sizeClass = sizeClasses[size];
  const statusSize = statusSizeClasses[size];

  const handleClick = () => {
    if (onFileSelect) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) onFileSelect(file);
    e.target.value = '';
  };

  const inner = src ? (
    <span
      className={`block ${sizeClass} rounded-full bg-cover bg-center`}
      style={{ backgroundImage: `url(${src})` }}
    />
  ) : (
    <span className={`${sizeClass} rounded-full flex items-center justify-center bg-border text-foreground-secondary text-sm font-medium`}>
      {alt.slice(0, 1).toUpperCase() || '?'}
    </span>
  );

  const statusIndicator =
    online !== undefined ? (
      <span
        className={`absolute bottom-0 right-0 rounded-full border-2 border-secondary ${statusSize} ${
          online ? 'bg-green-500' : 'bg-muted'
        }`}
        aria-hidden
      />
    ) : null;

  const wrapper = (
    <span className={`shrink-0 relative inline-block ${className}`}>
      {inner}
      {statusIndicator}
    </span>
  );

  if (onFileSelect) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleChange}
        />
        <button
          type="button"
          onClick={handleClick}
          className={`shrink-0 rounded-full flex items-center justify-center focus:ring-2 focus:ring-accent focus:ring-offset-2 ${sizeClass}`}
        >
          {wrapper}
        </button>
      </>
    );
  }

  return wrapper;
}
