import { Link, Head } from "@inertiajs/react"
import type { PageProps } from "@/types"
import { Button } from "@/components/ui/button"

export default function Welcome({ auth }: PageProps<{ auth: { user: object | null } }>) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-black text-white flex flex-col">
                <header className="p-6 flex justify-between items-center border-b border-[#1D1F23]">
                    <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 relative">
                            <img
                                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-7T3nHm8ThlbW9in4ebkEpnZXigX7t8.png"
                                alt="Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Ticketing System</h1>
                    </div>
                    <nav>
                        {auth.user ? (
                            <Button asChild variant="default" className="bg-white text-black hover:bg-gray-100">
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                        ) : (
                            <div className="space-x-4">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="bg-transparent text-white border-white hover:bg-white hover:text-black"
                                >
                                    <Link href="/login">Log in</Link>
                                </Button>
                                <Button asChild variant="default" className="bg-white text-black hover:bg-gray-100">
                                    <Link href="/register">Register</Link>
                                </Button>
                            </div>
                        )}
                    </nav>
                </header>

                <main className="flex-grow flex items-center justify-center px-6 bg-black">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-5xl font-bold mb-6 text-white">Welcome to Your Ticketing System</h2>
                        <p className="text-xl mb-8 text-gray-300">Streamline your project management with our powerful tools.</p>
                        {!auth.user && (
                            <Button asChild variant="default" size="lg" className="bg-white text-black hover:bg-gray-100">
                                <Link href="/register">Get Started</Link>
                            </Button>
                        )}
                    </div>
                </main>

                <footer className="p-6 text-center text-sm text-gray-400 border-t border-[#1D1F23]">
                    &copy; {new Date().getFullYear()} Ticketing System. All rights reserved.
                </footer>
            </div>
        </>
    )
}

