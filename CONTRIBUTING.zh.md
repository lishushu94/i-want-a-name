# 贡献指南（中文）

感谢你愿意改进 **i want a name**。提交前请按以下步骤操作，避免冲突并保持一致。

## 技术栈
- Next.js 16、React 19、TypeScript
- UI：Tailwind CSS 4、Radix UI、lucide-react
- 构建/部署：npm、Cloudflare Pages

## 流程
1. **Fork** 本仓库到你的账号。
2. 在 Fork 中**创建新分支**（如 `feat/xxx` 或 `fix/xxx`）。
3. **安装依赖**（推荐用 npm，已移除 pnpm 锁）：  
   ```bash
   npm install
   ```
4. **本地验证**：至少运行构建确保编译通过：  
   ```bash
   npm run build
   ```  
   若你添加了 lint，也请在本地跑一遍。
5. **提交并推送**到你的分支。
6. **发起 PR**：从你的 Fork 分支向本仓库 `main` 提交，说明改动和原因。

欢迎贡献供应商适配、UI 细节、多语言等改进。感谢！ 😊
