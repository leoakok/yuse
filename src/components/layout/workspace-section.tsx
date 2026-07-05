import type { ReactNode } from "react";
import {
  workspaceSectionBodyClassName,
  workspaceSectionHeaderClassName,
  workspaceSectionSubtitleClassName,
  workspaceSectionTitleClassName,
  workspaceSectionsClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";

export {
  workspaceIntroClassName,
  workspaceRowActionButtonClassName,
  workspaceRowActionsClassName,
  workspaceRowClassName,
  workspaceRowHiddenClassName,
  workspaceRowListClassName,
  workspaceSectionBodyClassName,
  workspaceSectionClassName,
  workspaceSectionEditButtonClassName,
  workspaceSectionHeaderClassName,
  workspaceSectionSubtitleClassName,
  workspaceSectionTitleClassName,
  workspaceSectionsClassName,
} from "@/lib/ui/workspace-section";

interface WorkspaceSectionsProps {
  children: ReactNode;
  className?: string;
}

export function WorkspaceSections({ children, className }: WorkspaceSectionsProps) {
  return <div className={cn(workspaceSectionsClassName, className)}>{children}</div>;
}

interface WorkspaceSectionProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}

export function WorkspaceSection({
  title,
  description,
  actions,
  children,
  bodyClassName,
  className,
}: WorkspaceSectionProps) {
  return (
    <section className={className}>
      <div className={workspaceSectionHeaderClassName}>
        <div className="min-w-0">
          {typeof title === "string" ? (
            <h2 className={workspaceSectionTitleClassName}>{title}</h2>
          ) : (
            title
          )}
          {description ? (
            <p className={cn(workspaceSectionSubtitleClassName, title && "mt-0.5")}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className={cn(workspaceSectionBodyClassName, bodyClassName)}>{children}</div>
    </section>
  );
}
