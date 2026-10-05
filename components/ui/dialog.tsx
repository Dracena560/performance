'use client';
import * as React from 'react';
import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
export const Dialog = Primitive.Root;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
/** Liquid Glass sheet: centered on regular widths, bottom sheet with a grabber on compact widths. */
export function DialogContent({ children, className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Overlay className="dialog-overlay" /><Primitive.Content className={`dialog-content${className ? ` ${className}` : ''}`} {...props}><span className="dialog-grabber" aria-hidden />{children}<Primitive.Close className="dialog-close" aria-label="Fechar"><X size={18} /></Primitive.Close></Primitive.Content></Primitive.Portal>;
}
