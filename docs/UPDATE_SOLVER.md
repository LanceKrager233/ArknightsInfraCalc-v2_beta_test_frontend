# 更新线上求解器

当前线上环境：

- SSH：`root@114.66.55.78`
- 应用软链：`/opt/arknights-infra/current`
- 求解器：`/opt/arknights-infra/current/bin/infra-cli`
- 内部 Next 端口：`4175`
- 公网 nginx 端口：`4174`
- 服务：`arknights-infra`
- 持久化目录：`/var/lib/arknights-infra`

## 1. 准备并上传 Linux 版求解器

在本地或构建机准备 Linux 版 `infra-cli`。不要上传 Windows 版
`infra-cli.exe`。

先记录本地文件哈希：

```bash
sha256sum ./infra-cli
```

上传到服务器临时路径：

```bash
scp ./infra-cli root@114.66.55.78:/root/infra-cli.new
```

## 2. 原子替换并重启服务

登录服务器：

```bash
ssh root@114.66.55.78
```

执行以下命令。脚本会先备份当前求解器，再在同一目录内原子替换文件；
如果服务重启或健康检查失败，会自动恢复旧求解器。

```bash
set -euo pipefail

app=/opt/arknights-infra/current
new_cli=/root/infra-cli.new
installed_cli="$app/bin/infra-cli"
ts=$(date +%Y%m%d%H%M%S)
backup="$app/bin/infra-cli.backup-$ts"
staged="$app/bin/infra-cli.new-$ts"

test -L "$app"
test -f "$new_cli"
test -f "$installed_cli"

echo "Current solver:"
sha256sum "$installed_cli"

echo "Uploaded solver:"
sha256sum "$new_cli"

cp -a "$installed_cli" "$backup"
install -o arkinfra -g arkinfra -m 0755 "$new_cli" "$staged"

# 该 CLI 暂无 --help 子命令；无参数启动会打印 Usage 并返回非零。
# 捕获输出后检查 Usage，可同时识别传错平台或缺少动态库等启动错误。
cli_probe=$(runuser -u arkinfra -- "$staged" 2>&1 || true)
printf '%s\n' "$cli_probe" | grep -q '^Usage:'

mv -f "$staged" "$installed_cli"
chown arkinfra:arkinfra "$installed_cli"
chmod 0755 "$installed_cli"

if ! systemctl restart arknights-infra; then
  cp -a "$backup" "$installed_cli"
  systemctl restart arknights-infra
  echo "服务重启失败，已恢复旧求解器：$backup" >&2
  exit 1
fi

healthy=false
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4175/api/health >/tmp/arknights-infra-health.json; then
    healthy=true
    break
  fi
  sleep 1
done

if [ "$healthy" != true ]; then
  cp -a "$backup" "$installed_cli"
  systemctl restart arknights-infra
  echo "健康检查失败，已恢复旧求解器：$backup" >&2
  exit 1
fi

echo "Installed solver:"
sha256sum "$installed_cli"
cat /tmp/arknights-infra-health.json
```

## 3. 发布后验证

确认服务、内部端口和公网入口：

```bash
systemctl is-active arknights-infra
ss -ltnp 'sport = :4175'
curl -fsS http://127.0.0.1:4175/api/health
curl -fsS http://127.0.0.1:4174/api/health
journalctl -u arknights-infra -n 80 --no-pager
```

健康结果至少应满足：

- `success: true`
- `data.status` 为 `ready`
- `data.plannerReady` 为 `true`
- `data.features`只包含安全 feature flags

公共 `/api/health`不得返回 `cliPath`、PID、候选 CLI、仓库路径、存储路径或原始 `serveError`。求解器进程与契约问题应通过 systemd journal 和真实 Full E2 请求定位：

```bash
journalctl -u arknights-infra -n 120 --no-pager
```

然后在公网 `http://114.66.55.78:4174/` 载入 Full E2 并生成一次排班，
确认 `infra-cli serve` 的真实调用链正常。若前端仍可通过 legacy 模式完成求解，则不应仅为切换内部协议而绕过核心仓库测试门禁更新二进制。

## 4. 手动回滚

如果需要回滚到指定备份：

```bash
set -euo pipefail

app=/opt/arknights-infra/current
backup="$app/bin/infra-cli.backup-<timestamp>"

test -f "$backup"
cp -a "$backup" "$app/bin/infra-cli"
chown arkinfra:arkinfra "$app/bin/infra-cli"
chmod 0755 "$app/bin/infra-cli"
systemctl restart arknights-infra
curl -fsS http://127.0.0.1:4175/api/health
```

## 5. 避免被下次前端发布覆盖

服务器上的替换只影响当前 release。下次从仓库发布前端时，部署包里的
`bin/infra-cli` 可能覆盖它。确认新求解器稳定后，还应把同一 Linux 二进制
更新到本仓库的 `bin/infra-cli`，通过 PR 合并后再发布一次前端。
