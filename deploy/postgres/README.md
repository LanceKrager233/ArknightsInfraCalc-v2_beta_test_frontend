# PostgreSQL 运维

`compose.yml` 固定 PostgreSQL 18.4 与镜像 digest，并将 production/development 分别绑定到 `127.0.0.1:55432`、`127.0.0.1:55433`。复制 `example.env` 为两个不入库的 `0600` 环境文件并使用完全不同的密码。初始化脚本创建 runtime、migration 与只读 backup 用户；runtime 只继承认证表 DML 权限，发布使用 `DATABASE_MIGRATION_URL` 执行仓库内 SQL migration。

开发机通过 Tailscale SSH 转发 dev 端口：`ssh -L 15432:127.0.0.1:55433 <server>`。不要开放数据库公网或 Tailscale 监听。

`backup.sh` 生成 age 加密 custom dump，再交给 restic 上传 S3 兼容仓库；保留 14 个日备份和 8 个周备份。`arknights-infra-db-backup@.{service,timer}` 是 production/development 两个 systemd 实例的模板。服务器应把已评审的 `backup.sh` 固定安装为 root 所有的 `/usr/local/sbin/arknights-infra-db-backup`，使用独立 `arkbackup` 用户和 `/etc/arknights-infra/db-backup-{production,development}.env`。两个实例必须配置不同的 `DATABASE_BACKUP_URL` 与 `BACKUP_LOCAL_DIR`。

每季度在隔离数据库执行 `age -d ... | pg_restore --clean --if-exists --no-owner -d <restore-url>`，并记录迁移版本、行数与注册、验证、登录冒烟结果。完整上线顺序见[认证与数据库上线手册](../../docs/AUTHENTICATION_DATABASE.md)。
