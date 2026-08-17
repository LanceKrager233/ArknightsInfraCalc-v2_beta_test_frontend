"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UserRow = { id: string; name: string; email: string; emailVerified: boolean; banned: boolean | null; banReason: string | null; createdAt: string };
type SessionRow = { id: string; createdAt: string; updatedAt: string; expiresAt: string; ipAddress: string | null; userAgent: string | null };
type AdminAction = "ban" | "unban" | "revokeSessions";

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sessionsByUser, setSessionsByUser] = useState<Record<string, SessionRow[] | undefined>>({});

  const load = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "无法读取用户");
      setUsers(body.data.users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("").catch((error) => {
      setMessage(error instanceof Error ? error.message : "无法读取用户");
    });
  }, [load]);

  async function act(userId: string, action: AdminAction) {
    setBusyKey(`${userId}:${action}`);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "操作失败");
      setMessage("操作已完成。");
      if (action === "revokeSessions" || action === "ban") {
        setSessionsByUser((current) => ({ ...current, [userId]: [] }));
      }
      await load(query.trim());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleSessions(userId: string) {
    if (sessionsByUser[userId]) {
      setSessionsByUser((current) => ({ ...current, [userId]: undefined }));
      return;
    }
    setBusyKey(`${userId}:sessions`);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "无法读取 Session");
      setSessionsByUser((current) => ({ ...current, [userId]: body.data.sessions }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取 Session");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-5 p-5 sm:p-8">
      <header>
        <a href="/" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">返回排班助手</a>
        <h1 className="mt-3 text-2xl font-semibold">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">仅提供搜索、封禁、查看及撤销 Session。</p>
      </header>

      <form
        className="flex gap-2 max-sm:flex-col"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          void load(query.trim()).catch((error) => {
            setMessage(error instanceof Error ? error.message : "无法读取用户");
          });
        }}
      >
        <Input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="搜索邮箱或昵称" aria-label="搜索邮箱或昵称" />
        <Button type="submit" disabled={loading}>搜索</Button>
      </form>

      {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
      {loading ? <p role="status" className="text-sm text-muted-foreground">正在读取用户…</p> : null}

      <div className="grid gap-3">
        {!loading && users.length === 0 ? <p className="rounded-xl border p-4 text-sm text-muted-foreground">没有匹配的用户。</p> : null}
        {users.map((entry) => {
          const sessions = sessionsByUser[entry.id];
          const actionBusy = busyKey?.startsWith(`${entry.id}:`) ?? false;
          return (
            <article key={entry.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium">{entry.name}</h2>
                  <p className="break-all text-sm text-muted-foreground">{entry.email} · {entry.emailVerified ? "已验证" : "未验证"}{entry.banned ? " · 已封禁" : ""}</p>
                  {entry.banned && entry.banReason ? <p className="mt-1 text-xs text-destructive">原因：{entry.banReason}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={actionBusy} onClick={() => void toggleSessions(entry.id)}>{sessions ? "收起 Session" : "查看 Session"}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={actionBusy} onClick={() => void act(entry.id, "revokeSessions")}>撤销 Session</Button>
                  <Button type="button" size="sm" variant={entry.banned ? "outline" : "destructive"} disabled={actionBusy} onClick={() => void act(entry.id, entry.banned ? "unban" : "ban")}>{entry.banned ? "解封" : "封禁"}</Button>
                </div>
              </div>
              {sessions ? (
                <div className="mt-4 grid gap-2 border-t pt-3">
                  {sessions.length ? sessions.map((current) => (
                    <div key={current.id} className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                      <p>创建：{new Date(current.createdAt).toLocaleString("zh-CN")} · 到期：{new Date(current.expiresAt).toLocaleString("zh-CN")}</p>
                      <p className="mt-1 break-all">{current.ipAddress ?? "未知 IP"} · {current.userAgent ?? "未知浏览器"}</p>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">当前没有有效 Session。</p>}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
