"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/button";
import { api, ApiError } from "@/lib/api";

export function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    setPending(true);
    try {
      const result = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      await auth.login(result.access_token);
      router.replace("/hosted-zones");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed");
    } finally {
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
        <form className="login-card" onSubmit={onSubmit}>
          <h1>Sign in</h1>
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
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <Button className="login-submit" variant="primary" type="submit" disabled={pending}>
            {pending ? "Signing in" : "Sign in"}
          </Button>
          <p className="login-return">
            <Link href="/">Return to Route 53</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
