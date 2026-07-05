"use client";

import * as React from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { DrawerSheetContent } from "@/components/ui/drawer-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  dropdownMenuItemClassName,
  dropdownMenuLabelClassName,
  dropdownMenuSeparatorClassName,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetTrigger } from "@/components/ui/sheet";

const LARGE_SCREEN_QUERY = "(min-width: 1024px)";

function asStaticClassName(className: unknown): string | undefined {
  return typeof className === "string" ? className : undefined;
}

type ResponsiveDropdownMode = "dropdown" | "sheet";

const ResponsiveDropdownMenuContext =
  React.createContext<ResponsiveDropdownMode>("dropdown");

function useResponsiveDropdownMode(): ResponsiveDropdownMode {
  return React.useContext(ResponsiveDropdownMenuContext);
}

function ResponsiveDropdownMenu({
  children,
  open,
  onOpenChange,
  defaultOpen,
  ...menuProps
}: React.ComponentProps<typeof DropdownMenu>) {
  const isLargeScreen = useMediaQuery(LARGE_SCREEN_QUERY);
  const mode: ResponsiveDropdownMode = isLargeScreen ? "dropdown" : "sheet";
  const sharedProps = { open, onOpenChange, defaultOpen };

  return (
    <ResponsiveDropdownMenuContext.Provider value={mode}>
      {mode === "dropdown" ? (
        <DropdownMenu
          data-slot="responsive-dropdown-menu"
          {...sharedProps}
          {...menuProps}
        >
          {children}
        </DropdownMenu>
      ) : (
        <Sheet data-slot="responsive-dropdown-menu" {...sharedProps}>
          {children}
        </Sheet>
      )}
    </ResponsiveDropdownMenuContext.Provider>
  );
}

type ResponsiveDropdownMenuTriggerProps = Pick<
  React.ComponentProps<typeof DropdownMenuTrigger>,
  "render" | "disabled" | "className" | "children" | "nativeButton"
>;

function ResponsiveDropdownMenuTrigger({
  children,
  render,
  disabled,
  className,
  nativeButton,
}: ResponsiveDropdownMenuTriggerProps) {
  const mode = useResponsiveDropdownMode();

  if (mode === "dropdown") {
    return (
      <DropdownMenuTrigger
        data-slot="responsive-dropdown-menu-trigger"
        render={render}
        disabled={disabled}
        className={className}
        nativeButton={nativeButton}
      >
        {children}
      </DropdownMenuTrigger>
    );
  }

  return (
    <SheetTrigger
      data-slot="responsive-dropdown-menu-trigger"
      render={render}
      disabled={disabled}
      className={asStaticClassName(className)}
      nativeButton={nativeButton}
    >
      {children}
    </SheetTrigger>
  );
}

function ResponsiveDropdownMenuContent({
  className,
  children,
  align,
  alignOffset,
  side,
  sideOffset,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  const mode = useResponsiveDropdownMode();

  if (mode === "dropdown") {
    return (
      <DropdownMenuContent
        data-slot="responsive-dropdown-menu-content"
        className={className}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        {...props}
      >
        {children}
      </DropdownMenuContent>
    );
  }

  return (
    <DrawerSheetContent
      className={asStaticClassName(className)}
      showCloseButton
    >
      <div
        data-slot="responsive-dropdown-menu-content"
        className="px-3 pb-2"
      >
        <div className="rounded-lg p-1 text-popover-foreground">{children}</div>
      </div>
    </DrawerSheetContent>
  );
}

function ResponsiveDropdownMenuGroup({
  className,
  children,
}: React.ComponentProps<typeof DropdownMenuGroup>) {
  const mode = useResponsiveDropdownMode();

  if (mode === "dropdown") {
    return (
      <DropdownMenuGroup className={className}>
        {children}
      </DropdownMenuGroup>
    );
  }

  return (
    <div
      data-slot="responsive-dropdown-menu-group"
      role="group"
      className={asStaticClassName(className)}
    >
      {children}
    </div>
  );
}

function ResponsiveDropdownMenuLabel({
  className,
  inset,
  children,
}: React.ComponentProps<typeof DropdownMenuLabel>) {
  const mode = useResponsiveDropdownMode();

  if (mode === "dropdown") {
    return (
      <DropdownMenuLabel className={className} inset={inset}>
        {children}
      </DropdownMenuLabel>
    );
  }

  return (
    <div
      data-slot="responsive-dropdown-menu-label"
      data-inset={inset}
      className={cn(dropdownMenuLabelClassName, asStaticClassName(className))}
    >
      {children}
    </div>
  );
}

function ResponsiveDropdownMenuSeparator({
  className,
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  const mode = useResponsiveDropdownMode();

  if (mode === "dropdown") {
    return <DropdownMenuSeparator className={className} />;
  }

  return (
    <div
      data-slot="responsive-dropdown-menu-separator"
      role="separator"
      className={cn(dropdownMenuSeparatorClassName, asStaticClassName(className))}
    />
  );
}

function isNativeButtonRender(
  render: React.ComponentProps<typeof DropdownMenuItem>["render"]
): boolean {
  if (render == null) {
    return true;
  }
  return React.isValidElement(render) && render.type === "button";
}

function ResponsiveDropdownMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  render,
  onClick,
  children,
}: React.ComponentProps<typeof DropdownMenuItem>) {
  const mode = useResponsiveDropdownMode();

  if (mode === "dropdown") {
    return (
      <DropdownMenuItem
        className={className}
        inset={inset}
        variant={variant}
        disabled={disabled}
        render={render}
        onClick={onClick}
      >
        {children}
      </DropdownMenuItem>
    );
  }

  const itemClassName = cn(
    dropdownMenuItemClassName,
    "w-full text-left active:bg-accent active:text-accent-foreground",
    asStaticClassName(className)
  );

  if (disabled) {
    return (
      <div
        data-slot="responsive-dropdown-menu-item"
        data-inset={inset}
        data-variant={variant}
        data-disabled
        aria-disabled
        className={itemClassName}
      >
        {children}
      </div>
    );
  }

  const closeRender =
    render ?? (<button type="button" /> as React.ReactElement);

  return (
    <SheetClose
      data-slot="responsive-dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={itemClassName}
      nativeButton={isNativeButtonRender(render)}
      render={closeRender as React.ComponentProps<typeof SheetClose>["render"]}
      onClick={onClick as React.ComponentProps<typeof SheetClose>["onClick"]}
    >
      {children}
    </SheetClose>
  );
}

export {
  ResponsiveDropdownMenu,
  ResponsiveDropdownMenuTrigger,
  ResponsiveDropdownMenuContent,
  ResponsiveDropdownMenuGroup,
  ResponsiveDropdownMenuLabel,
  ResponsiveDropdownMenuItem,
  ResponsiveDropdownMenuSeparator,
};
