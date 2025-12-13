import * as React from 'react'
import { cn } from '@/lib/cn'

interface DialogContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | undefined>(
  undefined
)

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider
      value={{ open, onOpenChange: onOpenChange || (() => {}) }}
    >
      {children}
    </DialogContext.Provider>
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  const context = React.useContext(DialogContext)

  if (!context?.open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => context.onOpenChange(false)}
      />
      <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
        <div
          className={cn(
            'w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    </>
  )
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DialogHeader({
  className,
  children,
  ...props
}: DialogHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col space-y-1.5 text-center sm:text-left mb-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

export function DialogTitle({
  className,
  children,
  ...props
}: DialogTitleProps) {
  return (
    <h2
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

interface DialogDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function DialogDescription({
  className,
  children,
  ...props
}: DialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  )
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DialogFooter({
  className,
  children,
  ...props
}: DialogFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
