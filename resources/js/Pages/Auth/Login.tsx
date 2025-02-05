import type { FormEventHandler } from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Login({ status, canResetPassword }: { status?: string; canResetPassword: boolean }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    })

    const submit: FormEventHandler = (e) => {
        e.preventDefault()
        post("/login", {
            onFinish: () => reset("password"),
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="w-full max-w-[400px] p-4">
                <Head title="Log in" />

                <Card className="bg-[#1D1F23] border-0">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-white">Log in</CardTitle>
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

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-200">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData("password", e.target.value)}
                                    className="bg-white text-black border-0"
                                    required
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) => setData("remember", checked as boolean)}
                                    className="bg-white border-0 text-black"
                                />
                                <Label htmlFor="remember" className="text-gray-200 font-normal">
                                    Remember me
                                </Label>
                            </div>

                            <Button type="submit" disabled={processing} className="w-full bg-white text-black hover:bg-gray-100">
                                Log in
                            </Button>

                            {canResetPassword && (
                                <div className="text-center">
                                    <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-white">
                                        Forgot your password?
                                    </Link>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

