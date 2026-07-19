import { Header } from "@/features/home/components/header";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 md:pt-32 pb-16">
          {/* Background Gradients */}
          <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-30 dark:opacity-20">
            <div className="absolute h-[500px] w-[500px] rounded-full bg-primary/40 blur-[120px] mix-blend-screen" />
            <div className="absolute right-[-10%] top-[-10%] h-[400px] w-[400px] rounded-full bg-blue-500/30 blur-[100px] mix-blend-screen" />
          </div>

          <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center rounded-full border bg-background/50 px-3 py-1 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              <span>ChaiGPT v1.0 is now live</span>
            </div>

            <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
              The Next Evolution of AI Chat
            </h1>

            <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Experience lightning-fast responses, a beautiful interface, and powerful AI
              capabilities all in one place. Your perfect creative companion.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <SignUpButton mode="modal">
                <Button
                  size="lg"
                  className="rounded-full h-12 px-8 text-base font-semibold transition-all hover:scale-105 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                >
                  Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-24 md:px-6">
          <div className="grid gap-12 md:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Built on Next.js and Vercel AI SDK for immediate streaming responses with zero lag.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold">Advanced Models</h3>
              <p className="text-muted-foreground">
                Interact with state-of-the-art language models capable of coding, writing, and
                reasoning.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold">Beautiful Design</h3>
              <p className="text-muted-foreground">
                A premium, distraction-free interface carefully crafted with Shadcn UI and Tailwind.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
