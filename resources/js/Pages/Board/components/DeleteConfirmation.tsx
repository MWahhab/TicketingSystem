"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { router } from "@inertiajs/react"

interface DeleteConfirmationDialogProps {
    id: string;
    type: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function DeleteConfirmationDialog({ id, type, isOpen, onClose }: DeleteConfirmationDialogProps) {
    const { toast } = useToast()

    const handleDelete = async () => {
        router.delete(`/${type.toLowerCase()}s/${id}`, {
            onSuccess: () => {
                toast({
                    variant: 'success',
                    title: `${type} deleted successfully!`
                })
                onClose()
            },
            onError: (errors) => {
                console.error(errors)
                toast({
                    variant: 'destructive',
                    title: `Failed to delete ${type}`,
                })
            },
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] bg-zinc-800 text-white border border-zinc-700">
                <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription className="text-zinc-300">
                        Are you sure you want to delete this {type.toLowerCase()}? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end space-x-4 mt-6">
                    <Button
                        onClick={onClose}
                        className="bg-zinc-700 text-white hover:bg-zinc-600"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        className="bg-red-500 text-white hover:bg-red-600"
                    >
                        Delete
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}