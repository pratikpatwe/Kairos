"use client"

export const dynamic = 'force-dynamic'
import { useState, useEffect } from "react"
import { Menu, X, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import Hero from "@/components/landing/hero"
import Features from "@/components/landing/features"
import AISection from "@/components/landing/ai-section"
import WhyKairos from "@/components/landing/why-kairos"
import Testimonials from "@/components/landing/testimonials"
import { FAQSection } from "@/components/landing/faq-section"
import { Footer } from "@/components/landing/footer"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "system")
    root.classList.add("dark")
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase.auth])

  const handleNavClick = (elementId: string) => {
    setIsMobileMenuOpen(false)
    setTimeout(() => {
      const element = document.getElementById(elementId)
      if (element) {
        const headerOffset = 120
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        })
      }
    }, 100)
  }

  return (
    <div className="min-h-screen w-full relative bg-black">
      {/* Premium Background with Green Gradient Glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(0, 200, 83, 0.08), transparent 60%), #0B0B0B",
        }}
      />

      {/* Desktop Header */}
      <header
        className={`sticky top-4 z-[9999] mx-auto hidden w-full flex-row items-center justify-between self-start rounded-full bg-background/80 md:flex backdrop-blur-sm border border-emerald-500/20 shadow-lg shadow-emerald-500/5 transition-all duration-300 ${isScrolled ? "max-w-3xl" : "max-w-5xl"
          } p-2`}
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          perspective: "1000px",
        }}
      >
        <Link
          className={`z-50 flex items-center justify-center gap-2 transition-all duration-300 ${isScrolled ? "ml-4" : ""
            }`}
          href="/"
        >
          <img src="/kairos-logo.svg" alt="Kairos" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            Kairos
          </span>
        </Link>

        <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-muted-foreground transition duration-200 hover:text-foreground md:flex md:space-x-2 pointer-events-none">
          <button
            className="relative px-4 py-2 text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer pointer-events-auto"
            onClick={() => handleNavClick("features")}
          >
            <span className="relative z-20">Features</span>
          </button>
          <button
            className="relative px-4 py-2 text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer pointer-events-auto"
            onClick={() => handleNavClick("testimonials")}
          >
            <span className="relative z-20">Testimonials</span>
          </button>
          <button
            className="relative px-4 py-2 text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer pointer-events-auto"
            onClick={() => handleNavClick("faq")}
          >
            <span className="relative z-20">FAQ</span>
          </button>
        </div>

        <div className="flex items-center gap-4 z-50">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-full font-bold relative cursor-pointer transition duration-200 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 px-6 py-2.5 text-sm hover:brightness-110 active:scale-95 group"
            >
              Launch App
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/onboarding?mode=signup"
                className="font-medium transition-colors hover:text-emerald-400 text-muted-foreground text-sm cursor-pointer"
              >
                Sign Up
              </Link>

              <Link
                href="/onboarding"
                className="rounded-full font-bold relative cursor-pointer transition duration-200 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 px-5 py-2.5 text-sm hover:brightness-110 active:scale-95"
              >
                Log In
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-4 z-[9999] mx-4 flex w-auto flex-row items-center justify-between rounded-full bg-background/80 backdrop-blur-sm border border-emerald-500/20 shadow-lg md:hidden px-4 py-3">
        <Link
          className="flex items-center justify-center gap-2"
          href="/"
        >
          <img src="/kairos-logo.svg" alt="Kairos" className="h-7 w-7 rounded-lg" />
          <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            Kairos
          </span>
        </Link>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-emerald-500/20 transition-colors hover:bg-emerald-500/10"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5 text-emerald-400" />
          ) : (
            <Menu className="h-5 w-5 text-emerald-400" />
          )}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm md:hidden">
          <div className="absolute top-20 left-4 right-4 bg-background/95 backdrop-blur-md border border-emerald-500/20 rounded-2xl shadow-2xl p-6">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => handleNavClick("features")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-500/10"
              >
                Features
              </button>
              <button
                onClick={() => handleNavClick("testimonials")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-500/10"
              >
                Testimonials
              </button>
              <button
                onClick={() => handleNavClick("faq")}
                className="text-left px-4 py-3 text-lg font-medium text-muted-foreground hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-500/10"
              >
                FAQ
              </button>
              <div className="border-t border-emerald-500/20 pt-4 mt-4 flex flex-col space-y-3">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="w-full py-4 text-lg font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full shadow-lg transition-all duration-200 cursor-pointer hover:brightness-110"
                  >
                    Launch App
                    <ArrowUpRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/onboarding?mode=signup"
                      className="px-4 py-3 text-lg font-medium text-muted-foreground hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-500/10 cursor-pointer"
                    >
                      Sign Up
                    </Link>
                    <Link
                      href="/onboarding"
                      className="px-4 py-3 text-lg font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg shadow-lg transition-all duration-200 cursor-pointer hover:brightness-110"
                    >
                      Log In
                      <ArrowUpRight className="w-5 h-5" />
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <Features />

      {/* AI at the Core Section */}
      <AISection />

      {/* Why Kairos Section */}
      <WhyKairos />

      {/* Testimonials Section */}
      <Testimonials />

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </div>
  )
}
