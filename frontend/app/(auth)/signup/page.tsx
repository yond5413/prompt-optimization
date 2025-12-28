"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const features = [
    "Version control for prompts",
    "Automated evaluation & testing",
    "Self-improving optimization",
    "Transparent change tracking",
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-12">
        <div className="max-w-md">
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Prompt Optimizer</span>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            CI/CD for your LLM prompts
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Treat prompts like code: versioned, testable, auditable, and continuously improved.
          </p>
          
          <ul className="space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-4 lg:p-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Prompt Optimizer</span>
        </div>

        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Get started with your free account today
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Auth
              supabaseClient={supabase}
              view="sign_up"
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "hsl(222.2 47.4% 11.2%)",
                      brandAccent: "hsl(222.2 47.4% 20%)",
                      inputBackground: "transparent",
                      inputBorder: "hsl(var(--border))",
                      inputBorderFocus: "hsl(var(--ring))",
                      inputBorderHover: "hsl(var(--border))",
                    },
                    radii: {
                      borderRadiusButton: "0.5rem",
                      buttonBorderRadius: "0.5rem",
                      inputBorderRadius: "0.5rem",
                    },
                  },
                },
                className: {
                  container: "w-full",
                  button: "w-full font-medium",
                  input: "w-full",
                  label: "text-sm font-medium text-foreground",
                  message: "text-sm text-destructive",
                },
              }}
              providers={["github", "google"]}
              redirectTo={typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined}
              localization={{
                variables: {
                  sign_up: {
                    email_label: "Email address",
                    password_label: "Create a password",
                    button_label: "Create account",
                    loading_button_label: "Creating account...",
                    social_provider_text: "Continue with {{provider}}",
                    link_text: "Don't have an account? Sign up",
                    confirmation_text: "Check your email for the confirmation link",
                  },
                },
              }}
            />
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}


