"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth-provider";

export function AccountMenu({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { ready, token, username, logout } = useAuth();

  if (!ready) {
    return (
      <button className="account-button" type="button" disabled>
        <span className="account-name">Account</span>
        <span className="account-detail">Loading</span>
      </button>
    );
  }

  if (!token) {
    return (
      <Link className="account-button" href="/login">
        <span className="account-name">Sign in</span>
        <span className="account-detail">Route 53</span>
      </Link>
    );
  }

  return (
    <div className="header-slot">
      <button
        className="account-button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="account-name">{username ?? "Account"}</span>
        <span className="account-detail">Account</span>
      </button>
      {expanded ? (
        <div className="menu-pop" role="menu" aria-label="Account">
          <p className="menu-label">{username ?? "Account"}</p>
          <button className="menu-item" type="button" role="menuitem" onClick={logout}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
