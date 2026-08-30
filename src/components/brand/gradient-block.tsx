import { cn } from "@/lib/utils";

/** Gradient Block — smooth blue-to-orange brand transition surface. */
export function GradientBlock({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children?: React.ReactNode;
  as?: "div" | "section";
}) {
  return (
    <Tag
      className={cn(
        "brand-gradient-block rounded-2xl text-white shadow-[0_8px_32px_rgba(0,86,214,0.2)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
