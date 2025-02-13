import type { FormEventHandler } from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
    })

    const submit: FormEventHandler = (e) => {
        e.preventDefault()
        post("/register", {
            onFinish: () => reset("password", "password_confirmation"),
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="w-full max-w-[400px] p-4">
                <Head title="Register" />

                <Card className="bg-[#1D1F23] border-0">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-white">Register</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-gray-200">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    className="bg-white text-black border-0"
                                    required
                                />
                            </div>

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

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation" className="text-gray-200">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData("password_confirmation", e.target.value)}
                                    className="bg-white text-black border-0"
                                    required
                                />
                            </div>

                            <Button type="submit" disabled={processing} className="w-full bg-white text-black hover:bg-gray-100">
                                Register
                            </Button>

                            <div className="text-center">
                                <Link href="/login" className="text-sm text-gray-400 hover:text-white">
                                    Already have an account? Log in
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

