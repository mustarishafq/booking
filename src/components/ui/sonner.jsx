"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const toastBase =
  "group toast flex w-full items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm shadow-lg backdrop-blur-xl";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position={isMobile ? "top-center" : "bottom-right"}
      gap={12}
      offset={
        isMobile
          ? "calc(1rem + env(safe-area-inset-top, 0px))"
          : {
              bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
              right: "1rem",
            }
      }
      icons={{
        success: <CheckCircle2 className="h-4 w-4 shrink-0" />,
        error: <AlertCircle className="h-4 w-4 shrink-0" />,
        info: <Info className="h-4 w-4 shrink-0" />,
        warning: <AlertTriangle className="h-4 w-4 shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast: `${toastBase} group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border`,
          title: "font-normal leading-snug",
          description: "text-muted-foreground",
          success:
            "!border-success/30 !bg-success/5 !text-success [&_[data-icon]]:!text-success",
          error:
            "!border-destructive/30 !bg-destructive/5 !text-destructive [&_[data-icon]]:!text-destructive",
          info: "!border-info/30 !bg-info/5 !text-info [&_[data-icon]]:!text-info",
          warning:
            "!border-warning/30 !bg-warning/5 !text-warning [&_[data-icon]]:!text-warning",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
