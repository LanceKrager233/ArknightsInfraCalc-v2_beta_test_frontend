# 网站账号与 PostgreSQL 上线手册

本文用于在 `develop` 上线网站账号前完成服务器、邮件、数据库和备份准备。不要把本文示例中的占位值直接投入使用，也不要把生成的密钥、连接串、Resend Key 或真实邮件写入 Git、Issue、日志或聊天记录。

## 产品边界

| 能力 | 匿名用户 | 已验证网站账号 |
| --- | --- | --- |
| 技能查询、全角色样例、配置与求解 | 可用 | 可用 |
| MAA JSON / xlsx 导入及求解 | 返回 `AIC-AUTH-2008` | 可用 |
| 森空岛登录、同步和求解 | 不可用 | 仅 development 可用 |
| `/admin/users` | 不可用 | 初始管理员及其通过管理页授予权限的管理员可用 |

`/api/auth/*` 保持 Better Auth 原生响应，是统一 `ApiSuccess | ApiFailure` 信封的唯一例外。应用自有的 `/api/admin/users`、`/api/plan` 和 `/api/skland/*` 继续使用统一信封、请求 ID、同源校验、大小限制和限流。Better Auth 的原生 `/api/auth/admin/*` 全部返回 404，避免开放模拟登录、改密码、删除用户或绕过应用权限边界授予角色等能力。网站昵称为 2–20 个字符，只允许中文、英文字母、数字、空格、下划线和短横线，且不能包含连续空格；页面与 Better Auth 数据库钩子执行同一规则。

`BETTER_AUTH_ADMIN_USER_IDS` 中的账号是不可由网页降级的初始管理员。初始管理员可以在中文管理页将已验证、未封禁的账号设为管理员，角色保存于 PostgreSQL 的 `user.role`。受委派管理员可以搜索、封禁用户及查看或撤销 Session，但不能继续授予或撤销管理员权限，也不能封禁初始管理员或撤销其 Session。服务端每次请求都读取当前数据库角色，因此撤销权限后立即生效。

PostgreSQL 保存网站账号、数据库 Session、验证记录、Better Auth 限流记录，以及 HMAC 化的森空岛绑定标识、对应网站用户和授权时间。森空岛状态中心根据最近授权时间区分七天内有效与待续期绑定，管理后台分别显示两类数量；到期不会删除绑定记录。MAA Box、布局、排班、森空岛 UID/昵称与第三方游戏凭据不会写入 PostgreSQL；凭据仍只保存在绑定网站用户的加密 HttpOnly Cookie 中。

## 1. 准备发信域名

在 Resend 中添加发信域名，按照 Resend 控制台给出的值在 DNS 服务商配置 SPF 与 DKIM，并为该域名添加 DMARC。当前 development 使用已验证的 `yeyouchuan.me`，并创建仅供 development 使用的 API key。From 地址为：

```text
可露希尔基建终端 <noreply@yeyouchuan.me>
```

development 和 production 使用不同的 API key、发信配置与公开 Origin。注册邮箱验证码 10 分钟后失效且数据库只保存哈希，密码重置链接一小时后失效。

## 2. 准备服务器数据库目录

在服务器创建一个不随 Next release 淘汰的运维目录，并从已评审 commit 复制 `deploy/postgres`：

```bash
sudo install -d -m 0755 /opt/arknights-infra-databases
sudo install -m 0644 deploy/postgres/compose.yml /opt/arknights-infra-databases/compose.yml
sudo install -m 0755 deploy/postgres/init-roles.sh /opt/arknights-infra-databases/init-roles.sh
```

分别生成 bootstrap、runtime、migration、backup 密码；每个环境、每个角色都使用不同值：

```bash
openssl rand -hex 32
```

以 `deploy/postgres/example.env` 为模板创建 `/opt/arknights-infra-databases/development.env` 与 `production.env`，设置为 `root:root 0600`。密码使用十六进制可避免 PostgreSQL URL 额外转义。首次启动时初始化脚本会创建：

- runtime 用户：认证表 DML；不能执行 DDL。
- migration 用户：发布时执行仓库内 migration。
- backup 用户：只读认证表，供 `pg_dump` 使用。

## 3. 首次启动 development PostgreSQL

首次只启动 development，避免误建 production 数据卷：

```bash
cd /opt/arknights-infra-databases
sudo docker compose -f compose.yml up -d development
sudo docker compose -f compose.yml ps development
sudo ss -ltnp | grep 55433
```

验收要求：容器为 healthy，主机只出现 `127.0.0.1:55433`，不得出现 `0.0.0.0:55433`、公网 IP 或 Tailscale IP。初始化脚本只在空数据卷运行；如果首次初始化失败，不要直接删除数据卷，先保留日志并确认目标卷后再处理。

## 4. 配置 development 应用环境

编辑 `/opt/arknights-infra-dev/shared/.env.local`，保持 `root:arkinfra 0640` 或更严格权限，并加入：

```text
DATABASE_URL=postgresql://<dev-runtime-user>:<dev-runtime-password>@127.0.0.1:55433/<dev-db>
DATABASE_MIGRATION_URL=postgresql://<dev-migration-user>:<dev-migration-password>@127.0.0.1:55433/<dev-db>
BETTER_AUTH_SECRET=<至少32字节、长期稳定且仅供development使用的随机值>
BETTER_AUTH_URL=https://instance-pi2ohhfj.tail2dca9.ts.net
BETTER_AUTH_ADMIN_USER_IDS=
RESEND_API_KEY=<development Resend API key>
AUTH_EMAIL_FROM=可露希尔基建终端 <noreply@yeyouchuan.me>
```

同时保留 development 已有的 `APP_DEPLOYMENT_ENV=development`、`BETA_PUBLIC_ORIGIN`、`SKLAND_PUBLIC_ORIGIN`、`SKLAND_SESSION_SECRET` 等配置。当前 development 的浏览器 Origin 是 `https://instance-pi2ohhfj.tail2dca9.ts.net`，`BETTER_AUTH_URL`、`BETA_PUBLIC_ORIGIN` 和 `SKLAND_PUBLIC_ORIGIN` 都必须与它一致，并保持 `SKLAND_ALLOW_INSECURE_HTTP=0`。SSH 隧道只用于数据库运维，不改变网站 Origin。以后更换 dev 域名时，将三个 Origin 一起改为浏览器实际访问的 HTTPS Origin；不要填写内部 Next 或 nginx 端口，也绝不能复用 production 的公网 Origin。

`BETTER_AUTH_SECRET` 可以用 `openssl rand -hex 32` 生成。它与 `SKLAND_SESSION_SECRET` 必须不同；两者都要长期稳定，轮换会使现有会话失效。

## 5. 发布前更新固定 deploy helper

本次 release 在构建成功后、切换 `current` 前依次运行 `npm run db:migrate` 与 `npm run auth:check`。后者会用 runtime 连接确认认证配置和已提交表均可用，但不会发送真实邮件。工作流调用的是服务器固定的 `/usr/local/sbin/arknights-infra-deploy`，因此必须在合并到 `develop` 之前，把已通过 PR 门禁的 `scripts/deploy-release.sh` 原子安装到服务器。安装后核对：

```bash
sudo install -o root -g root -m 0755 scripts/deploy-release.sh /usr/local/sbin/arknights-infra-deploy.new
sudo mv /usr/local/sbin/arknights-infra-deploy.new /usr/local/sbin/arknights-infra-deploy
sudo stat -c '%U:%G:%a' /usr/local/sbin/arknights-infra-deploy
/usr/local/sbin/arknights-infra-deploy --contract-version
sha256sum /usr/local/sbin/arknights-infra-deploy
```

预期 owner/mode 为 `root:root:755`、契约版本为 `1`。不要跳过工作流的 owner、mode 或 contract 检查。migration 或认证就绪检查失败时，helper 会删除失败 release，保持原 `current` 与服务不变。

## 6. 首次发布与管理员初始化

合并并推送 `develop` 后等待 `Frontend quality` 与 `Deploy verified branch` 全部成功。第一次发布时 `BETTER_AUTH_ADMIN_USER_IDS` 为空是正常的：先用运营邮箱注册并完成验证，再从数据库只读查询 user ID：

```bash
psql 'postgresql://<dev-backup-user>:<password>@127.0.0.1:55433/<dev-db>' \
  -c 'select id, email, email_verified, created_at from "user" order by created_at desc;'
```

把确认无误的 ID 写入 `BETTER_AUTH_ADMIN_USER_IDS`，多个 ID 用逗号分隔；随后重启 development 服务并访问 `/admin/users`。这些 ID 是权限恢复与后续委派的信任根，不应删除最后一个可用的初始管理员。日常管理员可由初始管理员在页面中授予，不需要继续修改服务器环境变量。

## 7. 配置每日加密备份

服务器至少需要 `pg_dump` 和 `age`。创建专用 `arkbackup` 用户与 age 接收者密钥；私钥离线保存，服务器只需 age 公钥。将脚本与 systemd 模板安装为 root 所有：

```bash
id -u arkbackup >/dev/null 2>&1 || sudo useradd --system --home-dir /var/lib/arkbackup --shell /usr/sbin/nologin arkbackup
sudo install -d -o arkbackup -g arkbackup -m 0700 /var/lib/arkbackup
sudo install -d -o arkbackup -g arkbackup -m 0700 /var/backups/arknights-infra/development
sudo install -o root -g root -m 0755 deploy/postgres/backup.sh /usr/local/sbin/arknights-infra-db-backup
sudo install -o root -g root -m 0644 deploy/postgres/arknights-infra-db-backup@.service /etc/systemd/system/
sudo install -o root -g root -m 0644 deploy/postgres/arknights-infra-db-backup@.timer /etc/systemd/system/
```

development 的 `BACKUP_LOCAL_DIR` 固定填写 `/var/backups/arknights-infra/development`。在 `/etc/arknights-infra/db-backup-development.env` 配置不含密码的 `DATABASE_BACKUP_URL`（例如 `postgresql://arknights_dev_backup@127.0.0.1:55433/arknights_infra_auth`）、独立的 `PGPASSWORD`、`BACKUP_AGE_RECIPIENT` 与 `BACKUP_LOCAL_DIR`。不要把密码嵌入连接 URL，否则会暴露在 `pg_dump` 的进程参数中。环境文件权限设为 `root:arkbackup 0640`。

development 测试期可以省略异地存储；此时脚本只保留最近 14 天的本地加密文件。配置异地存储时，必须同时设置 `RESTIC_REPOSITORY` 与 `RESTIC_PASSWORD_FILE`，并提供对象存储凭据；两个变量只设置一个会使任务失败。restic 密码文件必须只允许 `arkbackup` 读取。production 必须使用与 development 分离的异地仓库。先手动运行一次，再启用定时器：

```bash
sudo systemctl daemon-reload
sudo systemctl start arknights-infra-db-backup@development.service
sudo systemctl enable --now arknights-infra-db-backup@development.timer
systemctl list-timers 'arknights-infra-db-backup@*'
```

本地模式保留最近 14 天的加密文件；异地模式另由 restic 保留 14 个日快照和 8 个周快照。每季度必须在隔离 PostgreSQL 中执行一次解密恢复，并验证迁移版本、账号行数以及注册/验证/登录链路；“备份任务成功”不能代替恢复演练。仅有本地备份无法抵御服务器磁盘损坏或整机丢失，只适合作为 development 测试期的临时方案。

## 8. development 上线验收

上线后逐项确认：

1. PostgreSQL 容器 healthy，只有 `127.0.0.1:55433` 监听。
2. release 的 `.release-sha` 等于已验证 `develop` SHA，systemd 为 active。
3. `/api/health` 成功且 `data.plannerReady: true`；健康响应不含数据库 URL、用户名、版本或原始错误。
4. 注册、验证邮箱、未验证登录拦截、正常登录、找回密码、重置后旧 Session 失效均正常。
5. 匿名全角色样例可求解；匿名 MAA 返回 `AIC-AUTH-2008`；登录后 MAA 可求解。
6. development 森空岛全部入口要求网站账号；退出网站账号、退出全部设备或注销后，原森空岛 Cookie 不能被其他网站用户读取。
7. 管理页只能由初始或受委派管理员访问，可搜索、查看/撤销 Session、封禁和解封；只有初始管理员能授予或撤销管理员角色，受委派管理员不能影响初始管理员；原生 `/api/auth/admin/*` 返回 404。
8. 390px、768px、1440px 下分别完成账号管理的注册、验证提示与账号设置，以及森空岛状态中心的权限引导、七天扫码续期和管理页检查。
9. backup service 成功且本地加密文件存在；配置异地存储时还需确认 restic 快照存在，并在隔离库完成至少一次恢复验证。

production 仍必须保持森空岛代码、文案和 API 从浏览器制品及公开访问面移除。production 数据库、密钥、Resend Key、发信配置和备份路径不得复用 development 的值。
