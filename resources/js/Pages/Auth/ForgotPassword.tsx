import type { FormEventHandler } from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing } = useForm({
        email: "",
    })

    const submit: FormEventHandler = (e) => {
        e.preventDefault()
        post("/forgot-password")
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="w-full max-w-[400px] p-4">
                <Head title="Forgot Password" />

                <Card className="bg-[#1D1F23] border-0">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-white">Forgot Password</CardTitle>
                        <CardDescription className="text-gray-400">
                            Enter your email address and we'll send you a password reset link.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {status && <div className="mb-4 text-sm text-blue-400">{status}</div>}

                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-200">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData("email", e.target.value)}
                                    className="bg-white text-black border-0"
                                    required
                                />
                            </div>

                            <div className="flex flex-col space-y-4">
                                <Button type="submit" disabled={processing} className="w-full bg-white text-black hover:bg-gray-100">
                                    Send Reset Link
                                </Button>

                                <Button variant="ghost" asChild className="text-gray-400 hover:text-white">
                                    <Link href="/login">Back to Login</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

