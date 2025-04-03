import type React from "react"
import { LockIcon } from "lucide-react"

interface PremiumOverlayProps {
    show: boolean
    message?: string
}

const PremiumOverlay: React.FC<PremiumOverlayProps> = ({
                                                           show,
                                                           message = "This feature is available only for premium users",
                                                       }) => {
    if (!show) return null

    return (
        <div className="absolute inset-0 backdrop-blur-md bg-zinc-900/50 flex flex-col items-center justify-center z-10 rounded">
            <LockIcon className="h-10 w-10 text-zinc-400 mb-3" />
            <p className="text-zinc-200 font-medium text-center px-6">{message}</p>
        </div>
    )
}

export default PremiumOverlay

