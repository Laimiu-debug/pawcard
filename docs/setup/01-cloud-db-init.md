# 云开发数据库初始化指引

> 这一步需在**微信开发者工具**的云开发控制台手动操作（GUI，无法命令行完成）。
> 云环境 ID：`cloudbase-d0gm6j7hqbc346db6`

## 1. 创建集合

打开微信开发者工具 → 云开发（选环境 `cloudbase-d0gm6j7hqbc346db6`）→ 数据库，创建以下 5 个集合：

- `users`
- `cards`
- `catches_log`
- `config`
- `counters`  （存 cardNo 自增计数器）

## 2. 设置集合权限

进入每个集合的「权限设置」：

| 集合 | 权限 |
|---|---|
| `users` / `cards` / `catches_log` / `counters` | 仅创建者可读写 |
| `config` | 所有用户可读 |

## 3. 向 `config` 插入初始记录

在 `config` 集合逐条「添加记录」，或用「导入」功能导入下面 JSON：

⚠️ **重要：微信云开发数据库导入要求 JSON Lines 格式**（每行一个独立 JSON 对象，**不能有外层方括号 `[]`，行间不能有逗号**）。

用项目里的 **`docs/setup/config-init.jsonl`** 文件导入（已是正确的 JSON Lines 格式）。内容如下供参考：

```
{"key":"recovery_interval_hours","value":4}
{"key":"recovery_speed_vip_hours","value":2}
{"key":"free_balls_max","value":3}
{"key":"vip_balls_max","value":10}
{"key":"rarity_weights","value":{"feature":30,"quality":25,"location":15,"time":10,"ai":20}}
{"key":"rarity_thresholds","value":{"N":0,"R":35,"SR":55,"SSR":75,"UR":90}}
{"key":"artgen_cost_per_card","value":0.2}
{"key":"artgen_retry_threshold","value":0.5}
```

**导入操作**：`config` 集合 → 点「导入」→ 文件格式选 **JSON Lines** → 冲突处理选「错误」→ 选 `config-init.jsonl` → 确认。

> 如果导入还失败，备选方案：放弃导入，直接在 `config` 集合点「添加记录」，逐条手填上面的 8 条（字段名 `key` + `value`）。

## 4. 验收

- 控制台显示 5 个集合
- `config` 集合有 8 条记录
- `users`/`cards`/`catches_log`/`counters` 暂时为空（login 时自动创建 users）

完成后回到实现计划，云函数即可正常读写这些集合。
