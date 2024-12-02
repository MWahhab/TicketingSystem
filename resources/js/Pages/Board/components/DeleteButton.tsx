import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import DeleteConfirmationDialog from "@/Pages/Board/components/DeleteConfirmation";
import {useState} from "react";

export default function DeleteButton({resourceId, type}: { resourceId: string, type: string }) {
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
                className="text-red-500 hover:text-red-700 hover:bg-red-100"
            >
                <Trash2 className="h-4 w-4" />
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
