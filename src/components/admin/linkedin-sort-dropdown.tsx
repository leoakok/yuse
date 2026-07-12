"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { labelForLinkedInSort, LINKEDIN_SORT_OPTIONS, type LinkedInJobSortBy } from "@/lib/admin/linkedin-sort";
import { cn } from "@/lib/utils";

type LinkedInSortDropdownProps = {
  value: LinkedInJobSortBy;
  onChange: (value: LinkedInJobSortBy) => void;
  disabled?: boolean;
  className?: string;
};

export function LinkedInSortDropdown({ value, onChange, disabled, className }: LinkedInSortDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn("h-8 gap-1.5 px-2.5 text-xs", className)}
          />
        }
      >
        Sort: {labelForLinkedInSort(value)}
        <ChevronDown className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as LinkedInJobSortBy)}>
          {LINKEDIN_SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
