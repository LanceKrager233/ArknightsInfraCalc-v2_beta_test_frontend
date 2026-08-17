import "server-only";

import { Resend } from "resend";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

export async function sendAuthEmail(input: { to: string; url: string; kind: "verify" | "reset" }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and AUTH_EMAIL_FROM are required to send authentication email.");
  const action = input.kind === "verify" ? "验证邮箱" : "重置密码";
  const result = await new Resend(apiKey).emails.send({
    from,
    to: input.to,
    subject: `${action}｜明日方舟基建排班助手`,
    text: `${action}：${input.url}\n\n链接将在 1 小时后失效。如果不是你发起的操作，请忽略此邮件。`,
    html: `<p>请点击下方链接${action}：</p><p><a href="${escapeHtml(input.url)}">${action}</a></p><p>链接将在 1 小时后失效。如果不是你发起的操作，请忽略此邮件。</p>`,
  });
  if (result.error) throw new Error(`Resend rejected authentication email: ${result.error.message}`);
}
