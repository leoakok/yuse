"use client";

import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";

import {
  buttonVariants,
  type ButtonVariantProps,
} from "@/components/ui/button-variants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function isIconSize(size: ButtonVariantProps["size"]): boolean {
  return typeof size === "string" && size.startsWith("icon");
}

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Tooltip label. Icon-sized buttons also fall back to `aria-label`. Pass `false` to disable. */
    tooltip?: string | false;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", tooltip, ...props },
  ref,
) {
  const ariaLabel =
    typeof props["aria-label"] === "string" ? props["aria-label"] : undefined;
  const tip =
    tooltip === false
      ? undefined
      : tooltip ?? (isIconSize(size) ? ariaLabel : undefined);

  const button = (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );

  if (!tip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  );
});

export { Button, buttonVariants };
export type { ButtonProps };
