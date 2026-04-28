"use client"

import { motion } from "framer-motion"
import { useState } from "react"

import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePWA } from "@/hooks/use-pwa"
import { Download } from "lucide-react"

export default function Hero() {
    const [isLaunchHovered, setIsLaunchHovered] = useState(false)
    const [isHowHovered, setIsHowHovered] = useState(false)
    const { isInstallable, installApp } = usePWA()

    return (
        <>
            <section className="relative min-h-screen flex flex-col overflow-x-hidden">
                {/* Gradient background effects */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none flex items-center justify-center">
                    <div
                        className="w-[600px] h-[400px] rounded-full blur-[100px] opacity-15 translate-y-10"
                        style={{
                            background: "radial-gradient(circle, rgba(16, 185, 129, 1) 0%, rgba(0, 0, 0, 0) 70%)"
                        }}
                    />
                </div>

                <div className="container mx-auto px-4 py-24 sm:py-32 relative z-10 flex-1 flex flex-col overflow-hidden">
                    <div className="mx-auto max-w-4xl text-center flex-1 flex flex-col justify-center w-full">

                        {/* Main Heading */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="mb-8"
                        >
                            <h1 id="main-title" className="font-bold tracking-tight text-foreground text-center">
                                <span className="text-2xl sm:text-4xl lg:text-5xl">Act at the</span>
                                <br className="sm:hidden" />
                                <span
                                    className="bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent inline-block text-2xl sm:text-4xl lg:text-5xl pt-1 pb-2 sm:pt-2 sm:pb-4 sm:pr-8 ml-2 sm:ml-4"
                                    style={{ fontFamily: "var(--font-momo-signature), cursive" }}
                                >
                                    Right Moment
                                </span>
                            </h1>
                        </motion.div>

                        {/* Sub Heading - max 2 rows */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mx-auto mb-8 sm:mb-12 max-w-3xl text-base sm:text-xl text-muted-foreground leading-relaxed px-4 sm:px-0"
                        >
                            Kairos is an AI-powered life management platform that brings your finances, habits, and well-being into one system to help you make better daily decisions.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
                        >
                            {/* Primary CTA */}
                            <Link href="/dashboard" className="w-full sm:w-auto">
                                <div
                                    className="group cursor-pointer border border-emerald-500/30 bg-gradient-to-r from-emerald-500 to-green-600 gap-1.5 sm:gap-2 h-12 sm:h-[56px] flex items-center justify-center px-4 sm:px-6 rounded-full shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 hover:-translate-y-1 w-full sm:w-auto"
                                    onMouseEnter={() => setIsLaunchHovered(true)}
                                    onMouseLeave={() => setIsLaunchHovered(false)}
                                >
                                    <p className="font-semibold tracking-tight text-white flex items-center gap-1.5 sm:gap-2 justify-center text-sm sm:text-base">
                                        Launch App
                                    </p>
                                    <div className="relative w-5 h-5 overflow-hidden">
                                        <motion.div
                                            className="absolute inset-0 flex items-center justify-center"
                                            initial={{ opacity: 1, x: 0, y: 0 }}
                                            animate={{
                                                opacity: isLaunchHovered ? 0 : 1,
                                                x: isLaunchHovered ? 10 : 0,
                                                y: isLaunchHovered ? -10 : 0
                                            }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                        >
                                            <ArrowRight className="h-5 w-5 text-white" />
                                        </motion.div>
                                        <motion.div
                                            className="absolute inset-0 flex items-center justify-center"
                                            initial={{ opacity: 0, x: -10, y: 10 }}
                                            animate={{
                                                opacity: isLaunchHovered ? 1 : 0,
                                                x: isLaunchHovered ? 0 : -10,
                                                y: isLaunchHovered ? 0 : 10
                                            }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                        >
                                            <ArrowUpRight className="h-5 w-5 text-white" />
                                        </motion.div>
                                    </div>
                                </div>
                            </Link>

                            {/* Secondary CTA */}
                            <Link href="#features" className="w-full sm:w-auto">
                                <div
                                    className="group cursor-pointer border border-border bg-secondary/50 backdrop-blur-sm gap-1.5 sm:gap-2 h-12 sm:h-[56px] flex items-center justify-center px-4 sm:px-6 rounded-full hover:bg-secondary/80 transition-all duration-300 w-full sm:w-auto"
                                    onMouseEnter={() => setIsHowHovered(true)}
                                    onMouseLeave={() => setIsHowHovered(false)}
                                >
                                    <p className="font-medium tracking-tight text-foreground flex items-center gap-1.5 sm:gap-2 justify-center text-sm sm:text-base">
                                        See How It Works
                                    </p>
                                    <div className="relative w-5 h-5 overflow-hidden">
                                        <motion.div
                                            className="absolute inset-0 flex items-center justify-center"
                                            initial={{ opacity: 1, x: 0, y: 0 }}
                                            animate={{
                                                opacity: isHowHovered ? 0 : 1,
                                                x: isHowHovered ? 10 : 0,
                                                y: isHowHovered ? -10 : 0
                                            }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                        >
                                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                        </motion.div>
                                        <motion.div
                                            className="absolute inset-0 flex items-center justify-center"
                                            initial={{ opacity: 0, x: -10, y: 10 }}
                                            animate={{
                                                opacity: isHowHovered ? 1 : 0,
                                                x: isHowHovered ? 0 : -10,
                                                y: isHowHovered ? 0 : 10
                                            }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                        >
                                            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                                        </motion.div>
                                    </div>
                                </div>
                            </Link>

                            {/* PWA Install Button */}
                            {isInstallable && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={installApp}
                                    className="group cursor-pointer border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-md gap-1.5 sm:gap-2 h-12 sm:h-[56px] flex items-center justify-center px-4 sm:px-6 rounded-full hover:bg-emerald-500/20 transition-all duration-300 w-full sm:w-auto"
                                >
                                    <Download className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 group-hover:animate-bounce" />
                                    <p className="font-semibold tracking-tight text-emerald-400 text-sm sm:text-base">
                                        Install App
                                    </p>
                                </motion.button>
                            )}
                        </motion.div>

                        {/* SDG Marquee */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="mt-10 sm:mt-16 flex flex-col items-center justify-center gap-3 sm:gap-4 w-full max-w-xl mx-auto px-4 overflow-hidden"
                        >
                            <span className="text-[8px] sm:text-[10px] font-bold tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground/60 uppercase text-center whitespace-nowrap">
                                Aligned with SDGs
                            </span>

                            <div className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
                                <div className="flex gap-6 sm:gap-8 whitespace-nowrap py-4 w-max animate-marquee [&:has(img:hover)]:[animation-play-state:paused] will-change-transform">
                                    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="flex gap-6 sm:gap-8 items-center shrink-0">
                                                {[
                                                    {
                                                        id: "sdg3",
                                                        title: "Good Health & Well-being",
                                                        desc: "Promotes mental wellness through AI-driven habit tracking."
                                                    },
                                                    {
                                                        id: "sdg4",
                                                        title: "Quality Education",
                                                        desc: "Empowers personal growth with intelligent insights."
                                                    },
                                                    {
                                                        id: "sdg8",
                                                        title: "Decent Work & Growth",
                                                        desc: "Enhances productivity and professional stability."
                                                    },
                                                    {
                                                        id: "sdg12",
                                                        title: "Responsible Consumption",
                                                        desc: "Encourages mindful and sustainable lifestyle choices."
                                                    }
                                                ].map((sdg) => (
                                                    <Tooltip key={`${sdg.id}-${i}`}>
                                                        <TooltipTrigger asChild>
                                                            <div className="relative group/icon cursor-pointer p-1">
                                                                <img
                                                                    src={`/SDGs/${sdg.id}.svg`}
                                                                    alt={sdg.title}
                                                                    className="h-7 w-auto transition-transform duration-300 group-hover/icon:scale-110"
                                                                />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            sideOffset={10}
                                                            className="bg-white/95 backdrop-blur-sm border-zinc-200 text-zinc-900 p-3 max-w-[220px] rounded-xl shadow-xl shadow-black/5"
                                                        >
                                                            <div className="flex flex-col gap-1">
                                                                <p className="text-xs font-bold text-emerald-600">{sdg.title}</p>
                                                                <p className="text-[10px] text-zinc-600 leading-snug">{sdg.desc}</p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                        ))}
                                    </TooltipProvider>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </>
    )
}
