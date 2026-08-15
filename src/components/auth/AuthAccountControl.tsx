"use client";

import { FormEvent, useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

export function AuthAccountControl() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = mode === "sign-up"
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "登录失败，请检查账号和密码。");
      return;
    }
    setPassword("");
    setOpen(false);
  }

  if (sessionPending) {
    return <div className="h-11 w-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" aria-label="正在读取网站账号" />;
  }

  if (session?.user) {
    const label = session.user.name || session.user.email;
    return (
      <div className="flex h-11 items-center gap-1 rounded-xl border bg-background px-1.5 shadow-xs">
        <span className="flex min-w-0 items-center gap-1.5 px-1 text-sm" title={session.user.email}>
          <UserRound className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden max-w-28 truncate sm:inline">{label}</span>
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title="退出网站账号"
          aria-label="退出网站账号"
          onClick={() => void authClient.signOut()}
        >
          <LogOut aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" className="h-11 rounded-xl px-3.5 shadow-xs" onClick={() => setOpen(true)}>
        <LogIn aria-hidden="true" />
        登录 / 注册
      </Button>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>网站账号</DialogTitle>
            <DialogDescription>排班求解需要登录；技能查询等基础功能可直接使用。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1" aria-label="选择登录或注册">
              <Button type="button" variant={mode === "sign-in" ? "default" : "ghost"} onClick={() => switchMode("sign-in")}>登录</Button>
              <Button type="button" variant={mode === "sign-up" ? "default" : "ghost"} onClick={() => switchMode("sign-up")}>注册</Button>
            </div>
            {mode === "sign-up" ? <div className="grid gap-2">
              <Label htmlFor="site-auth-name">昵称</Label>
              <Input className="h-11 bg-background" id="site-auth-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={64} autoComplete="name" />
            </div> : null}
            <div className="grid gap-2">
              <Label htmlFor="site-auth-email">邮箱</Label>
              <Input className="h-11 bg-background" id="site-auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="site-auth-password">密码</Label>
              <Input className="h-11 bg-background" id="site-auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} />
              <p className="text-xs text-muted-foreground">至少 8 位。</p>
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="submit" size="dialog" disabled={busy}>{busy ? "处理中..." : mode === "sign-up" ? "创建账号" : "登录"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
