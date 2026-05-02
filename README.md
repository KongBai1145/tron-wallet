# TRON Wallet / TRON 钱包

<p align="center">
  <img src="public/favicon.ico" width="64" height="64" alt="TRON Wallet Logo">
</p>

<p align="center">
  <strong>A modern, secure, cross-platform desktop wallet for the TRON blockchain.</strong>
  <br>
  一款现代、安全、跨平台的 TRON 区块链桌面钱包
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri" alt="Tauri"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React"></a>
  <a href="https://www.rust-lang.org"><img src="https://img.shields.io/badge/Rust-1.75+-DEA584?logo=rust" alt="Rust"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript" alt="TypeScript"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#download">Download</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#screenshots">Screenshots</a>
</p>

<p align="center">
  <img src="screenshot-dashboard.png" alt="TRON Wallet Screenshot" width="720">
</p>

---

## Features / 功能特性

### Core Wallet / 核心钱包

- **Create & Import Wallets / 创建与导入钱包** — Single-sig wallets via mnemonic phrase or private key / 通过助记词或私钥创建单签钱包
- **Watch-Only Wallets / 观察钱包** — Monitor any TRON address without storing keys / 无需存储私钥即可监控任意 TRON 地址
- **Multi-Sig Wallets / 多签钱包** — Import and manage on-chain multi-signature accounts / 导入并管理链上多签账户
- **HD Wallet Derivation / HD 钱包派生** — BIP44-compatible key derivation (secp256k1) / 兼容 BIP44 标准
- **AES-256-GCM Encryption / AES-256-GCM 加密** — Private keys encrypted with user password / 用户密码加密私钥

### Transactions / 交易功能

- **Send TRX / 发送 TRX** — Native TRX transfers with real-time signing / 原生 TRX 转账，实时签名广播
- **Send TRC-20 / 发送 TRC-20 代币** — USDT, USDC, JST, WIN, BTT and any TRC-20 token / 支持 USDT、USDC 等任意 TRC-20 代币
- **Transaction History / 交易历史** — Full transaction history with pagination / 完整交易记录，支持分页加载
- **Fee Estimation / 手续费估算** — Real-time bandwidth/energy cost calculation / 实时计算带宽/能量消耗
- **QR Code / 二维码** — Generate receive addresses as QR codes / 生成收款地址二维码

### Resource Management / 资源管理

- **Bandwidth & Energy / 带宽与能量** — Real-time resource usage monitoring / 实时资源使用情况监控
- **Stake TRX (Freeze) / 质押 TRX** — Freeze TRX for bandwidth or energy (Stake 2.0) / 为带宽或能量质押 TRX
- **Unstake (Unfreeze) / 解冻** — Unfreeze with 14-day countdown display / 解冻并显示 14 天倒计时
- **Delegate Resources / 资源委托** — Delegate bandwidth/energy to other accounts / 将带宽/能量委托给其他账户
- **Withdraw Expired / 提取到期** — Claim expired unfrozen TRX / 领取已解冻的 TRX

### Voting & Governance / 投票与治理

- **Super Representatives / 超级代表** — Browse all 27 SRs with stats / 浏览全部 27 个 SR 及其数据
- **Vote Allocation / 投票分配** — Distribute votes across multiple SRs / 将投票分配给多个 SR
- **Voting Power / 投票权** — Based on staked TRX (1 TRX = 1 Vote) / 基于质押的 TRX

### Additional Features / 其他功能

- **DApp Browser / DApp 浏览器** — Quick access to SunSwap, JustLend, APENFT, TRONSCAN / 快速访问 SunSwap、JustLend、APENFT、TRONSCAN
- **Address Book / 地址簿** — Save, organize, and favorite frequently used addresses / 保存、整理、收藏常用地址
- **Auto-Lock / 自动锁定** — Configurable inactivity lock (1/5/15/30 min) / 可配置闲置锁定时间
- **Multi-Language / 多语言** — 简体中文 / 繁體中文 / English
- **Dark Mode / 深色模式** — System-aware theme with dark/light toggle / 跟随系统或手动切换
- **Real-Time Price / 实时价格** — TRX price with 24h change, auto-refresh every 60s / TRX 价格与 24h 涨跌

---

## Download / 下载安装

### Latest Release / 最新版本

| Platform / 平台 | Download / 下载 | Note / 说明 |
|------|------|------|
| Windows | [tron-wallet_0.1.0_x64-setup.exe](https://github.com/KongBai1145/tron-wallet/releases/latest) | Installer / 安装程序 |
| Windows | [tron-wallet_0.1.0_x64_en-US.msi](https://github.com/KongBai1145/tron-wallet/releases/latest) | MSI Installer / MSI 安装包 |

> Visit [Releases](https://github.com/KongBai1145/tron-wallet/releases) page to download.

### System Requirements / 系统要求

- **Windows**: Windows 10/11 (x64)
- **macOS**: Coming soon / 即将支持
- **Linux**: Coming soon / 即将支持

---

## Quick Start / 快速开始

### Prerequisites / 环境要求

- [Node.js](https://nodejs.org) >= 18
- [pnpm](https://pnpm.io) (recommended / 推荐) or npm
- [Rust](https://www.rust-lang.org/tools/install) >= 1.75
- Tauri platform dependencies — see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) / Tauri 平台依赖

### Install / 安装依赖

```bash
# Clone the repository / 克隆仓库
git clone https://github.com/KongBai1145/tron-wallet.git
cd tron-wallet

# Install dependencies / 安装依赖
pnpm install
```

### Development / 开发运行

```bash
# Start development server / 启动开发服务器
pnpm tauri dev
```

### Build / 构建生产版本

```bash
# Build for production / 构建生产版本
pnpm tauri build
```

The built binary is at `src-tauri/target/release/` and the installer at `src-tauri/target/release/bundle/`.
构建产物位于 `src-tauri/target/release/bundle/` 目录。

---

## Tech Stack / 技术栈

| Layer / 层级 | Technology / 技术 |
|------|------|
| **Desktop Runtime / 桌面运行时** | [Tauri 2](https://tauri.app) |
| **Backend / 后端** | Rust (tokio, reqwest, aes-gcm, k256) |
| **Frontend / 前端** | React 18 + TypeScript 5 |
| **Styling / 样式** | Tailwind CSS 3.4 |
| **State Management / 状态管理** | Zustand |
| **Animations / 动画** | Framer Motion |
| **Icons / 图标** | Lucide React |
| **i18n / 国际化** | i18next + react-i18next |
| **QR Codes / 二维码** | qrcode.react |
| **Charts / 图表** | Recharts |
| **Build / 构建工具** | Vite 5 |

---

## Project Structure / 项目结构

```
tron-wallet/
├── src/                          # Frontend / 前端 (React + TypeScript)
│   ├── components/
│   │   ├── layout/               # App shell (Header, Sidebar, StatusBar)
│   │   └── ui/                   # Reusable components (Button, Input, Modal...)
│   ├── pages/                    # Route pages
│   ├── stores/                   # Zustand state stores
│   ├── i18n/                     # Translation files (zh-CN, zh-TW, en)
│   └── App.tsx                   # Root component
├── src-tauri/                    # Backend / 后端 (Rust)
│   ├── src/
│   │   ├── commands/             # Tauri command handlers
│   │   ├── core/                 # Core logic (wallet, transaction)
│   │   ├── db/                   # SQLite database
│   │   ├── models/               # Data models
│   │   ├── network/              # TronGrid API client
│   │   └── crypto/               # Encryption utilities
│   ├── Cargo.toml
│   └── tauri.conf.json
└── tailwind.config.ts
```

---

## Screenshots / 截图预览

<p align="center">
  <img src="screenshot-dashboard.png" alt="Dashboard" width="640">
</p>

---

## Security / 安全说明

- **Private keys never leave your device / 私钥永不离开设备** — All signing happens locally / 所有签名均在本地完成
- **AES-256-GCM encryption / AES-256-GCM 加密** — Keys encrypted with user password / 私钥由用户密码加密
- **No telemetry / 无遥测** — Zero data collection or analytics / 零数据收集与分析
- **Open source / 开源可审计** — Fully auditable codebase / 完整开源代码
- **Sandboxed backend / 沙盒后端** — Tauri isolates Rust from the webview / Tauri 安全模型隔离后端与前端

---

## Supported Networks / 支持的网络

| Network / 网络 | Endpoint / 节点地址 | Status / 状态 |
|------|------|------|
| **Mainnet / 主网** | `api.trongrid.io` | Production / 生产环境 |
| **Shasta Testnet / Shasta 测试网** | `api.shasta.trongrid.io` | Testing / 测试环境 |

---

## Internationalization / 国际化

| Language / 语言 | Code / 代码 | Status / 状态 |
|------|------|------|
| 简体中文 | `zh-CN` | Complete / 完整 |
| 繁體中文 | `zh-TW` | Complete / 完整 |
| English | `en` | Complete / 完整 |

---

## Contributors / 贡献者

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/KongBai1145">
        <img src="https://github.com/KongBai1145.png" width="64" alt=""/>
        <br />
        <sub><b>LouisAlice</b></sub>
      </a>
      <br />
      <span>Founder & Lead Developer / 创始人 & 主要开发者</span>
    </td>
  </tr>
</table>

---

## Contributing / 参与贡献

Contributions are welcome! / 欢迎贡献代码！

1. Fork the repository / Fork 本仓库
2. Create a feature branch / 创建功能分支：`git checkout -b feature/新功能`
3. Commit your changes / 提交更改：`git commit -m 'feat: 添加新功能'`
4. Push the branch / 推送分支：`git push origin feature/新功能`
5. Open a Pull Request / 提交 Pull Request

### Development Guidelines / 开发规范

- **Rust**: Follow `clippy` lints, run `cargo fmt` before committing / 提交前运行 `cargo fmt`
- **TypeScript**: Strict mode, avoid `any` / 严格模式，避免使用 `any`
- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`...) / 使用约定式提交

---

## Roadmap / 路线图

- [ ] Hardware wallet integration (Ledger) / 硬件钱包集成（Ledger）
- [ ] WalletConnect protocol support / WalletConnect 协议支持
- [ ] NFT metadata display (TRC-721 / TRC-1155) / NFT 元数据显示
- [ ] Built-in DApp browser (WebView) / 内置 DApp 浏览器（WebView）
- [ ] Transaction notifications / 交易通知
- [ ] Address book import/export (CSV) / 地址簿导入/导出（CSV）
- [ ] Custom token list management / 自定义代币列表
- [ ] Staking reward analytics / 质押收益分析

---

## License / 许可证

This project is licensed under the MIT License — see [LICENSE](LICENSE) file.
本项目采用 MIT 许可证。

---

<p align="center">
  <strong>Built with ❤️ for the TRON ecosystem / 为 TRON 生态而生</strong>
</p>
