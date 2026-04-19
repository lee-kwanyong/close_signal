import Link from "next/link";
import type { ReactNode } from "react";

type ActionButtonProps = {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
};

function getVariantClass(variant: NonNullable<ActionButtonProps["variant"]>) {
  switch (variant) {
    case "secondary":
      return "border border-[#cce4db] bg-white text-slate-700 hover:bg-[#f4fbf8] hover:text-[#1f7a63]";
    case "ghost":
      return "border border-transparent bg-transparent text-slate-700 hover:bg-[#f4fbf8] hover:text-[#1f7a63]";
    case "primary":
    default:
      return "border border-[#b7e2d3] bg-[#e7f7f1] text-[#1f7a63] hover:bg-[#dcf2e9]";
  }
}

export default function ActionButton({
  children,
  href,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
}: ActionButtonProps) {
  const classes = `inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition ${getVariantClass(
    variant,
  )} ${disabled ? "pointer-events-none opacity-50" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}