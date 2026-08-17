"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function AccountSettings() {
  const { data: current, isPending } = authClient.useSession();
  const [password, setPassword] = useState("");
  const [busyAction, setBusyAction] = useState<"sessions" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function revokeAllSessions() {
    setBusyAction("sessions");
    setMessage(null);
    const result = await authClient.revokeSessions();
    if (result.error) {
      setMessage(result.error.message ?? "退出失败，请稍后重试。");
      setBusyAction(null);
      return;
    }
    location.assign("/");
  }

  async function deleteAccount() {
    setBusyAction("delete");
    setMessage(null);
    const result = await authClient.deleteUser({ password, callbackURL: location.origin });
    if (result.error) {
      setMessage(result.error.message ?? "注销失败，请稍后重试。");
      setBusyAction(null);
      return;
    }
    location.assign("/");
  }

  return (
    <main className="mx-auto grid max-w-xl gap-6 p-5 sm:p-8">
      <header>
        <a href="/" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">返回排班助手</a>
        <h1 className="mt-3 text-2xl font-semibold">账号与设备</h1>
        <p className="mt-1 text-sm text-muted-foreground">{isPending ? "正在读取账号…" : current?.user.email ?? "请先登录网站账号。"}</p>
      </header>

      <section className="grid gap-3 rounded-xl border p-4" aria-labelledby="session-settings-title">
        <h2 id="session-settings-title" className="font-medium">登录设备</h2>
        <p className="text-sm leading-6 text-muted-foreground">撤销这个账号的全部数据库 Session，并清除当前浏览器保存的第三方游戏账号 Cookie。</p>
        <Button
          type="button"
          variant="outline"
          disabled={!current || busyAction !== null}
          onClick={() => void revokeAllSessions()}
        >
          {busyAction === "sessions" ? "正在退出…" : "退出全部设备"}
        </Button>
      </section>

      <section className="grid gap-3 rounded-xl border border-destructive/30 p-4" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title" className="font-medium">注销账号</h2>
        <p className="text-sm leading-6 text-muted-foreground">重新输入密码确认。账号、全部 Session 和当前浏览器的第三方游戏账号 Cookie 将一并删除，此操作不可撤销。</p>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={10}
          maxLength={128}
          autoComplete="current-password"
          placeholder="当前密码"
          aria-label="注销账号的当前密码"
        />
        <Button
          type="button"
          variant="destructive"
          disabled={!current || password.length < 10 || busyAction !== null}
          onClick={() => void deleteAccount()}
        >
          {busyAction === "delete" ? "正在注销…" : "永久注销账号"}
        </Button>
      </section>

      {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
    </main>
  );
}
