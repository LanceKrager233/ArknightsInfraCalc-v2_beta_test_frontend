"use client";

import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { copyText } from "./download";

const COPY_COMMAND =
  "copy(localStorage.getItem('SK_OAUTH_CRED_KEY')+','+localStorage.getItem('SK_TOKEN_CACHE_KEY'))";

export function SklandImport({
  onImport,
}: {
  onImport: (credentials: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!credentials.trim()) return;
    setLoading(true);
    try {
      await onImport(credentials);
      setCredentials("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function changeOpen(next: boolean) {
    if (loading) return;
    setOpen(next);
    if (!next) setCredentials("");
  }

  return (
    <>
      <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => setOpen(true)}>
        <ShieldCheck />
        从森空岛获取练度
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>从森空岛获取练度</DialogTitle>
            <DialogDescription>
              凭据仅在当前浏览器内用于直连森空岛，不会发送给本项目服务器，也不会写入本地存储。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => window.open("https://www.skland.com/index", "_blank", "noopener,noreferrer")}>
                <ExternalLink />
                打开森空岛
              </Button>
              <Button type="button" variant="outline" onClick={() => void copyText(COPY_COMMAND)}>
                复制获取命令
              </Button>
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>登录森空岛网页版并打开开发者工具控制台。</li>
              <li>运行复制命令，然后回到这里粘贴结果。</li>
              <li>导入完成后建议清空剪贴板；不要把凭据发给其他人。</li>
            </ol>
            <div className="space-y-2">
              <Label htmlFor="skland-credentials">森空岛凭据</Label>
              <Input
                id="skland-credentials"
                type="password"
                autoComplete="off"
                value={credentials}
                onChange={(event) => setCredentials(event.target.value)}
                placeholder="cred,token"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={loading} onClick={() => changeOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={loading || !credentials.trim()} onClick={() => void submit()}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              {loading ? "正在读取" : "获取练度"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
