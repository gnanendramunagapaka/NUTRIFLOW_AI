import { ReactNode } from "react";
import { AppShell } from "./AppShell";

export interface LayoutProps {
  children: ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string;
  fullWidth?: boolean;
}

/**
 * NutriFlow Global App Layout wrapper.
 * Defaults fullWidth=true so existing child page containers control their internal margins
 * while inheriting unified TopBar, BottomNav, and safe-padding AppShell structure.
 */
export function Layout({
  children,
  title,
  className,
  contentClassName,
  fullWidth = true,
}: LayoutProps) {
  return (
    <AppShell
      title={title}
      className={className}
      contentClassName={contentClassName}
      fullWidth={fullWidth}
    >
      {children}
    </AppShell>
  );
}

export { AppShell };
