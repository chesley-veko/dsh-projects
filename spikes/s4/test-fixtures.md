# S4 测试准备（dsh-01 上执行，全部在网页终端里跑）

## 1. 测试目录

```bash
mkdir -p /data/home/workspace/spike-s4-test
cd /data/home/workspace/spike-s4-test

# 3a 用：一个带 git 仓库的 scratch  repo + worktree
git init -q scratch-repo && cd scratch-repo
git config user.email spike@test.local && git config user.name spike
echo "# spike s4 test" > README.md && git add . && git commit -qm "init"
cd ..
git -C scratch-repo worktree add ./wt-1 -b spike-wt-1
# 期望：wt-1 是 scratch-repo 的 worktree，HEAD 在分支 spike-wt-1

# 3b 用：无仓库空目录
mkdir -p ./empty-1
ls -a ./empty-1   # 期望：空，无 .git
```

## 2. 路由扩展（检查项 2 用，测试脚手架）

lab patch（`/data/home/workspace/dsh-superagent-lab/profiles/superagent/cordis.patch.yml`
与 `profiles/smoke/cordis.patch.yml`）的 llm-pi-ai 路由目前只列
`deepseek-v4.1-flash`。在检查项 2 之前，把 `deepseek-v4-pro` 加进
两个文件的 `models` 列表（与 flash 并列），重启服务使之生效：

```yaml
        models:
          - id: deepseek-v4.1-flash
          - id: deepseek-v4-pro
```

- deepseek-v4-pro 在 OpenCode Go 订阅的 30 模型列表里（2026-11-08
  实测 `GET /v1/models`），不需要另开订阅。
- 跑完检查项 2 后把该行 revert，恢复“唯一模型 deepseek-v4.1-flash”
  的 lab 状态，并在报告里写明路由曾临时扩展。

## 3. 全局默认快照（检查项 2 用）

检查项 2 之前存档：

```bash
DSH_HOME=/data/home/workspace/dsh-superagent-lab dsh --profile superagent --dump-config \
  | grep -B1 -A5 'id: agent-default-model' | tee /data/home/workspace/spike-s4-test/default-model-before.txt
curl -s -H "x-orchestrator-request: 1" http://127.0.0.1:3082/orchestrator/api/settings \
  | python3 -m json.tool | grep -A6 '"eval"\|"executor"' | tee /data/home/workspace/spike-s4-test/settings-before.txt
```

检查项 2 之后用同一命令再取一次，diff 对照（期望无 diff）。

## 4. 版本与角色模型复查（每次 live 开头）

```bash
dsh --version
cat "$(npm root -g)/@deepseek-ai/dsh/package.json" | grep '"version"'
node --version && uname -a
curl -s -H "x-orchestrator-request: 1" http://127.0.0.1:3082/orchestrator/api/models | head -c 600
# eval/executor 是否仍钉死 deepseek-v4.1-flash（0.2.2-rc.1 升级后未重验）：
curl -s -H "x-orchestrator-request: 1" http://127.0.0.1:3082/orchestrator/api/settings | python3 -c "import json,sys; d=json.load(sys.stdin); print('eval:', d['blocks']['eval']['value']); print('executor:', d['blocks']['executor']['value']['model'])"
```

## 5. sessionId 生成

```bash
python3 -c "import uuid; print('spike-s4-' + str(uuid.uuid4()))"
```
每项检查用新的 uuid，不得复用。
