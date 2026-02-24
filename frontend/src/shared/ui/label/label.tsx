import { forwardRef, type LabelHTMLAttributes } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={[
          'text-sm font-medium leading-none text-foreground-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';

export { Label };
