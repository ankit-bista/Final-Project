'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemCount?: number
  onConfirm: () => void
}

export function DeleteDialog({
  open,
  onOpenChange,
  itemName,
  itemCount,
  onConfirm,
}: DeleteDialogProps) {
  const isMultiple = itemCount && itemCount > 1

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {isMultiple ? 'Items' : 'Item'}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiple ? (
              <>Are you sure you want to delete {itemCount} items? This action cannot be undone.</>
            ) : (
              <>Are you sure you want to delete &quot;{itemName}&quot;? This action cannot be undone.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex justify-end gap-3 mt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
