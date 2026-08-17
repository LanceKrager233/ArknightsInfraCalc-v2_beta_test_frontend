"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, LogOut, MailCheck, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OtpInput, type OtpInputHandle, type OtpStatus } from "@/components/interior/otp-input";
import { PasswordStrength } from "@/components/interior/password-strength";
import { WizardSteps } from "@/components/interior/wizard-steps";

type AuthMode = "signin" | "signup" | "forgot";
type AuthStep = "details" | "verify" | "complete";

const CLIENT_SKLAND_ENABLED = process.env.APP_CLIENT_SKLAND_ENABLED === "1";
const MODE_COPY: Record<AuthMode, { title: string; description: string }> = {
  signin: {
    title: "登录网站账号",
    description: CLIENT_SKLAND_ENABLED
      ? "登录后可导入 MAA 数据，并使用森空岛同步。"
      : "登录后可导入 MAA 数据并生成排班。",
  },
  signup: { title: "创建网站账号", description: "填写账号信息后，我们会向邮箱发送 6 位验证码。" },
  forgot: { title: "找回密码", description: "输入注册邮箱，我们会发送一封 1 小时内有效的重置邮件。" },
};

export function AuthAccountControl() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<AuthStep>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const otpRef = useRef<OtpInputHandle>(null);
  const fieldId = useId();

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((current) => Math.max(0, current - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function chooseMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStep("details");
    setPassword("");
    setOtp("");
    setOtpStatus("idle");
    setMessage(null);
    setError(null);
  }

  function errorMessage(value: unknown) {
    return value instanceof Error ? value.message : "操作失败，请稍后重试。";
  }

  async function sendVerificationCode() {
    if (!email.trim()) {
      setError("请先输入要验证的邮箱。");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "email-verification",
      });
      if (result.error) throw new Error(result.error.message);
      setStep("verify");
      setOtp("");
      setOtpStatus("idle");
      otpRef.current?.clear();
      setResendSeconds(60);
      setMessage("验证码已发送，请在 10 分钟内完成验证。");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${location.origin}/account/reset-password` });
        if (result.error) throw new Error(result.error.message);
        setStep("complete");
        setMessage("如果这个邮箱已注册，重置邮件会很快送达。");
      } else if (mode === "signup") {
        const result = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: location.origin });
        if (result.error) throw new Error(result.error.message);
        setStep("verify");
        setResendSeconds(60);
        setMessage("验证码已发送，请在 10 分钟内完成验证。");
      } else {
        const result = await authClient.signIn.email({ email: email.trim(), password, callbackURL: location.href });
        if (result.error) throw new Error(result.error.message);
        await refetch();
        setOpen(false);
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.length !== 6) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setOtpStatus("idle");
    try {
      const result = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp });
      if (result.error) throw new Error(result.error.message);
      setOtpStatus("success");
      setStep("complete");
      setMessage("邮箱验证完成，现在可以登录网站账号。");
    } catch (caught) {
      setOtpStatus("error");
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (isPending && !busy && !message && !error) {
    return <div className="size-9 animate-pulse rounded-lg bg-muted" role="status" aria-label="正在恢复网站账号" />;
  }

  const steps = [
    { id: "details", label: mode === "forgot" ? "确认邮箱" : "账号信息" },
    { id: "verify", label: mode === "forgot" ? "查收邮件" : "验证邮箱" },
    { id: "complete", label: "完成" },
  ];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen && !busy) {
        setStep("details");
        setMessage(null);
        setError(null);
        setOtpStatus("idle");
      }
    }}>
      <DialogTrigger render={<Button type="button" size="icon-lg" variant="outline" aria-label={session ? "网站账号设置" : "登录网站账号"} />}>
        <UserRound />
      </DialogTrigger>
      <DialogContent className="max-w-[min(560px,calc(100vw-1.5rem))] overflow-hidden p-0 sm:max-w-lg" data-auth-wizard={!session || undefined}>
        <div className="px-5 pb-4 pt-6 sm:px-7">
          <DialogHeader>
            <DialogTitle>{session ? "网站账号" : MODE_COPY[mode].title}</DialogTitle>
            <DialogDescription>{session ? session.user.email : MODE_COPY[mode].description}</DialogDescription>
          </DialogHeader>
          {!session ? (
            <WizardSteps
              key={mode}
              steps={steps}
              value={step}
              onValueChange={(value) => {
                if (value === "details") setStep("details");
                if (value === "verify" && mode === "signup") setStep("verify");
              }}
              label="网站账号步骤"
              className="mt-4"
            />
          ) : null}
        </div>

        {session ? (
          <>
            <DialogBody className="grid gap-3 px-5 pb-5 sm:px-7">
              <a href="/account" className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><Settings className="size-4" />账号与设备</a>
              {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
            </DialogBody>
            <DialogFooter className="px-5 pb-5 sm:px-7 sm:pb-7">
              <Button variant="outline" disabled={busy} onClick={async () => {
                setBusy(true);
                const result = await authClient.signOut();
                setBusy(false);
                if (result.error) setMessage(result.error.message ?? "退出失败，请稍后重试。");
                else {
                  await refetch();
                  setOpen(false);
                }
              }}><LogOut />{busy ? "正在退出…" : "退出登录"}</Button>
            </DialogFooter>
          </>
        ) : step === "details" ? (
          <form onSubmit={submitDetails}>
            <DialogBody className="grid gap-4 border-t px-5 py-5 sm:px-7 sm:py-6">
              {mode === "signup" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor={`${fieldId}-name`}>昵称</Label>
                  <Input id={`${fieldId}-name`} value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} placeholder="用于网站内显示" autoComplete="name" />
                </div>
              ) : null}
              <div className="grid gap-1.5">
                <Label htmlFor={`${fieldId}-email`}>邮箱</Label>
                <Input id={`${fieldId}-email`} value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="name@example.com" autoComplete="email" />
              </div>
              {mode !== "forgot" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor={`${fieldId}-password`}>密码</Label>
                  <Input id={`${fieldId}-password`} value={password} onChange={(event) => setPassword(event.target.value)} required type="password" minLength={10} maxLength={128} placeholder="10–128 位" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                  {mode === "signup" ? <PasswordStrength value={password} className="mt-1.5" /> : null}
                </div>
              ) : null}
              {mode === "signup" ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  注册即表示你已阅读并同意<Link className="underline underline-offset-2" href="/terms">服务条款</Link>和<Link className="underline underline-offset-2" href="/privacy">隐私政策</Link>。
                </p>
              ) : null}
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
            </DialogBody>
            <DialogFooter className="flex-col gap-3 border-t px-5 py-4 sm:flex-col sm:px-7 sm:py-5">
              <Button type="submit" size="dialog" className="w-full" disabled={busy}>{busy ? "正在处理…" : mode === "signup" ? "创建账号并发送验证码" : mode === "forgot" ? "发送重置邮件" : "登录"}</Button>
              <div className="flex min-h-11 flex-wrap items-center justify-center gap-x-1 gap-y-0 text-xs">
                <Button type="button" size="sm" variant="ghost" onClick={() => chooseMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "已有账号" : "创建账号"}</Button>
                {mode === "forgot" ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => chooseMode("signin")}><ArrowLeft />返回登录</Button>
                ) : (
                  <Button type="button" size="sm" variant="ghost" onClick={() => chooseMode("forgot")}>忘记密码</Button>
                )}
                {mode === "signin" ? <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void sendVerificationCode()}>验证邮箱</Button> : null}
              </div>
            </DialogFooter>
          </form>
        ) : step === "verify" ? (
          <form onSubmit={verifyCode}>
            <DialogBody className="grid gap-5 border-t px-4 py-6 sm:px-7">
              <div className="text-center">
                <MailCheck className="mx-auto size-8 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">输入邮箱验证码</h3>
                <p className="mt-1 break-all text-sm text-muted-foreground">已发送至 {email}</p>
              </div>
              <OtpInput
                ref={otpRef}
                autoFocus
                disabled={busy}
                status={otpStatus}
                onChange={(value) => {
                  setOtp(value);
                  if (otpStatus === "error") {
                    setOtpStatus("idle");
                    setError(null);
                  }
                }}
                hint="输入邮件中的 6 位数字"
                errorMessage={error ?? "验证码不正确或已失效，请重试。"}
                successMessage="验证成功"
              />
              {message ? <p role="status" className="text-center text-sm text-muted-foreground">{message}</p> : null}
              {error ? <p role="alert" className="sr-only">{error}</p> : null}
            </DialogBody>
            <DialogFooter className="flex-col gap-2 border-t px-5 py-4 sm:flex-col sm:px-7 sm:py-5">
              <Button type="submit" size="dialog" className="w-full" disabled={busy || otp.length !== 6}>{busy ? "正在验证…" : "验证邮箱"}</Button>
              <div className="flex min-h-11 items-center justify-center gap-2 text-xs">
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setStep("details"); setOtpStatus("idle"); setError(null); }}><ArrowLeft />修改邮箱</Button>
                <Button type="button" size="sm" variant="ghost" className="font-number" disabled={busy || resendSeconds > 0} onClick={() => void sendVerificationCode()}>
                  {resendSeconds > 0 ? `${resendSeconds} 秒后重发` : "重新发送验证码"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogBody className="grid justify-items-center gap-3 border-t px-5 py-8 text-center sm:px-7">
              <CheckCircle2 className="size-10 text-emerald-600" aria-hidden="true" />
              <h3 className="font-semibold">{mode === "forgot" ? "重置邮件已发送" : "邮箱验证完成"}</h3>
              {message ? <p role="status" className="max-w-sm text-sm leading-6 text-muted-foreground">{message}</p> : null}
            </DialogBody>
            <DialogFooter className="border-t px-5 py-4 sm:px-7 sm:py-5">
              <Button type="button" size="dialog" className="w-full" onClick={() => chooseMode("signin")}>返回登录</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
