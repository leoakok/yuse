"use client";

import * as React from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {
  DrawerSheetContent,
  type DrawerShellHeaderState,
} from "@/components/ui/drawer-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const LARGE_SCREEN_QUERY = "(min-width: 1024px)";

type ResponsiveMode = "dialog" | "sheet";

const ResponsiveDialogContext = React.createContext<ResponsiveMode>("dialog");

type DrawerShellHeaderRegistrationContextValue = {
  registerHeaderPart: (part: Partial<DrawerShellHeaderState>) => void;
};

const DrawerShellHeaderRegistrationContext =
  React.createContext<DrawerShellHeaderRegistrationContextValue | null>(null);

function useResponsiveMode(): ResponsiveMode {
  return React.useContext(ResponsiveDialogContext);
}

function ResponsiveDialog({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const isLargeScreen = useMediaQuery(LARGE_SCREEN_QUERY);
  const mode: ResponsiveMode = isLargeScreen ? "dialog" : "sheet";
  const Root = mode === "dialog" ? Dialog : Sheet;

  return (
    <ResponsiveDialogContext.Provider value={mode}>
      <Root {...props}>{children}</Root>
    </ResponsiveDialogContext.Provider>
  );
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  closeDisabled,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  closeDisabled?: boolean;
}) {
  const mode = useResponsiveMode();
  const [registeredHeader, setRegisteredHeader] = React.useState<DrawerShellHeaderState>(
    {}
  );

  const registerHeaderPart = React.useCallback((part: Partial<DrawerShellHeaderState>) => {
    setRegisteredHeader((current) => {
      const next = { ...current, ...part };
      if (
        Object.is(current.title, next.title) &&
        Object.is(current.description, next.description) &&
        Object.is(current.actions, next.actions)
      ) {
        return current;
      }
      return next;
    });
  }, []);

  const registrationContextValue = React.useMemo(
    () => ({ registerHeaderPart }),
    [registerHeaderPart]
  );

  if (mode === "dialog") {
    return (
      <DialogContent
        className={className}
        showCloseButton={showCloseButton}
        {...props}
      >
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerSheetContent
      className={className}
      bodyClassName="px-4"
      showCloseButton={showCloseButton}
      closeDisabled={closeDisabled}
      title={registeredHeader.title}
      description={registeredHeader.description}
      {...props}
    >
      <DrawerShellHeaderRegistrationContext.Provider value={registrationContextValue}>
        {children}
      </DrawerShellHeaderRegistrationContext.Provider>
    </DrawerSheetContent>
  );
}

function ResponsiveDialogHeader({
  title,
  description,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  const mode = useResponsiveMode();
  const registration = React.useContext(DrawerShellHeaderRegistrationContext);

  React.useLayoutEffect(() => {
    if (mode !== "sheet" || !registration || children) return;
    registration.registerHeaderPart({ title, description });
    return () => {
      registration.registerHeaderPart({ title: undefined, description: undefined });
    };
  }, [children, description, mode, registration, title]);

  if (mode === "dialog") {
    if (children) {
      return (
        <DialogHeader className={className} {...props}>
          {children}
        </DialogHeader>
      );
    }
    return (
      <DialogHeader className={className} {...props}>
        {title ? <DialogTitle>{title}</DialogTitle> : null}
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
    );
  }

  if (children) {
    return (
      <SheetHeader className={cn("sr-only", className)} {...props}>
        {children}
      </SheetHeader>
    );
  }

  return null;
}

function ResponsiveDialogBody({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const mode = useResponsiveMode();

  return (
    <div
      className={cn(mode === "sheet" ? "min-w-0 py-1" : "py-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function ResponsiveDialogFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const mode = useResponsiveMode();
  const Footer = mode === "dialog" ? DialogFooter : SheetFooter;

  return (
    <Footer className={cn(mode === "sheet" && "px-0 pt-2 pb-1", className)} {...props}>
      {children}
    </Footer>
  );
}

function ResponsiveDialogTitle({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const mode = useResponsiveMode();
  const registration = React.useContext(DrawerShellHeaderRegistrationContext);

  React.useLayoutEffect(() => {
    if (mode !== "sheet" || !registration) return;
    registration.registerHeaderPart({ title: children });
    return () => {
      registration.registerHeaderPart({ title: undefined });
    };
  }, [children, mode, registration]);

  if (mode === "dialog") {
    return (
      <DialogTitle className={className} {...props}>
        {children}
      </DialogTitle>
    );
  }

  return (
    <SheetTitle className={cn("sr-only", className)} {...props}>
      {children}
    </SheetTitle>
  );
}

function ResponsiveDialogDescription({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const mode = useResponsiveMode();
  const registration = React.useContext(DrawerShellHeaderRegistrationContext);

  React.useLayoutEffect(() => {
    if (mode !== "sheet" || !registration) return;
    registration.registerHeaderPart({ description: children });
    return () => {
      registration.registerHeaderPart({ description: undefined });
    };
  }, [children, mode, registration]);

  if (mode === "dialog") {
    return (
      <DialogDescription className={className} {...props}>
        {children}
      </DialogDescription>
    );
  }

  return (
    <SheetDescription className={cn("sr-only", className)} {...props}>
      {children}
    </SheetDescription>
  );
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
};
