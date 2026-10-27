# 多人协作：从修改到合并

`main` 是大家共同确认的版本。每次修改先放在自己的分支，再通过 PR 请求合并。

## 这些词是什么意思

| 名称 | 可以这样理解 |
| --- | --- |
| 仓库（Repository） | 项目文件和修改历史的共享文件夹。 |
| 分支（Branch） | 你正在修改的独立版本，不影响 main。 |
| 提交（Commit） | 一次带说明的保存记录。 |
| 推送（Push） | 把本地提交上传到 GitHub。 |
| PR（Pull Request） | 一份合并申请，展示改了哪些文件、为什么改、怎么验证。 |
| 审查（Review） | 同事查看差异、提意见、确认可合并。 |
| 合并（Merge） | 将已确认的修改正式加入 main。 |
| Fork | 没有原仓库写权限时，在自己账号下建立仓库副本，再向原仓库提 PR。 |

## 每次修改的顺序

1. 从最新 main 新建分支，例如 `feat/personal-chat`、`fix/assistant-layout`。一个分支只解决一组相关问题。
2. 修改 `frontend/src/` 和对应 CSS。不要只手改生成的 `程小悠.html`，否则下次构建会覆盖修改。
3. 构建单文件，运行测试，并在浏览器检查实际页面。
4. 提交源码、测试及重新生成的 HTML，然后推送当前分支。
5. 在 GitHub 点击 **Compare & pull request**，base 选原仓库的 `main`，compare 选自己的分支。
6. PR 写清用户可见变化、检查结果和截图。同事确认后点击 **Merge pull request**。
7. 下次修改前先同步最新 main；不要继续在旧 ZIP 上改。

已加入仓库的协作者可使用以下命令；没有权限时先 Fork，`origin` 指向自己的副本。

```sh
git switch main
git pull --ff-only
git switch -c feat/your-change
# 修改文件后
python3 frontend/build-standalone.py
node --test tests/*.mjs
git add frontend tests
git commit -m "feat: 描述这次改变"
git push -u origin feat/your-change
```

## 减少冲突

- 开始前先同步，提前说明正在修改的模块。
- 同时改同一份文件时先协调；遇到冲突逐段核对，不要用“全部保留我的”覆盖同事修改。
- 生成 HTML 冲突时，先合并源码，再运行构建脚本生成。
- 不上传 API Key、账号令牌、真实个人对话、`.env`、浏览器存储、临时截图或备份。
- PR 上传代码不等于发布网站；GitHub Pages 或其他在线托管需要单独配置。
