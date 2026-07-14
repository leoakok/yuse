"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WorkspaceSection,
  WorkspaceSections,
} from "@/components/layout/workspace-section";
import { useWorkspace } from "@/components/layout/workspace-provider";
import { sendTestEmail } from "@/lib/api/admin-api";
import type { TestEmailType } from "@/lib/types/admin";

const EMAIL_TYPES: Array<{ value: TestEmailType; label: string }> = [
  { value: "WELCOME", label: "Welcome" },
  { value: "BETA_APPROVAL", label: "Beta approval" },
  { value: "EMAIL_VERIFICATION", label: "Email verification" },
  { value: "PASSWORD_RESET", label: "Password reset" },
];

export function AdminEmailTesterPanel() {
  const { user } = useWorkspace();
  const [emailType, setEmailType] = useState<TestEmailType>("WELCOME");
  const [recipientEmail, setRecipientEmail] = useState(user.email);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = recipientEmail.trim();
    if (!trimmed) {
      toast.error("Enter a recipient email.");
      return;
    }

    setSending(true);
    try {
      const result = await sendTestEmail(emailType, trimmed);
      if (result.success) {
        toast.success(result.message ?? "Email sent.");
      } else {
        toast.error(result.message ?? "Could not send email.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <WorkspaceSections>
      <WorkspaceSection
        title={
          <span className="flex items-center gap-2">
            <Mail className="size-4" />
            Email tester
          </span>
        }
      >
        <div className="flex max-w-md flex-col gap-4">
          <div className="space-y-2">
            <label htmlFor="test-email-type" className="text-sm font-medium">
              Email type
            </label>
            <Select value={emailType} onValueChange={(value) => setEmailType(value as TestEmailType)}>
              <SelectTrigger id="test-email-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="test-email-recipient" className="text-sm font-medium">
              Recipient
            </label>
            <Input
              id="test-email-recipient"
              type="email"
              autoComplete="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <Button onClick={() => void handleSend()} disabled={sending}>
            {sending ? "Sending..." : "Send preview"}
          </Button>
        </div>
      </WorkspaceSection>
    </WorkspaceSections>
  );
}
