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
        <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-b from-zinc-800/40 to-zinc-900/40 border border-white/10 shadow-md flex flex-col items-center justify-center z-10 rounded-md p-4">
            <LockIcon className="h-10 w-10 text-zinc-400 mb-4" />
            <p className="text-zinc-200 font-medium text-center text-sm max-w-xs">{message}</p>
        </div>
    )
}

export default PremiumOverlay

