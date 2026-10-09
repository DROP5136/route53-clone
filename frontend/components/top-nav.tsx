"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CircleHelp, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { navigation } from "@/components/navigation";

type HeaderMenu = "region" | "notifications" | "help" | "settings" | "account";

export function TopNav() {
  const [open, setOpen] = useState<HeaderMenu | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpen(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function toggle(menu: HeaderMenu) {
    setOpen((current) => (current === menu ? null : menu));
  }

  return (
    <header className="topnav">
      <div className="topnav-left">
        <Link className="brand" href="/">
          <Image src="/aws-logo.svg" alt="Amazon Web Services" width={47} height={28} priority unoptimized />
        </Link>
        <span className="topnav-service">Route 53</span>
      </div>
      <div className="topnav-right" ref={barRef}>
        <div className="header-slot">
          <button
            className="region"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open === "region"}
            onClick={() => toggle("region")}
          >
            Global
          </button>
          {open === "region" ? (
            <div className="menu-pop" role="dialog" aria-label="Region">
              <p className="menu-label">Region</p>
              <p className="menu-copy">Route 53 is a global service. There is no Region to select.</p>
            </div>
          ) : null}
        </div>
        <div className="header-slot">
          <button
            className="icon-button"
            type="button"
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={open === "notifications"}
            onClick={() => toggle("notifications")}
          >
            <Bell size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          {open === "notifications" ? (
            <div className="menu-pop" role="dialog" aria-label="Notifications">
              <p className="menu-label">Notifications</p>
              <p className="menu-copy">No new notifications.</p>
            </div>
          ) : null}
        </div>
        <div className="header-slot">
          <button
            className="icon-button"
            type="button"
            aria-label="Help"
            aria-haspopup="menu"
            aria-expanded={open === "help"}
            onClick={() => toggle("help")}
          >
            <CircleHelp size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          {open === "help" ? (
            <div className="menu-pop" role="menu" aria-label="Help">
              <p className="menu-label">Route 53</p>
              {navigation.map((item) => (
                <Link key={item.href} className="menu-item" role="menuitem" href={item.href} onClick={() => setOpen(null)}>
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className="header-slot">
          <button
            className="icon-button"
            type="button"
            aria-label="Settings"
            aria-haspopup="dialog"
            aria-expanded={open === "settings"}
            onClick={() => toggle("settings")}
          >
            <Settings size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          {open === "settings" ? (
            <div className="menu-pop" role="dialog" aria-label="Settings">
              <p className="menu-label">Settings</p>
              <p className="menu-copy">Visual mode: Light</p>
              <p className="menu-copy">Region: Global</p>
            </div>
          ) : null}
        </div>
        <AccountMenu expanded={open === "account"} onToggle={() => toggle("account")} />
      </div>
    </header>
  );
}
