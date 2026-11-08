# Projects INDEX (spike-s3 fixture)

- P-ALPHA — 哨兵 ALPHA-7F3A — 罗定征婚视频站：youshi.fun，月浏览 18,379 次
- P-BETA — 哨兵 BETA-9C21 — dsh-projects：DeepSeek Harness 上的 Projects 工作台
- P-GAMMA — 哨兵 GAMMA-44D8 — superagent：GitHub 评审编排器原型

检查方法：compaction 前后分别取 `GET /spike/system-prompt?sessionId=…` 的
`spike-s3-index` section 全文，与本文件逐字节比对；三个哨兵
（ALPHA-7F3A / BETA-9C21 / GAMMA-44D8）必须全部存在，缺一即为 INDEX
不完整。
