"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigation, serviceHome } from "@/components/navigation";

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="sidenav" aria-label="Route 53">
      <Link
        href={serviceHome.href}
        className={pathname === serviceHome.href ? "sidenav-title active" : "sidenav-title"}
        aria-current={pathname === serviceHome.href ? "page" : undefined}
      >
        {serviceHome.label}
      </Link>
      <ul className="sidenav-list">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link href={item.href} className={active ? "sidenav-link active" : "sidenav-link"} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
