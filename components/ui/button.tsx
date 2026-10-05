import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** HIG button styles: prominent (default), gray (secondary), tinted, plain (ghost), destructive, glass. */
const variants = cva('button', {
  variants: {
    variant: { default: 'primary', secondary: 'secondary', tinted: 'tinted', ghost: 'ghost', destructive: 'danger', glass: 'glass', outline: 'outline' },
    size: { default: '', small: 'small', large: 'large', icon: 'icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={twMerge(clsx(variants({ variant, size }), className))} {...props} />;
}
