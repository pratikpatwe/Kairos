"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

import { AuthCard } from "@/components/auth/auth-card"
import { createClient } from "@/lib/supabase/client"

function OnboardingContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const mode = searchParams.get("mode")

    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("signin")
    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [rememberMe, setRememberMe] = useState(false)

    useEffect(() => {
        if (mode === "signup") {
            setActiveTab("signup")
        } else {
            setActiveTab("signin")
        }
    }, [mode])

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (tab === "signup") {
            params.set("mode", "signup")
        } else {
            params.delete("mode")
        }
        router.push(`${pathname}?${params.toString()}`)
    }

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email) {
            toast.error("Email is required", {
                description: "Please enter your email address.",
            })
            return
        }

        if (!validateEmail(email)) {
            toast.error("Invalid email", {
                description: "Please enter a valid email address.",
            })
            return
        }

        if (!password) {
            toast.error("Password is required", {
                description: "Please enter your password.",
            })
            return
        }

        setIsLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                toast.error("Sign in failed", {
                    description: error.message,
                })
            } else {
                toast.success("Signed in successfully!", {
                    description: "Welcome back to your account.",
                })
                router.push('/dashboard')
            }
        } catch (error: any) {
            toast.error("An unexpected error occurred", {
                description: "Please try again later.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!firstName) {
            toast.error("First name is required", {
                description: "Please enter your first name.",
            })
            return
        }

        if (!lastName) {
            toast.error("Last name is required", {
                description: "Please enter your last name.",
            })
            return
        }

        if (!email) {
            toast.error("Email is required", {
                description: "Please enter your email address.",
            })
            return
        }

        if (!validateEmail(email)) {
            toast.error("Invalid email", {
                description: "Please enter a valid email address.",
            })
            return
        }

        if (!password) {
            toast.error("Password is required", {
                description: "Please create a password.",
            })
            return
        }

        if (password.length < 6) {
            toast.error("Password too short", {
                description: "Password must be at least 6 characters long.",
            })
            return
        }

        setIsLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `https://kairos-buildshot.vercel.app/auth/callback`,
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        full_name: `${firstName} ${lastName}`,
                    },
                },
            })

            if (error) {
                toast.error("Sign up failed", {
                    description: error.message,
                })
            } else {
                toast.success("Account created!", {
                    description: "Please check your email to confirm your account.",
                })
            }
        } catch (error: any) {
            toast.error("An unexpected error occurred", {
                description: "Please try again later.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSocialLogin = async (provider: string) => {
        setIsLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider.toLowerCase() as any,
                options: {
                    redirectTo: `https://kairos-buildshot.vercel.app/auth/callback`,
                },
            })

            if (error) {
                toast.error(`${provider} login failed`, {
                    description: error.message,
                })
                setIsLoading(false)
            }
        } catch (error: any) {
            toast.error("An unexpected error occurred", {
                description: "Please try again later.",
            })
            setIsLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email) {
            toast.error("Email is required", {
                description: "Please enter your email address to reset your password.",
            })
            return
        }

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `https://kairos-buildshot.vercel.app/auth/callback?next=/dashboard/settings`,
            })

            if (error) {
                toast.error("Reset failed", {
                    description: error.message,
                })
            } else {
                toast.success("Reset link sent", {
                    description: "Check your email for password reset instructions.",
                })
            }
        } catch (error: any) {
            toast.error("An unexpected error occurred", {
                description: "Please try again later.",
            })
        }
    }

    return (
        <div
            className="h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden bg-[#0B0B0B] relative"
            style={{
                background: "radial-gradient(circle at 50% 0%, rgba(0, 200, 83, 0.08), transparent 70%), #0B0B0B",
            }}
        >
            {/* Logo in top left corner */}
            <Link
                href="/"
                className="absolute top-6 left-6 hidden md:flex items-center gap-2 group cursor-pointer z-50 transition-all duration-300 hover:opacity-80"
            >
                <img src="/kairos-logo.svg" alt="Kairos Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-emerald-500/10" />
                <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Kairos
                </span>
            </Link>

            <AuthCard
                isLoading={isLoading}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                rememberMe={rememberMe}
                setRememberMe={setRememberMe}
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                onSignIn={handleSignIn}
                onSignUp={handleSignUp}
                onSocialLogin={handleSocialLogin}
                onForgotPassword={handleForgotPassword}
                activeTab={activeTab}
                setActiveTab={handleTabChange}
            />

        </div>
    )
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-[#0B0B0B]" />}>
            <OnboardingContent />
        </Suspense>
    )
}
