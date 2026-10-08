import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "normal";
};

export function Button({ variant = "normal", className, type = "button", ...props }: ButtonProps) {
  const classes = ["btn", variant === "primary" ? "btn-primary" : "btn-normal", className]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes} {...props} />;
}
