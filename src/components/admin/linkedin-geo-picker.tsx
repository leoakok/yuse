"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { adminLinkedInGeoSearch } from "@/lib/api/admin-api";
import type { LinkedInGeoLocation } from "@/lib/types/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GeoSelection = {
  geoId: string;
  label: string;
};

type LinkedInGeoPickerProps = {
  value: GeoSelection | null;
  onChange: (value: GeoSelection | null) => void;
};

export function LinkedInGeoPicker({ value, onChange }: LinkedInGeoPickerProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.label ?? "");
  const [results, setResults] = useState<LinkedInGeoLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value?.geoId, value?.label]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (value && trimmed === value.label) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const items = await adminLinkedInGeoSearch(trimmed);
          setResults(items);
          setActiveIndex(items.length > 0 ? 0 : -1);
        } catch {
          setResults([]);
          setActiveIndex(-1);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [open, query, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectOption(option: LinkedInGeoLocation) {
    onChange({ geoId: option.geoId, label: option.label });
    setQuery(option.label);
    setOpen(false);
    setResults([]);
    setActiveIndex(-1);
  }

  function clearSelection() {
    onChange(null);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-56">
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value && event.target.value !== value.label) {
              onChange(null);
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, results.length - 1));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
              return;
            }
            if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
              event.preventDefault();
              selectOption(results[activeIndex]);
              return;
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Location"
          className="h-8 pr-8 pl-8 text-sm"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-0 size-8 -translate-y-1/2"
            onClick={clearSelection}
            aria-label="Clear location"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {open && (loading || results.length > 0 || query.trim().length >= 2) ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {loading ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Searching...</p>
          ) : results.length > 0 ? (
            results.map((option, index) => (
              <button
                key={option.geoId}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  index === activeIndex && "bg-accent",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                {option.label}
              </button>
            ))
          ) : query.trim().length >= 2 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No locations found.</p>
          ) : (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Type at least 2 characters.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
