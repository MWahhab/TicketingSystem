"use client"

import { AlertTriangle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { router } from "@inertiajs/react"
import { useBoardContext } from "../BoardContext"

interface DeleteConfirmationDialogProps {
    id: string
    type: string
    isOpen: boolean
    onClose: () => void
    onSuccessfulDelete?: () => void
}

export default function DeleteConfirmationDialog({ id, type, isOpen, onClose, onSuccessfulDelete }: DeleteConfirmationDialogProps) {
    const { toast } = useToast()
    const { deleteTask } = useBoardContext()

    const handleDelete = async () => {
        if (type.toLowerCase() === "post") {
            const result = await deleteTask(id);
            if (result && result.deleted_post_id) {
                toast({
                    title: `Post deleted successfully!`,
                    description: "This action is permanent and can't be undone.",
                });
                onClose();
                if (onSuccessfulDelete) {
                    onSuccessfulDelete();
                }
            } else {
                toast({
                    variant: "destructive",
                    title: `Failed to delete Post`,
                    description: "Something has gone wrong. Please try again later."
                });
            }
        } else {
            router.delete(`/${type.toLowerCase()}s/${id}`, {
                onSuccess: () => {
                    toast({
                        variant: "success",
                        title: `${type} deleted successfully!`,
                    });
                    onClose();
                    if (onSuccessfulDelete) {
                        onSuccessfulDelete();
                    }
                },
                onError: (errors) => {
                    console.error(errors);
                    toast({
                        variant: "destructive",
                        title: `Failed to delete ${type}`,
                    });
                },
            });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-[450px] rounded-lg bg-gradient-to-b from-zinc-900 to-zinc-950 text-zinc-100 border border-white/10"
                aria-describedby="delete-dialog-description"
            >
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-semibold text-zinc-100">Delete {type}</DialogTitle>
                    </div>
                    <DialogDescription id="delete-dialog-description" className="text-zinc-400">
                        This action cannot be undone. This will permanently delete the {type.toLowerCase()}.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-2 rounded-md bg-zinc-850 border border-white/10 p-4">
                    <p className="text-sm text-zinc-400">
                        All associated data will be permanently removed from our servers. Are you sure you want to continue?
                    </p>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="border border-white/10 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 hover:ring-1 hover:ring-white/20 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        className="border border-white/10 bg-transparent text-zinc-400 hover:bg-red-800/50 hover:text-red-100 hover:ring-1 hover:ring-red-500/30 flex items-center gap-2 focus-visible:ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-all"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
