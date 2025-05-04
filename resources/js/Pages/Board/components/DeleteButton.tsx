import { Button } from "@/components/ui/button"
import { Trash } from "lucide-react"
import DeleteConfirmationDialog from "@/Pages/Board/components/DeleteConfirmation";
import React, {useState} from "react";
import { cn } from "@/lib/utils"

interface DeleteButtonProps {
    resourceId: string;
    type: string;
    className?: string;
}

export default function DeleteButton({resourceId, type, className}: DeleteButtonProps) {
    const [showDialog, setShowDialog] = useState(false);

    const onDelete = () => {
        setShowDialog(true);
    };

    const handleDialogClose = () => {
        setShowDialog(false);
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className={cn(className)}
            >
                <Trash />
                <span className="sr-only">Delete {type}</span>
            </Button>

            {showDialog && (
                <DeleteConfirmationDialog
                    id={resourceId}
                    type={type}
                    isOpen={true}
                    onClose={handleDialogClose}
                />
            )}
        </>
    );
}
