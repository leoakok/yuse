import { CvPreview } from "@/components/cv/cv-preview";
import type { ResumeWithContent } from "@/lib/types/cv";

interface PublicResumeViewProps {
  content: ResumeWithContent;
}

export function PublicResumeView({ content }: PublicResumeViewProps) {
  const name = content.contactProfile?.fullName || content.resume.title;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto min-h-screen max-w-4xl p-4 sm:p-8">
        <CvPreview content={content} interactive className="shadow-sm" />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Resume by {name} on Yuse
        </p>
      </div>
    </div>
  );
}
