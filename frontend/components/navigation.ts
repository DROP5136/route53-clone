export const serviceHome = { href: "/", label: "Route 53" } as const;

export const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/hosted-zones", label: "Hosted zones" },
  { href: "/traffic-policies", label: "Traffic policies" },
  { href: "/health-checks", label: "Health checks" },
  { href: "/resolver", label: "Resolver" },
  { href: "/profiles", label: "Profiles" },
] as const;
