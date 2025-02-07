# AI Code Review

一个基于 AI 的代码审查工具，可以自动对 Git 暂存区的代码变更进行智能分析和审查。目前只支持 DeepSeek 的 API，未来会支持更多的 AI 模型。

> **注意**：由于 DeepSeek API 使用人数较多，可能偶尔会遇到服务器繁忙的情况。如果遇到此类问题，建议稍后重试。安装过程依赖 Node.js，请确保已安装 Node.js。

## 特性

- 自动分析 Git 暂存区的代码变更
- 基于 AI 的智能代码审查
- 支持自定义配置和过滤规则
- 交互式确认提交流程
- 支持各种编程语言的代码审查

## 安装

```bash
npm install -g ai-code-review-assistant
# 或者
yarn global add ai-code-review-assistant
# 或者
pnpm add -g ai-code-review-assistant
```

## 使用方法

### 手动使用

1. 首先确保你已经将要提交的代码添加到 Git 暂存区：

```bash
git add .
```

2. 运行代码审查工具：

```bash
aicr
```

工具会自动分析暂存区的代码变更，并提供 AI 审查意见。根据提示，你可以选择是否继续提交代码。

### Git Pre-commit 钩子集成

你可以将 ai-code-review 集成到 Git pre-commit 钩子中，这样在每次提交代码时都会自动运行代码审查。

1. 在项目根目录创建 `.git/hooks/pre-commit` 文件：

```bash
#!/bin/sh

# 运行 AI 代码审查
aicr

# 如果代码审查失败，阻止提交
if [ $? -ne 0 ]; then
    echo "代码审查未通过，提交已被阻止"
    exit 1
fi
```

2. 添加执行权限：

```bash
chmod +x .git/hooks/pre-commit
```

现在，每次运行 `git commit` 时都会自动触发代码审查。如果审查未通过，提交将被阻止。

你也可以使用 [husky](https://github.com/typicode/husky) 来更方便地管理 Git 钩子：

1. 安装 husky：

```bash
npm install husky --save-dev
# 或者
yarn add husky --dev
# 或者
pnpm add husky --save-dev
```

2. 启用 Git 钩子：

```bash
npx husky install
```

3. 添加 pre-commit 钩子：

```bash
npx husky add .husky/pre-commit "aicr"
```

4. 在 package.json 中添加 prepare 脚本：

```json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

这样，团队中的其他开发者在安装项目依赖时会自动启用 Git 钩子。

## 配置

### 配置文件（推荐）

推荐在项目根目录创建 `.reviewrc.json` 文件进行配置，这是最简单和可维护的配置方式：

```json
{
  "apiKey": "your-api-key",
  "apiEndpoint": "https://api.example.com/chat/completions",
  "ignoreFiles": [".lock", ".json", ".md", ".gitignore"],
  "maxDiffLines": 300,
  "model": "deepseek-chat"
}
```

配置选项说明：

- `apiKey`: AI API 密钥（必需）
- `apiEndpoint`: API 端点地址（可选，默认使用 DeepSeek API）
- `ignoreFiles`: 忽略的文件类型（可选，默认值如上）
- `maxDiffLines`: 最大审查行数（可选，默认 300 行）
- `model`: 使用的 AI 模型（可选，默认 'deepseek-chat'）

### 电脑系统环境变量

你也可以通过系统环境变量来配置工具。根据你的操作系统，可以使用以下方式设置：

#### Windows

1. 右键点击"此电脑"或"我的电脑"，选择"属性"
2. 点击"高级系统设置"
3. 点击"环境变量"
4. 在"用户变量"或"系统变量"区域点击"新建"
5. 添加以下变量：
   - 变量名：`REVIEW_API_KEY`，变量值：你的 API 密钥
   - 变量名：`REVIEW_API_ENDPOINT`，变量值：自定义 API 端点（可选）

#### macOS/Linux

1. 编辑你的 shell 配置文件（例如 `~/.bashrc`、`~/.zshrc` 等）
2. 添加以下行：
   ```bash
   export REVIEW_API_KEY="your-api-key"
   export REVIEW_API_ENDPOINT="https://api.example.com/chat/completions"  # 可选
   ```
3. 保存文件并重新加载配置：
   ```bash
   source ~/.bashrc  # 或 source ~/.zshrc
   ```

### 项目环境变量

除了配置文件和系统环境变量，你还可以在项目中使用 .env 文件来配置环境变量：

```env
REVIEW_API_KEY=your-api-key
REVIEW_API_ENDPOINT=https://api.example.com/chat/completions  # 可选
```

注意：环境变量的优先级高于配置文件。

## 示例

```bash
# 设置 API 密钥
export REVIEW_API_KEY="your-api-key"

# 添加文件到暂存区
git add src/feature.js

# 运行代码审查
aicr

# 查看 AI 审查意见并确认是否提交
```

## 许可证

MIT
