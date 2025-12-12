# Contributing Guide / 贡献指南

Thanks for your interest in improving **i want a name**. Please follow the steps below to keep things smooth and consistent.

## Tech stack
- Next.js 16, React 19, TypeScript
- UI: Tailwind CSS 4, Radix UI, lucide-react
- Build/Deploy: npm, Cloudflare Pages

## How to contribute
1. **Fork** this repository to your account.
2. **Create a new branch** in your fork for your change (e.g., `feat/xxx` or `fix/xxx`).
3. **Install deps** (npm is preferred; pnpm lock was removed):  
   ```bash
   npm install
   ```
4. **Develop and test locally**:  
   - Run a build to ensure the project compiles:  
     ```bash
     npm run build
     ```  
   - (Optional) If you add linting, run it before committing.
5. **Commit & push** your branch to your fork.
6. **Open a Pull Request** from your branch to this repo’s `main`. Describe what you changed and why.

## 中文简要
1. Fork 本仓库到你自己的账号。
2. 在 Fork 中新建分支（如 `feat/xxx` 或 `fix/xxx`）。
3. 使用 npm 安装依赖（已移除 pnpm 锁）：`npm install`。
4. 本地验证：至少运行 `npm run build` 确认能编译；如你添加了 lint，请本地跑通过。
5. 提交并推送到你的 Fork 分支。
6. 向本仓库 `main` 提交 PR，说明变更内容和原因。

欢迎补充供应商适配、UI 细节、多语言等改进。谢谢！😊
