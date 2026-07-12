"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type FilterOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type LinkedInFilterDropdownProps<T extends string> = {
  label: string;
  options: Array<FilterOption<T>>;
  selected: T[];
  onChange: (values: T[]) => void;
  className?: string;
};

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function triggerLabel<T extends string>(
  label: string,
  selected: T[],
  options: Array<FilterOption<T>>,
): string {
  if (selected.length === 0) return label;
  if (selected.length === 1) {
    return options.find((option) => option.value === selected[0])?.label ?? label;
  }
  return `${label} (${selected.length})`;
}

export function LinkedInFilterDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
  className,
}: LinkedInFilterDropdownProps<T>) {
  const hasSelection = selected.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant={hasSelection ? "default" : "outline"}
            size="sm"
            className={cn("h-8 gap-1.5 px-2.5 text-xs", className)}
          />
        }
      >
        {triggerLabel(label, selected, options)}
        <ChevronDown className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={() => onChange(toggleValue(selected, option.value))}
            >
              <span className="flex flex-col gap-0.5">
                <span>{option.label}</span>
                {option.description ? (
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                ) : null}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {hasSelection ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onChange([])}>
                Clear {label.toLowerCase()}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
