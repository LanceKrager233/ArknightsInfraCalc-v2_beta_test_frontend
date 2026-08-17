"use client";

import { useState, type FormEvent } from "react";
import { LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AuthAccountControl() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({ email, redirectTo: `${location.origin}/account/reset-password` });
        if (result.error) throw new Error(result.error.message);
        setMessage("如果邮箱已注册，重置邮件会很快送达。");
      } else if (mode === "signup") {
        const name = String(form.get("name") ?? "").trim();
        const result = await authClient.signUp.email({ name, email, password, callbackURL: location.origin });
        if (result.error) throw new Error(result.error.message);
        setMessage("注册成功，请查收验证邮件。验证后即可登录。");
      } else {
        const result = await authClient.signIn.email({ email, password, callbackURL: location.href });
        if (result.error) throw new Error(result.error.message);
        await refetch();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  if (isPending && !busy && !message) {
    return <div className="size-9 animate-pulse rounded-lg bg-muted" role="status" aria-label="正在恢复网站账号" />;
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" size="icon-lg" variant="outline" aria-label={session ? "网站账号设置" : "登录网站账号"} />}>
        <UserRound />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{session ? "网站账号" : mode === "signup" ? "注册账号" : mode === "forgot" ? "找回密码" : "登录账号"}</DialogTitle>
          <DialogDescription>{session ? session.user.email : "MAA 导入和 development 第三方同步功能需要已验证的网站账号。"}</DialogDescription>
        </DialogHeader>
        {session ? (
          <DialogBody className="grid gap-3">
            <a href="/account" className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"><Settings className="size-4" />账号与设备</a>
          </DialogBody>
        ) : (
          <form onSubmit={submit}>
            <DialogBody className="grid gap-3">
              {mode === "signup" && <Input name="name" required maxLength={80} placeholder="昵称" autoComplete="name" />}
              <Input name="email" required type="email" placeholder="邮箱" autoComplete="email" />
              {mode !== "forgot" && <Input name="password" required type="password" minLength={10} maxLength={128} placeholder="密码（10–128 位）" autoComplete={mode === "signup" ? "new-password" : "current-password"} />}
              {mode === "signup" && (
                <p className="text-xs leading-5 text-muted-foreground">
                  注册即表示你已阅读并同意<Link className="underline underline-offset-2" href="/terms">服务条款</Link>和<Link className="underline underline-offset-2" href="/privacy">隐私政策</Link>。
                </p>
              )}
              {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
            </DialogBody>
            <DialogFooter className="flex-col sm:flex-col">
              <Button type="submit" disabled={busy}>{busy ? "正在处理" : mode === "signup" ? "注册并发送验证邮件" : mode === "forgot" ? "发送重置邮件" : "登录"}</Button>
              <div className="flex justify-center gap-3 text-xs">
                <button type="button" className="underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "已有账号" : "注册账号"}</button>
                <button type="button" className="underline" onClick={() => setMode(mode === "forgot" ? "signin" : "forgot")}>{mode === "forgot" ? "返回登录" : "忘记密码"}</button>
              </div>
            </DialogFooter>
          </form>
        )}
        {session && <DialogFooter><Button variant="outline" onClick={async () => { const result = await authClient.signOut(); if (result.error) setMessage(result.error.message ?? "退出失败，请稍后重试。"); else await refetch(); }}><LogOut />退出登录</Button></DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
