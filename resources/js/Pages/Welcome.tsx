import { Link, Head } from "@inertiajs/react"
import type { PageProps } from "@/types"
import { Button } from "@/components/ui/button"

export default function Welcome({ auth }: PageProps<{ auth: { user: object | null } }>) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-black text-white flex flex-col">
                <header className="p-6 flex justify-between items-center border-b border-[#1D1F23]">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 relative">
                            <svg
                                viewBox="0 0 64 64"
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-full h-full"
                            >
                                <rect width="64" height="64" rx="12" fill="#1E1E1E" />
                                <rect x="12" y="16" width="8" height="32" rx="2" fill="#FFFFFF" />
                                <rect x="28" y="12" width="8" height="40" rx="2" fill="#FFFFFF" />
                                <rect x="44" y="16" width="8" height="32" rx="2" fill="#FFFFFF" />
                            </svg>
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

