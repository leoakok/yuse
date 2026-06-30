"use client";

import { useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { classifyAssistantMessage } from "@/lib/api/admin-api";
import type { AssistantView } from "@/lib/types/assistant";
import {
  CATEGORY_LABELS,
  type AssistantClassification,
} from "@/lib/types/knowledge";

const VIEW_OPTIONS: { value: AssistantView; label: string }[] = [
  { value: "resumes", label: "Resumes" },
  { value: "sections", label: "Sections" },
  { value: "items", label: "Library items" },
  { value: "resume_detail", label: "Resume editor" },
  { value: "portfolios", label: "Portfolios" },
  { value: "portfolio_detail", label: "Portfolio editor" },
  { value: "digital_twin", label: "Digital twin" },
  { value: "job_tracker", label: "Job tracker" },
];

function ResultField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function IntentPlayground() {
  const [text, setText] = useState("");
  const [view, setView] = useState<AssistantView>("resumes");
  const [result, setResult] = useState<AssistantClassification | null>(null);
  const [classifying, setClassifying] = useState(false);

  async function handleClassify() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Enter a message to classify.");
      return;
    }

    setClassifying(true);
    try {
      const classification = await classifyAssistantMessage(trimmed, { view });
      setResult(classification);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not classify this message.");
    } finally {
      setClassifying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" />
          Intent playground
        </CardTitle>
        <CardDescription>
          Try a message and see how Yuse would categorize it before the main assistant runs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="intent-text" className="text-sm font-medium">
            Message
          </label>
          <Textarea
            id="intent-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="e.g. Help me tailor my resume for a product manager role"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="intent-view" className="text-sm font-medium">
              Screen context
            </label>
            <Select value={view} onValueChange={(value) => setView(value as AssistantView)}>
              <SelectTrigger id="intent-view" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => void handleClassify()} disabled={classifying}>
            {classifying ? "Classifying…" : "Classify"}
          </Button>
        </div>

        {result ? (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ResultField label="Category">
                <Badge variant="secondary">{CATEGORY_LABELS[result.category]}</Badge>
              </ResultField>
              <ResultField label="Confidence">
                {(result.confidence * 100).toFixed(0)}%
              </ResultField>
              <ResultField label="Source">{result.source}</ResultField>
              <ResultField label="Scope handled">
                {result.scopeHandled ? "Yes" : "No"}
              </ResultField>
              <ResultField label="Tags">
                {result.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {result.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </ResultField>
            </div>

            <ResultField label="Reason">{result.reason || "—"}</ResultField>

            {result.cannedReply ? (
              <ResultField label="Canned reply">
                <p className="whitespace-pre-wrap rounded-md border bg-background p-3">
                  {result.cannedReply}
                </p>
              </ResultField>
            ) : null}

            {result.guidance ? (
              <ResultField label="Guidance">
                <p className="whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-xs">
                  {result.guidance}
                </p>
              </ResultField>
            ) : null}

            <ResultField label="Selected entries">
              {result.selectedEntries.length > 0 ? (
                <ul className="space-y-2">
                  {result.selectedEntries.map((entry) => (
                    <li key={entry.id} className="rounded-md border bg-background p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{entry.title}</span>
                        <Badge variant="outline">{CATEGORY_LABELS[entry.category]}</Badge>
                        {!entry.enabled ? (
                          <Badge variant="secondary">Disabled</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.slug}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                "None matched"
              )}
            </ResultField>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
