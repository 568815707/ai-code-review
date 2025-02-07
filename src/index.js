#!/usr/bin/env node

const { execSync } = require("child_process");
const axios = require("axios");
const ora = require("ora");
const path = require("path");
const fs = require("fs");

class CodeReviewTool {
  constructor(options = {}) {
    this.config = {
      apiEndpoint: options.apiEndpoint || "https://api.deepseek.com/chat/completions",
      apiKey: options.apiKey,
      ignoreFiles: options.ignoreFiles || [".lock", ".json", ".md", ".gitignore"],
      maxDiffLines: options.maxDiffLines || 300,
      model: options.model || "deepseek-chat",
    };

    if (!this.config.apiKey) {
      console.error("❌ API密钥是必需的。请在配置中提供apiKey。详情请查看文档");
      process.exit(0);
    }

    // 创建一个可重用的 readline 实例
    this.readline = require("readline");
  }

  // 创建用户交互界面的辅助方法
  async promptUser(question) {
    const rl = this.readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      return await new Promise(resolve => {
        rl.question(question, answer => {
          resolve(answer.toLowerCase() === "y");
        });
      });
    } finally {
      rl.close();
    }
  }

  getGitDiff() {
    try {
      const diff = execSync("git diff --cached").toString();
      return diff;
    } catch (error) {
      console.error(`❌ 获取Git Diff失败: ${error.message}`);
      return null;
    }
  }

  parseDiff(diff) {
    const files = [];
    let currentFile = null;

    const lines = diff.split("\n");
    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        if (currentFile) {
          files.push(currentFile);
        }
        const filename = line.split(" b/")[1];
        currentFile = {
          filename,
          changes: [],
        };
      } else if (currentFile && (line.startsWith("+") || line.startsWith("-"))) {
        currentFile.changes.push(line);
      }
    }

    if (currentFile) {
      files.push(currentFile);
    }

    return files.filter(file => {
      const extension = path.extname(file.filename);
      return !this.config.ignoreFiles.some(ignore => 
        ignore.startsWith(".") ? extension === ignore : file.filename.endsWith(ignore)
      );
    });
  }

  async reviewCode(files) {
    const spinner = ora("正在进行AI代码审查...").start();
    try {
      const totalLines = files.reduce((acc, file) => acc + file.changes.length, 0);
      if (totalLines > this.config.maxDiffLines) {
        spinner.warn(`警告: 变更行数(${totalLines})超过限制(${this.config.maxDiffLines})，跳过AI审查`);
        return true;
      }

      const response = await axios.post(
        this.config.apiEndpoint,
        {
          model: this.config.model,
          messages: [
            {
              role: "system",
              content: "你是一个代码审查助手，请对下边所提供的内容进行代码进行检查，并给出建议",
            },
            {
              role: "user",
              content: JSON.stringify(files.map(file => ({ filename: file.filename, changes: file.changes.join("\n") })))
            },
          ],
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const aiResponse = response?.data?.choices?.[0]?.message?.content;
      if (!aiResponse) {
        spinner.warn("服务器繁忙，无法获取 AI 审查结果。");
        const shouldContinue = await this.promptUser("\n是否继续提交代码? (y/N) ");
        return shouldContinue;
      }

      spinner.stop();
      console.log("\n🔍 AI代码审查结果:\n");
      console.log(aiResponse);

      const shouldProceed = await this.promptUser("\n是否继续提交? (y/N) ");
      return shouldProceed;
    } catch (error) {
      spinner.fail(`AI代码审查失败: ${error.message}`);
      return true;
    }
  }

  async run() {
    try {
      const diff = this.getGitDiff();
      if (!diff) {
        console.log("✅ 没有检测到代码变更");
        return;
      }

      const files = this.parseDiff(diff);
      if (files.length === 0) {
        console.log("✅ 没有需要审查的文件变更");
        return;
      }

      const confirmReview = await this.promptUser("\n是否进行AI代码审查? (y/N) ");
      if (!confirmReview) {
        console.log("\n⚠️ 跳过代码审查，继续提交\n");
        return;
      }

      const shouldProceed = await this.reviewCode(files);
      if (!shouldProceed) {
        console.log("\n❌ 提交已取消\n");
        return;
      }

      return true;
    } catch (error) {
      console.error("❌ 执行失败:", error.message);
      process.exit(0);
    }
  }
}

// 从命令行或配置文件加载配置
const loadConfig = () => {
  const configPath = path.join(process.cwd(), ".reviewrc.json");
  let config = {};

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (error) {
      console.warn("⚠️ 警告: 配置文件解析失败，将使用默认配置");
    }
  }

  // 环境变量优先级高于配置文件
  return {
    ...config,
    apiKey: process.env.REVIEW_API_KEY || config.apiKey,
    apiEndpoint: process.env.REVIEW_API_ENDPOINT || config.apiEndpoint,
  };
};

// 命令行入口
if (require.main === module) {
  const config = loadConfig();
  const reviewer = new CodeReviewTool(config);
  reviewer.run();
}

module.exports = CodeReviewTool;