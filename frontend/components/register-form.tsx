"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/button";
import { api, ApiError } from "@/lib/api";

function passwordError(password: string) {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 8 || password.length > 72) {
    return "Password must be 8 to 72 characters.";
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "Password must be at most 72 bytes.";
  }
  return null;
}

export function RegisterForm() {
  const auth = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (auth.ready && auth.token) {
      router.replace("/hosted-zones");
    }
  }, [auth.ready, auth.token, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    const passwordMessage = passwordError(password);
    if (passwordMessage) {
      setError(passwordMessage);
      return;
    }
    if (!confirmPassword) {
      setError("Confirm password is required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      router.replace("/login?registered=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
      setPending(false);
    }
  }

  return (
    <div className="login-screen">
      <header className="login-bar">
        <Link className="brand" href="/">
          <Image src="/aws-logo.svg" alt="Amazon Web Services" width={47} height={28} priority unoptimized />
        </Link>
        <span className="login-service">Route 53</span>
      </header>
      <main className="login-main">
        <form className="login-card" method="post" onSubmit={onSubmit}>
          <h1>Create account</h1>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <label className="field">
            <span>Username</span>
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          <Button className="login-submit" variant="primary" type="submit" disabled={pending}>
            {pending ? "Creating account" : "Create account"}
          </Button>
          <div className="login-links">
            <p>
              <Link href="/login">Sign in</Link>
            </p>
            <p>
              <Link href="/">Return to Route 53</Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
