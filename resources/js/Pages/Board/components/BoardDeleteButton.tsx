import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { router } from "@inertiajs/react"

export default function BoardDeleteButton({ boardId }: { boardId: string }) {
    const onDelete = () => {
        if (confirm("Are you sure you want to delete this board?")) {
            router.delete(`/boards/${boardId}`, {
                onSuccess: () => {
                    toast({
                        variant: 'success',
                        title: 'Board deleted successfully',
                    })
                },
                onError: (errors) => {
                    console.error(errors)
                    toast({
                        variant: 'destructive',
                        title: 'Failed to delete board',
                    })
                },
            })
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-100"
        >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete board</span>
        </Button>
    )
}