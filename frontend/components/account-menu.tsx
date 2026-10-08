"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth-provider";

export function AccountMenu() {
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
    <button className="account-button" type="button" onClick={logout}>
      <span className="account-name">{username ?? "Account"}</span>
      <span className="account-detail">Sign out</span>
    </button>
  );
}
