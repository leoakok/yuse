import { YUSE_LOGO_OPTIONS } from "@/components/brand/yuse-logo-options";
import { YuseLogo } from "@/components/brand/yuse-logo";
import { CatalogShell } from "@/components/layout/catalog-shell";
import { Card } from "@/components/ui/card";

export default function LogoPreviewPage() {
  return (
    <CatalogShell
      title="Logo options"
      description="Three slingshot concepts for Yuse. Pick the one that reads best at small sizes."
    >
      <div className="flex flex-col gap-8">
        <div className="grid gap-6 md:grid-cols-3">
          {YUSE_LOGO_OPTIONS.map((option) => {
            const Logo = option.Component;
            return (
              <Card key={option.id} className="flex flex-col gap-4 p-5">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {option.label}
                  </p>
                  <h2 className="text-lg font-semibold">{option.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-6 rounded-lg border bg-muted/40 p-6">
                  <div className="flex flex-col items-center gap-2">
                    <Logo className="size-16 text-foreground" aria-hidden={false} role="img" aria-label={option.title} />
                    <span className="text-xs text-muted-foreground">64px</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Logo className="size-4 text-foreground" />
                    <span className="text-xs text-muted-foreground">16px</span>
                  </div>
                </div>

                <div className="flex items-center justify-center rounded-lg bg-zinc-900 p-6">
                  <Logo className="size-16 text-white" />
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Variant:{" "}
                    <code className="rounded bg-muted px-1 py-0.5">
                      {`<YuseLogo variant="${option.id}" />`}
                    </code>
                  </p>
                  <p>
                    Files:{" "}
                    <a className="underline" href={option.svg}>
                      SVG
                    </a>
                    {" · "}
                    <a className="underline" href={option.png}>
                      PNG
                    </a>
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Current default</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Option C (mascot slingshot) — use{" "}
            <code className="rounded bg-muted px-1 py-0.5">{`<YuseLogo />`}</code> with no variant
            prop.
          </p>
          <div className="mt-4 flex items-center gap-6">
            <YuseLogo className="size-16" />
            <YuseLogo className="size-4" />
            <YuseLogo className="size-16 text-white" />
          </div>
        </Card>
      </div>
    </CatalogShell>
  );
}
