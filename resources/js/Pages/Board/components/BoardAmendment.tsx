import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Edit, MoreVertical, Trash2} from "lucide-react";
import React, {useState} from "react";
import {BoardFormDialog} from "@/Pages/Board/components/BoardFormDialog";
import {Inertia} from "@inertiajs/inertia";
import {toast} from "@/hooks/use-toast";

export default function BoardAmendment({boardTitle, boardCols, boardId}) {

    const [isEditing, setIsEditing] = useState(false);
    const onEdit = boardTitle => {
        setIsEditing(true);
    }

    const onDelete = boardTitle => {
        Inertia.delete("/boards/" + boardId, {
            onSuccess: () => {
                //setIsDialogOpen(false);
                //onClose && onClose();
                toast({
                    variant: 'success',
                    title: 'Board deleted successfully',
                });
            },
            onError: (errors) => {
                console.error(errors);
                toast({
                    variant: 'destructive',
                    title: 'Failed to delete board',
                });
            },
        });
    }

    return (
        <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:text-white">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-gray-700">
                <DropdownMenuItem onClick={() => onEdit(boardTitle)}  className="text-white hover:bg-gray-600">
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit Board</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(boardTitle)} className="text-white hover:bg-gray-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Board</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        {isEditing && (
            <BoardFormDialog isBeingEdited={true} boardName={boardTitle} cols={boardCols} boardId={boardId} />
        )}
        </>
    )
}