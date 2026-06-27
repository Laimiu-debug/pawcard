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

```json
[
  { "key": "recovery_interval_hours", "value": 4 },
  { "key": "recovery_speed_vip_hours", "value": 2 },
  { "key": "free_balls_max", "value": 3 },
  { "key": "vip_balls_max", "value": 10 },
  { "key": "rarity_weights", "value": { "feature": 30, "quality": 25, "location": 15, "time": 10, "ai": 20 } },
  { "key": "rarity_thresholds", "value": { "N": 0, "R": 35, "SR": 55, "SSR": 75, "UR": 90 } },
  { "key": "artgen_cost_per_card", "value": 0.2 },
  { "key": "artgen_retry_threshold", "value": 0.5 }
]
```

> 注意：直接逐条添加时，每条记录的字段是 `key`（字符串）和 `value`（数值或对象）。导入功能需要先建好集合再点「导入」选 JSON 文件。

## 4. 验收

- 控制台显示 5 个集合
- `config` 集合有 8 条记录
- `users`/`cards`/`catches_log`/`counters` 暂时为空（login 时自动创建 users）

完成后回到实现计划，云函数即可正常读写这些集合。
