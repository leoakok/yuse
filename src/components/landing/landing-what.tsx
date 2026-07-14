import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/reveal";

type LandingWhatProps = {
  isSignedIn?: boolean;
};

export function LandingWhat({ isSignedIn = false }: LandingWhatProps) {
  return (
    <section id="waitlist" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <Reveal>
          <h2 className="text-balance font-serif text-3xl tracking-tight sm:text-4xl">
            Built for the work that does not fit on one page
          </h2>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3">
            {isSignedIn ? (
              <Link href="/home" className={cn(buttonVariants({ size: "lg" }), "w-fit px-5")}>
                Go to app
                <ArrowRight />
              </Link>
            ) : (
              <>
                <WaitlistForm />
                <p className="text-sm text-muted-foreground">
                  Invite-only beta.{" "}
                  <Link
                    href="/login"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Already invited? Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
