const CodeReviewTool = require('../src/index');
const { execSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');

// Mock 外部依赖
jest.mock('child_process');
jest.mock('axios');
jest.mock('fs');
jest.mock('ora', () => {
  const spinner = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    text: ''
  };
  return jest.fn(() => spinner);
});

// Mock readline
const mockReadline = {
  question: jest.fn(),
  close: jest.fn()
};
jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue(mockReadline)
}));

describe('CodeReviewTool', () => {
  let reviewer;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    // 初始化测试实例
    reviewer = new CodeReviewTool({ apiKey: mockApiKey });
  });

  describe('构造函数', () => {
    test('使用默认配置正确初始化', () => {
      expect(reviewer.config.apiKey).toBe(mockApiKey);
      expect(reviewer.config.apiEndpoint).toBe('https://api.deepseek.com/chat/completions');
      expect(reviewer.config.maxDiffLines).toBe(300);
      expect(reviewer.config.model).toBe('deepseek-chat');
      expect(reviewer.config.ignoreFiles).toEqual(['.lock', '.json', '.md', '.gitignore']);
    });
  });

  describe('getGitDiff', () => {
    test('成功获取Git差异', () => {
      const mockDiff = 'mock diff content';
      execSync.mockReturnValue(mockDiff);

      const diff = reviewer.getGitDiff();
      expect(diff).toBe(mockDiff);
      expect(execSync).toHaveBeenCalledWith('git diff --cached');
    });

    test('获取Git差异失败时返回null', () => {
      execSync.mockImplementation(() => {
        throw new Error('git command failed');
      });
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = reviewer.getGitDiff();

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith('❌ 获取Git Diff失败: git command failed');

      mockConsoleError.mockRestore();
    });
  });

  describe('parseDiff', () => {
    test('正确解析Git差异', () => {
      const mockDiff = `
diff --git a/test.js b/test.js
+new line
-old line
diff --git a/ignore.json b/ignore.json
+ignored content
`;

      const files = reviewer.parseDiff(mockDiff);
      expect(files).toHaveLength(1);
      expect(files[0].filename).toBe('test.js');
      expect(files[0].changes).toEqual(['+new line', '-old line']);
    });

    test('忽略指定类型的文件', () => {
      const mockDiff = `
diff --git a/test.json b/test.json
+ignored
`;
      const files = reviewer.parseDiff(mockDiff);
      expect(files).toHaveLength(0);
    });
  });

  describe('reviewCode', () => {
    const mockFiles = [{
      filename: 'test.js',
      changes: ['+new line', '-old line']
    }];

    test('成功进行代码审查', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'AI review result'
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);
      mockReadline.question.mockImplementation((_, callback) => callback('y'));

      const result = await reviewer.reviewCode(mockFiles);
      expect(result).toBe(true);
      expect(axios.post).toHaveBeenCalled();
    });

    test('超过最大行数限制时跳过审查', async () => {
      const largeFiles = [{
        filename: 'test.js',
        changes: Array(301).fill('+line')
      }];

      const result = await reviewer.reviewCode(largeFiles);
      expect(result).toBe(true);
      expect(axios.post).not.toHaveBeenCalled();
    });

    test('API调用失败时处理错误', async () => {
      axios.post.mockRejectedValue(new Error('API error'));

      const result = await reviewer.reviewCode(mockFiles);
      expect(result).toBe(true);
    });
  });

  describe('run', () => {
    beforeEach(() => {
      execSync.mockReturnValue('mock diff content');
    });

    test('没有代码变更时直接退出', async () => {
      execSync.mockReturnValue('');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await reviewer.run();
      expect(consoleSpy).toHaveBeenCalledWith("✅ 没有检测到代码变更");
      consoleSpy.mockRestore();
    });




  });
});