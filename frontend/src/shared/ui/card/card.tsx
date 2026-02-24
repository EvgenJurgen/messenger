import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-border bg-secondary text-foreground-primary shadow-sm',
        className,
      ].join(' ')}
      {...props}
    />
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

function CardHeader({ className = '', ...props }: CardHeaderProps) {
  return <div className={['flex flex-col space-y-1.5 p-6', className].join(' ')} {...props} />;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

function CardTitle({ className = '', ...props }: CardTitleProps) {
  return (
    <h3
      className={['text-xl font-semibold leading-none tracking-tight text-foreground-primary', className].join(' ')}
      {...props}
    />
  );
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

function CardDescription({ className = '', ...props }: CardDescriptionProps) {
  return (
    <p className={['text-sm text-muted', className].join(' ')} {...props} />
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

function CardContent({ className = '', ...props }: CardContentProps) {
  return <div className={['p-6 pt-0', className].join(' ')} {...props} />;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

function CardFooter({ className = '', ...props }: CardFooterProps) {
  return (
    <div className={['flex items-center p-6 pt-0', className].join(' ')} {...props} />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
