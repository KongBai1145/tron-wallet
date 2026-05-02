# TRON Wallet — 技术设计文档

> 企业级TRON链钱包 | Windows桌面端 | Tauri 2.0 + React

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [项目结构](#3-项目结构)
4. [安全体系设计](#4-安全体系设计)
5. [钱包核心模块](#5-钱包核心模块)
6. [多签系统设计](#6-多签系统设计)
7. [交易系统设计](#7-交易系统设计)
8. [UI/UX设计规范](#8-uiux设计规范)
9. [DApp交互系统](#9-dapp交互系统)
10. [数据存储设计](#10-数据存储设计)
11. [通知系统](#11-通知系统)
12. [NFT模块](#12-nft模块)
13. [权限与资源管理](#13-权限与资源管理)
14. [国际化方案](#14-国际化方案)
15. [工程化与CI/CD](#15-工程化与cicd)
16. [开发路线图](#16-开发路线图)

---

## 1. 项目概述

### 1.1 定位

面向全类型用户（个人/交易者/企业/开发者）的TRON链桌面钱包，追求交易所级安全、Apple级UI体验。

### 1.2 目标用户

| 用户类型 | 核心需求 | 重点功能 |
|---------|---------|---------|
| 个人投资者 | 安全存储、简单操作 | 一键转账、资产总览、行情 |
| 专业交易者 | 快速操作、批量能力 | 批量转账、快捷键、Gas优化 |
| 企业/DAO | 权限控制、审计追溯 | 多签、提案审批、审计日志 |
| 开发者 | 合约交互、API集成 | 合约调用、ABI工具、API接口 |

### 1.3 支持网络

| 网络 | Chain ID | RPC | 用途 |
|------|----------|-----|------|
| TRON Mainnet | 728126428 | api.trongrid.io | 生产环境 |
| Shasta Testnet | 2494104990 | api.shasta.trongrid.io | 开发测试 |

### 1.4 支持资产

- **TRX**: 原生代币
- **TRC-20**: USDT, USDC, SUN, JST 等标准代币
- **TRC-721**: NFT收藏品

---

## 2. 技术架构

### 2.1 技术栈选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 框架 | Tauri 2.0 | Rust后端，内存安全，包体小(~15MB)，启动快(<1s) |
| 前端 | React 18 + TypeScript | 生态成熟，类型安全，组件化 |
| 状态管理 | Zustand | 轻量，TypeScript友好，无boilerplate |
| UI框架 | Tailwind CSS + Radix UI | 原子化CSS + 无障碍组件库 |
| 动画 | Framer Motion | 流畅的毛玻璃动画效果 |
| 图表 | Recharts | React原生图表库，轻量 |
| 后端语言 | Rust | 内存安全，高性能，加密库丰富 |
| 数据库 | SQLite (rusqlite) | 轻量可靠，加密扩展支持 |
| 密码学 | ring + aes-gcm | Rust生态成熟的加密库 |
| 构建工具 | Vite | 快速HMR，ESBuild |
| 包管理 | pnpm | 快速，节省磁盘空间 |

### 2.2 架构图

```
┌─────────────────────────────────────────────────────┐
│                    Tauri Window                       │
│  ┌───────────────────────────────────────────────┐  │
│  │              React Frontend                    │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │  Pages   │ │  Store   │ │   Components  │  │  │
│  │  │ (Router) │ │ (Zustand)│ │  (Radix UI)   │  │  │
│  │  └────┬─────┘ └────┬─────┘ └───────┬───────┘  │  │
│  │       │            │               │           │  │
│  │  ┌────┴────────────┴───────────────┴────────┐  │  │
│  │  │           Tauri IPC Bridge                │  │  │
│  │  └──────────────────┬───────────────────────┘  │  │
│  └─────────────────────┼─────────────────────────┘  │
│                        │                             │
│  ┌─────────────────────┴─────────────────────────┐  │
│  │              Rust Backend (Core)               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │  │  Wallet   │ │   Tx     │ │   Security   │   │  │
│  │  │  Engine   │ │  Engine  │ │   Module     │   │  │
│  │  └──────────┘ └──────────┘ └──────────────┘   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │  │  Multi-  │ │   TRON   │ │   Storage    │   │  │
│  │  │   Sig    │ │  Client  │ │  (SQLite)    │   │  │
│  │  └──────────┘ └──────────┘ └──────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
    ┌─────┴─────┐ ┌─────┴─────┐ ┌────┴──────┐
    │  TRON Grid │ │  DApp     │ │  Price    │
    │   RPC API  │ │  Browser  │ │  API      │
    └───────────┘ └───────────┘ └───────────┘
```

### 2.3 通信模型

- **前端 → 后端**: Tauri IPC (`invoke`, `emit`, `listen`)
- **后端 → 链**: TRON HTTP API (trongrid/tronstack)
- **后端 → DApp**: WebView postMessage + WalletConnect v2

---

## 3. 项目结构

```
tron-wallet/
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── lib.rs                # 库入口
│   │   ├── commands/             # Tauri 命令 (IPC接口)
│   │   │   ├── mod.rs
│   │   │   ├── wallet.rs         # 钱包相关命令
│   │   │   ├── transaction.rs    # 交易相关命令
│   │   │   ├── multisig.rs       # 多签相关命令
│   │   │   ├── security.rs       # 安全相关命令
│   │   │   ├── address_book.rs   # 地址簿命令
│   │   │   └── settings.rs       # 设置命令
│   │   ├── core/                 # 核心业务逻辑
│   │   │   ├── mod.rs
│   │   │   ├── wallet.rs         # 钱包引擎
│   │   │   ├── keychain.rs       # 密钥管理
│   │   │   ├── transaction.rs    # 交易构建
│   │   │   ├── multisig.rs       # 多签逻辑
│   │   │   └── tron.rs           # TRON协议实现
│   │   ├── crypto/               # 加密模块
│   │   │   ├── mod.rs
│   │   │   ├── aes.rs            # AES-256-GCM
│   │   │   ├── keystore.rs       # Keystore加密
│   │   │   ├── mnemonic.rs       # BIP39助记词
│   │   │   └── derive.rs         # BIP44派生
│   │   ├── db/                   # 数据库
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs         # 表结构
│   │   │   ├── migrations/       # 迁移脚本
│   │   │   └── repository.rs     # 数据访问层
│   │   ├── network/              # 网络层
│   │   │   ├── mod.rs
│   │   │   ├── tron_client.rs    # TRON RPC客户端
│   │   │   ├── price_api.rs      # 行情API
│   │   │   └── dapp_bridge.rs    # DApp通信桥
│   │   ├── models/               # 数据模型
│   │   │   ├── mod.rs
│   │   │   ├── wallet.rs
│   │   │   ├── transaction.rs
│   │   │   └── account.rs
│   │   └── utils/                # 工具函数
│   │       ├── mod.rs
│   │       ├── clipboard.rs      # 剪贴板管理
│   │       └── logger.rs         # 日志
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # React 前端
│   ├── main.tsx                  # 入口
│   ├── App.tsx                   # 根组件
│   ├── assets/                   # 静态资源
│   │   ├── icons/
│   │   ├── images/
│   │   └── fonts/
│   ├── components/               # 通用组件
│   │   ├── ui/                   # 基础UI组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── GlassCard.tsx     # 毛玻璃卡片
│   │   │   ├── Sidebar.tsx
│   │   │   ├── CommandPalette.tsx # 全局命令面板
│   │   │   └── ...
│   │   ├── layout/               # 布局组件
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── wallet/               # 钱包相关组件
│   │   ├── transaction/          # 交易相关组件
│   │   ├── multisig/             # 多签相关组件
│   │   ├── nft/                  # NFT相关组件
│   │   ├── defi/                 # DeFi相关组件
│   │   └── settings/             # 设置相关组件
│   ├── pages/                    # 页面
│   │   ├── Dashboard.tsx         # 仪表盘
│   │   ├── Wallet.tsx            # 钱包管理
│   │   ├── Send.tsx              # 发送
│   │   ├── Receive.tsx           # 接收
│   │   ├── History.tsx           # 交易历史
│   │   ├── Multisig.tsx          # 多签管理
│   │   ├── NFT.tsx               # NFT画廊
│   │   ├── DApp.tsx              # DApp浏览器
│   │   ├── AddressBook.tsx       # 地址簿
│   │   ├── Settings.tsx          # 设置
│   │   └── Developer.tsx         # 开发者工具
│   ├── stores/                   # Zustand状态
│   │   ├── walletStore.ts
│   │   ├── transactionStore.ts
│   │   ├── uiStore.ts
│   │   └── settingsStore.ts
│   ├── hooks/                    # 自定义Hooks
│   │   ├── useWallet.ts
│   │   ├── useTransaction.ts
│   │   └── useTronApi.ts
│   ├── services/                 # 前端服务
│   │   ├── ipc.ts                # Tauri IPC封装
│   │   ├── price.ts              # 行情服务
│   │   └── notification.ts       # 通知服务
│   ├── i18n/                     # 国际化
│   │   ├── zh-CN.json
│   │   ├── zh-TW.json
│   │   └── en.json
│   ├── styles/                   # 样式
│   │   ├── globals.css
│   │   ├── glass.css             # 毛玻璃效果
│   │   └── animations.css
│   └── types/                    # TypeScript类型
│       ├── wallet.ts
│       ├── transaction.ts
│       └── tron.ts
│
├── public/                       # 公共静态资源
├── tests/                        # 测试
│   ├── unit/                     # 单元测试
│   └── e2e/                      # E2E测试
├── .github/                      # GitHub Actions
│   └── workflows/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

---

## 4. 安全体系设计

### 4.1 安全架构总览

```
┌─────────────────────────────────────────────┐
│              用户认证层                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  密码    │  │ Windows  │  │  自动    │   │
│  │  验证    │  │  Hello   │  │  锁屏    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └──────────┬───┴─────────────┘         │
│                  │                           │
│  ┌───────────────┴──────────────────────┐    │
│  │         密钥派生 (Argon2id)          │    │
│  │   password + salt → 256-bit key      │    │
│  └───────────────┬──────────────────────┘    │
│                  │                           │
│  ┌───────────────┴──────────────────────┐    │
│  │      加密存储层 (AES-256-GCM)        │    │
│  │   私钥 / 助记词 / Keystore           │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 4.2 密钥管理

#### 4.2.1 密钥派生

```
用户密码
    │
    ▼
┌──────────────────┐
│  Argon2id         │   参数：
│  (内存硬函数)     │   - 内存: 64MB
│                   │   - 迭代: 3
│                   │   - 并行度: 4
│                   │   - 输出: 32字节
└────────┬─────────┘
         │
         ▼
   256-bit 加密密钥
```

**为什么选Argon2id**: 比scrypt更抗GPU/ASIC攻击，内存硬函数特性让暴力破解成本极高。

#### 4.2.2 私钥存储

```
┌─────────────────────────────────────────┐
│            SQLite 数据库                 │
│  ┌─────────────────────────────────┐    │
│  │  wallets 表                      │    │
│  │  ├─ id (UUID)                    │    │
│  │  ├─ name (钱包名称)              │    │
│  │  ├─ address (TRON地址)           │    │
│  │  ├─ encrypted_seed (加密种子)    │    │
│  │  ├─ salt (Argon2盐值)            │    │
│  │  ├─ nonce (AES-GCM随机数)        │    │
│  │  ├─ tag (AES-GCM认证标签)        │    │
│  │  ├─ derivation_path (派生路径)   │    │
│  │  ├─ wallet_type (单签/多签/观察) │    │
│  │  ├─ created_at                   │    │
│  │  └─ updated_at                   │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**关键设计**:
- 私钥永远不以明文存储在磁盘
- 每个钱包独立salt和nonce
- AES-256-GCM提供认证加密（防篡改）
- 数据库文件本身可用SQLCipher加密

#### 4.2.3 内存安全

```rust
// Rust实现：密钥在内存中的安全处理
use zeroize::Zeroize;

struct SecureKey {
    bytes: Vec<u8>,
}

impl Drop for SecureKey {
    fn drop(&mut self) {
        self.bytes.zeroize(); // 退出时自动清零
    }
}
```

- 使用 `zeroize` crate 确保密钥用完立即清零
- Rust所有权系统防止密钥被意外复制
- 避免密钥进入日志或错误信息

### 4.3 生物识别认证 (Windows Hello)

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  用户    │────▶│ Windows Hello │────▶│  解密密钥   │
│  指纹    │     │  API          │     │  派生       │
└──────────┘     └──────────────┘     └─────────────┘
```

**流程**:
1. 首次设置：用户输入密码 → 派生密钥 → 用Windows Hello保护的密钥加密存储派生密钥的中间态
2. 后续解锁：Windows Hello验证 → 解密中间态 → 派生密钥 → 解密钱包

**Rust实现**: 使用 `windows` crate 调用 `Windows.Security.Credentials.UI` API。

### 4.4 防暴力破解

```rust
struct BruteForceProtection {
    attempts: u32,           // 当前尝试次数
    max_attempts: u32,       // 最大尝试次数 (默认5)
    lockout_duration: Duration, // 锁定时长 (默认15分钟)
    last_attempt: Instant,
}

impl BruteForceProtection {
    fn check(&mut self) -> Result<(), LockoutError> {
        if self.attempts >= self.max_attempts {
            let elapsed = self.last_attempt.elapsed();
            if elapsed < self.lockout_duration {
                return Err(LockoutError::Locked {
                    remaining: self.lockout_duration - elapsed,
                });
            }
            self.attempts = 0; // 锁定时间过后重置
        }
        Ok(())
    }

    fn record_failure(&mut self) {
        self.attempts += 1;
        self.last_attempt = Instant::now();
    }
}
```

**策略**:
- 5次失败 → 锁定15分钟
- 锁定状态持久化到数据库（防重启绕过）
- 可选：每次失败增加锁定时间（指数退避）

### 4.5 剪贴板安全

```rust
use clipboard_win::{get_clipboard, set_clipboard};

pub fn secure_copy(text: &str, clear_after_secs: u64) {
    set_clipboard(text).ok();

    // 定时清除
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(clear_after_secs));
        if get_clipboard::<String>().ok().as_deref() == Some(text) {
            set_clipboard("").ok();
        }
    });
}
```

- 复制地址/私钥后 **30秒自动清除**
- 仅在剪贴板内容未被其他应用修改时才清除
- 可在设置中调整清除时间

### 4.6 反钓鱼保护

```
┌─────────────────────────────────────┐
│          反钓鱼系统                  │
│                                     │
│  1. 用户设置安全短语                │
│     └─ 显示在登录界面固定位置       │
│                                     │
│  2. DApp域名检查                    │
│     └─ 已知钓鱼域名数据库           │
│     └─ URL相似度检测                │
│                                     │
│  3. 交易预览                        │
│     └─ 显示完整目标地址             │
│     └─ 高亮异常大额转账             │
│                                     │
│  4. 合约风险评估                    │
│     └─ 未知合约警告                 │
│     └─ 权限请求详情                 │
└─────────────────────────────────────┘
```

### 4.7 自动锁屏

```rust
pub struct AutoLock {
    timeout: Duration,        // 默认5分钟
    last_activity: Instant,
}

impl AutoLock {
    pub fn is_locked(&self) -> bool {
        self.last_activity.elapsed() > self.timeout
    }

    pub fn reset(&mut self) {
        self.last_activity = Instant::now();
    }
}
```

- 监听鼠标/键盘事件，无操作超时后自动锁定
- 最小化到托盘时立即锁定
- 锁定时清空内存中的敏感数据

---

## 5. 钱包核心模块

### 5.1 钱包类型

```rust
pub enum WalletType {
    SingleSig,      // 单签钱包 (EOA)
    MultiSig,       // 多签钱包
    WatchOnly,      // 观察钱包 (无私钥)
}

pub struct Wallet {
    pub id: Uuid,
    pub name: String,
    pub address: String,           // TRON地址 (T...)
    pub wallet_type: WalletType,
    pub encrypted_seed: Vec<u8>,   // 加密后的种子 (仅单签/多签)
    pub salt: Vec<u8>,
    pub nonce: Vec<u8>,
    pub tag: Vec<u8>,
    pub derivation_path: String,   // m/44'/195'/0'/0/0
    pub network: Network,          // Mainnet / Shasta
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### 5.2 助记词管理 (BIP39/BIP44)

```
┌─────────────────────────────────────────────┐
│           助记词生成流程                      │
│                                             │
│  1. 生成 128-bit 随机熵                     │
│     └─ 使用 OsRng (操作系统安全随机源)      │
│                                             │
│  2. 计算 SHA-256 校验和                      │
│     └─ 128-bit + 4-bit 校验 = 132-bit       │
│                                             │
│  3. 映射为 12 个助记词                       │
│     └─ BIP39 英文词表 (2048词)              │
│                                             │
│  4. PBKDF2 派生种子                         │
│     └─ "mnemonic" + passphrase → 512-bit    │
│                                             │
│  5. BIP44 派生路径                          │
│     └─ m/44'/195'/0'/0/0                    │
│     └─ 195 = TRON 的 coin type              │
└─────────────────────────────────────────────┘
```

**实现**: 使用 `bip39` + `bip32` + `ed25519-dalek` crate。

### 5.3 地址生成

```
助记词 → 种子 → BIP44派生 → Ed25519私钥 → 公钥
                                              │
                                              ▼
                                    Keccak256 哈希
                                              │
                                              ▼
                                    取后20字节
                                              │
                                              ▼
                                    加前缀 0x41
                                              │
                                              ▼
                                    Base58Check 编码
                                              │
                                              ▼
                                    T 开头的TRON地址
```

### 5.4 钱包导入方式

| 方式 | 输入 | 安全级别 | 说明 |
|------|------|---------|------|
| 创建新钱包 | 无 | 高 | 生成新助记词 |
| 助记词导入 | 12/24词 | 高 | BIP39标准助记词 |
| Keystore导入 | JSON + 密码 | 中 | 加密JSON文件 |
| 私钥导入 | 64位hex | 低 | 直接导入私钥 |
| 观察钱包 | 地址 | 无 | 仅监控，不存私钥 |

### 5.5 钱包派生

```
主种子 (BIP39)
    │
    ├─ m/44'/195'/0'/0/0  → 账户1
    ├─ m/44'/195'/0'/0/1  → 账户2
    ├─ m/44'/195'/0'/0/2  → 账户3
    └─ ...
```

支持从一个助记词派生多个账户，每个账户独立管理。

---

## 6. 多签系统设计

### 6.1 多签钱包结构

```rust
pub struct MultiSigWallet {
    pub id: Uuid,
    pub name: String,
    pub address: String,                    // 多签合约地址
    pub threshold: u32,                     // 签名阈值 (M)
    pub signers: Vec<Signer>,               // 签名者列表 (N)
    pub network: Network,
    pub created_at: DateTime<Utc>,
}

pub struct Signer {
    pub address: String,                    // TRON地址
    pub name: String,                       // 显示名称
    pub group: Option<String>,              // 分组 (如 "财务部", "技术部")
    pub role: SignerRole,                   // 角色
}

pub enum SignerRole {
    Owner,          // 拥有者
    Admin,          // 管理员
    Viewer,         // 只能查看
    Executor,       // 可以执行
}
```

### 6.2 多签流程

```
┌──────────────────────────────────────────────────────────┐
│                    多签提案流程                            │
│                                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐ │
│  │ 创建    │───▶│ 审批    │───▶│ 达到    │───▶│ 执行  │ │
│  │ 提案    │    │ 签名    │    │ 阈值    │    │ 交易  │ │
│  └─────────┘    └─────────┘    └─────────┘    └───────┘ │
│       │              │              │              │      │
│       ▼              ▼              ▼              ▼      │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐ │
│  │ 填写    │    │ 各签名  │    │ 自动    │    │ 上链  │ │
│  │ 详情    │    │ 者审查  │    │ 检测    │    │ 确认  │ │
│  └─────────┘    └─────────┘    └─────────┘    └───────┘ │
│                                                          │
│  状态: Draft → Pending → Approved → Executed             │
│                  │                                        │
│                  ▼                                        │
│              Rejected / Expired                           │
└──────────────────────────────────────────────────────────┘
```

### 6.3 提案类型

```rust
pub enum ProposalType {
    Transfer {
        to: String,
        amount: u64,
        token: Option<String>,  // None = TRX, Some = TRC-20地址
    },
    BatchTransfer {
        recipients: Vec<(String, u64)>,
    },
    ChangePermission {
        permission_type: PermissionType,
        keys: Vec<PermissionKey>,
        threshold: u32,
    },
    ChangeMultiSigThreshold {
        new_threshold: u32,
    },
    FreezeBalance {
        amount: u64,
        resource: ResourceType,  // Energy / Bandwidth
    },
    VoteWitness {
        votes: Vec<(String, u64)>,
    },
    Custom {
        contract_address: String,
        method: String,
        params: serde_json::Value,
    },
}
```

### 6.4 提案模板系统

```rust
pub struct ProposalTemplate {
    pub id: Uuid,
    pub name: String,                    // "月度工资发放"
    pub description: String,
    pub proposal_type: ProposalType,
    pub default_signers: Vec<String>,    // 默认签名者
    pub auto_expire_hours: u32,          // 自动过期时间
    pub tags: Vec<String>,
}
```

**用途**: 常用的多签操作可以保存为模板，一键复用。例如：
- "月度工资发放" → 批量转账模板
- "权限变更" → 修改账户权限模板
- "季度投票" → 超级代表投票模板

### 6.5 审计日志

```rust
pub struct AuditLog {
    pub id: Uuid,
    pub proposal_id: Uuid,
    pub action: AuditAction,
    pub actor: String,                   // 操作者地址
    pub details: serde_json::Value,      // 操作详情
    pub timestamp: DateTime<Utc>,
    pub ip_address: Option<String>,
}

pub enum AuditAction {
    ProposalCreated,
    ProposalSigned,
    ProposalRejected,
    ProposalExecuted,
    ProposalExpired,
    SignerAdded,
    SignerRemoved,
    ThresholdChanged,
}
```

所有多签操作都记录到审计日志，支持导出和筛选。

### 6.6 签名状态追踪UI

```
┌────────────────────────────────────────────────┐
│  提案: 月度工资发放                             │
│  状态: ● 等待签名 (2/3)                        │
│  过期: 2026-05-03 18:00                        │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  签名进度                                │  │
│  │  ████████████░░░░░░░  2/3               │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  签名者:                                       │
│  ✅ 张三 (财务部)    已签名  05-01 14:30      │
│  ✅ 李四 (技术部)    已签名  05-01 15:12      │
│  ⏳ 王五 (管理层)    等待中                    │
│                                                │
│  交易详情:                                     │
│  发送: 10,000 USDT                            │
│  接收: TXYZabc...123                          │
│  备注: 5月份工资                               │
│                                                │
│  [ 签名 ]  [ 拒绝 ]  [ 查看原始数据 ]         │
└────────────────────────────────────────────────┘
```

### 6.7 通知机制

当多签提案状态变化时，通知所有相关签名者：

```
事件触发 → 查询签名者列表 → 发送通知
    │
    ├─ 应用内通知 (实时)
    ├─ Windows桌面通知 (实时)
    └─ Webhook回调 (可选，企业集成)
```

---

## 7. 交易系统设计

### 7.1 交易类型

```rust
pub enum TransactionType {
    // TRX 转账
    Transfer {
        to: String,
        amount: u64,           // sun单位 (1 TRX = 1,000,000 sun)
        memo: Option<String>,
    },
    // TRC-20 代币转账
    TRC20Transfer {
        contract: String,      // 代币合约地址
        to: String,
        amount: String,        // 使用字符串避免精度问题
    },
    // 批量转账
    BatchTransfer {
        transfers: Vec<BatchItem>,
    },
    // 冻结TRX
    FreezeBalance {
        amount: u64,
        resource: ResourceType, // Energy | Bandwidth
        receiver: Option<String>, // 代理给他人
    },
    // 解冻TRX
    UnfreezeBalance {
        resource: ResourceType,
    },
    // 投票
    VoteWitness {
        votes: Vec<Vote>,
    },
    // 修改账户权限
    UpdateAccountPermission {
        owner: Permission,
        actives: Vec<Permission>,
    },
    // 触发智能合约
    TriggerContract {
        contract: String,
        method: String,
        params: serde_json::Value,
        call_value: u64,
        fee_limit: u64,
    },
}

pub struct BatchItem {
    pub to: String,
    pub amount: u64,
    pub token: Option<String>,
    pub memo: Option<String>,
}
```

### 7.2 交易构建流程

```
┌─────────────────────────────────────────────────┐
│               交易构建流程                        │
│                                                 │
│  1. 参数校验                                     │
│     ├─ 地址格式检查                              │
│     ├─ 余额充足性检查                            │
│     └─ 参数合法性验证                            │
│                                                 │
│  2. 构建交易对象                                 │
│     ├─ 设置过期时间 (默认1小时)                  │
│     ├─ 设置引用区块                              │
│     └─ 设置带宽/能量限制                         │
│                                                 │
│  3. 资源预估                                     │
│     ├─ 带宽消耗预估                              │
│     ├─ 能量消耗预估                              │
│     └─ 手续费计算 (带宽不足时燃烧TRX)           │
│                                                 │
│  4. 用户确认                                     │
│     ├─ 显示交易详情                              │
│     ├─ 显示预估费用                              │
│     └─ 显示目标地址 (防钓鱼)                     │
│                                                 │
│  5. 签名                                         │
│     ├─ 单签: 直接用私钥签名                      │
│     └─ 多签: 创建提案，等待其他签名者            │
│                                                 │
│  6. 广播                                         │
│     ├─ 发送到TRON节点                            │
│     ├─ 等待交易确认                              │
│     └─ 记录交易历史                              │
└─────────────────────────────────────────────────┘
```

### 7.3 Gas优化策略

```rust
pub struct GasOptimizer {
    // 带宽预估
    pub bandwidth_estimate: u64,
    // 能量预估
    pub energy_estimate: u64,
    // 建议
    pub suggestions: Vec<GasSuggestion>,
}

pub enum GasSuggestion {
    // 带宽充足，免费
    FreeBandwidth,
    // 带宽不足，建议冻结
    FreezeForBandwidth { amount: u64 },
    // 能量不足，建议冻结
    FreezeForEnergy { amount: u64 },
    // 可以租赁能量
    RentEnergy { cost: u64 },
    // 使用TRX支付手续费
    BurnTRX { amount: u64 },
}
```

**优化建议**:
- 优先使用冻结获得的免费带宽/能量
- 带宽不足时建议冻结而非燃烧TRX
- 大额操作建议租赁能量
- 批量转账合并多笔交易节省资源

### 7.4 交易模拟

```
┌─────────────────────────────────────────────┐
│           交易模拟系统                        │
│                                             │
│  输入: 交易参数                              │
│    │                                        │
│    ▼                                        │
│  ┌─────────────────────┐                    │
│  │  TRON 节点模拟执行  │  ← 使用            │
│  │  (estimateEnergy)   │    triggerconstant │
│  └──────────┬──────────┘    API             │
│             │                               │
│             ▼                               │
│  ┌─────────────────────┐                    │
│  │  结果分析           │                    │
│  │  ├─ 预估能量消耗    │                    │
│  │  ├─ 预估带宽消耗    │                    │
│  │  ├─ 执行结果        │                    │
│  │  └─ 错误信息        │                    │
│  └─────────────────────┘                    │
└─────────────────────────────────────────────┘
```

### 7.5 批量转账

```rust
pub struct BatchTransfer {
    pub id: Uuid,
    pub items: Vec<BatchItem>,
    pub total_amount: u64,
    pub status: BatchStatus,
    pub results: Vec<BatchResult>,
}

pub enum BatchStatus {
    Pending,
    Executing { current: u32, total: u32 },
    Completed,
    PartialFailed { succeeded: u32, failed: u32 },
    Failed,
}

pub struct BatchResult {
    pub to: String,
    pub amount: u64,
    pub tx_hash: Option<String>,
    pub error: Option<String>,
}
```

**优化**: 批量转账不是简单循环单笔转账，而是：
1. 预估总资源消耗
2. 按顺序执行，每笔间隔适当时间（避免带宽不足）
3. 失败的交易记录原因，支持重试
4. 实时进度显示

### 7.6 定时/定投交易

```rust
pub struct ScheduledTransaction {
    pub id: Uuid,
    pub transaction_type: TransactionType,
    pub schedule: Schedule,
    pub next_execute_at: DateTime<Utc>,
    pub status: ScheduleStatus,
    pub execution_history: Vec<ExecutionRecord>,
}

pub enum Schedule {
    Once(DateTime<Utc>),                    // 一次性
    Daily { time: NaiveTime },              // 每天
    Weekly { day: Weekday, time: NaiveTime }, // 每周
    Monthly { day: u8, time: NaiveTime },   // 每月
    Custom { cron: String },                // 自定义
}
```

**注意**: 定时交易需要应用保持运行。方案：
- 应用启动时检查待执行任务
- 系统托盘后台运行
- 任务调度器集成

### 7.7 交易管理

```
交易状态机:

Created → Signing → Signed → Broadcasting → Confirmed
    │         │        │          │             │
    ▼         ▼        ▼          ▼             ▼
  Cancelled  Expired  Rejected   Failed      (终态)

管理操作:
- 加速: 重新广播或提高手续费
- 取消: 发送一笔0金额到自己，使用相同nonce
- 替换: 发送新交易替换待确认交易
```

### 7.8 地址簿

```rust
pub struct AddressBookEntry {
    pub id: Uuid,
    pub name: String,               // "张三" / "交易所热钱包"
    pub address: String,
    pub network: Network,
    pub group: Option<String>,      // "常用" / "交易所" / "同事"
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}
```

**功能**:
- 分组管理、标签筛选、搜索
- 常用地址排序（按使用频率）
- 从交易历史一键添加到地址簿
- 导入/导出CSV

---

## 8. UI/UX设计规范

### 8.1 设计语言: Apple毛玻璃风格

**核心视觉特征**:
- 毛玻璃效果 (Backdrop Blur)
- 大圆角 (12-16px)
- 微妙的阴影层次
- 流畅的过渡动画
- 克制的色彩运用
- 充足的留白

### 8.2 色彩系统

```css
/* 主题色彩变量 */
:root {
  /* 主色调 - 信任蓝 */
  --primary: #007AFF;
  --primary-hover: #0056CC;
  --primary-light: #E3F2FD;

  /* 成功/正向 - 绿 */
  --success: #34C759;
  --success-light: #E8F5E9;

  /* 警告 - 橙 */
  --warning: #FF9500;
  --warning-light: #FFF3E0;

  /* 危险/负向 - 红 */
  --danger: #FF3B30;
  --danger-light: #FFEBEE;

  /* 中性色 */
  --text-primary: #1D1D1F;
  --text-secondary: #86868B;
  --text-tertiary: #AEAEB2;

  /* 背景色 */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F2F2F7;
  --bg-tertiary: #E5E5EA;

  /* 毛玻璃 */
  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(255, 255, 255, 0.18);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* 字体 */
  --font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
}

/* 暗色主题 */
[data-theme="dark"] {
  --text-primary: #F5F5F7;
  --text-secondary: #A1A1A6;
  --bg-primary: #1C1C1E;
  --bg-secondary: #2C2C2E;
  --glass-bg: rgba(28, 28, 30, 0.72);
  --glass-border: rgba(255, 255, 255, 0.08);
}
```

### 8.3 毛玻璃效果实现

```css
/* 毛玻璃卡片 */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
}

/* 侧边栏 */
.sidebar {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px) saturate(200%);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

/* 弹窗遮罩 */
.modal-overlay {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}
```

### 8.4 主布局

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────────────────────────────────────┐  │
│  │          │  │  ┌────────────────────────────────────┐  │  │
│  │  Logo    │  │  │  Header: 页面标题 / 搜索 / 通知    │  │  │
│  │          │  │  └────────────────────────────────────┘  │  │
│  │  ──────  │  │                                          │  │
│  │          │  │  ┌────────────────────────────────────┐  │  │
│  │  📊 总览 │  │  │                                    │  │  │
│  │  💰 钱包 │  │  │                                    │  │  │
│  │  📤 发送 │  │  │         主内容区域                  │  │  │
│  │  📥 接收 │  │  │         (可自定义模块化)            │  │  │
│  │  📋 历史 │  │  │                                    │  │  │
│  │  🔐 多签 │  │  │                                    │  │  │
│  │  🖼 NFT  │  │  │                                    │  │  │
│  │  🌐 DApp │  │  └────────────────────────────────────┘  │  │
│  │  📒 地址 │  │                                          │  │
│  │  ⚙ 设置 │  │  ┌────────────────────────────────────┐  │  │
│  │          │  │  │  StatusBar: 网络状态 / 同步 / 版本  │  │  │
│  │  ──────  │  │  └────────────────────────────────────┘  │  │
│  │  🔒 锁定 │  │                                          │  │
│  └──────────┘  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
│                                                              │
│  侧边栏: 240px固定宽度, 毛玻璃背景                            │
│  内容区: 自适应宽度, 最小宽度960px                              │
│  全局最小窗口: 1200x800                                        │
└──────────────────────────────────────────────────────────────┘
```

### 8.5 组件库设计

#### 8.5.1 GlassCard 毛玻璃卡片

```tsx
// 组件接口
interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'flat';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}
```

#### 8.5.2 按钮系统

```
┌─────────────────────────────────────────────┐
│  按钮层级                                    │
│                                             │
│  Primary:   [████████████]  填充蓝色         │
│  Secondary: [░░░░░░░░░░░░]  毛玻璃边框       │
│  Ghost:     [            ]  无边框纯文字     │
│  Danger:    [████████████]  填充红色         │
│                                             │
│  尺寸:                                       │
│  sm: 32px高, 12px字号                        │
│  md: 40px高, 14px字号                        │
│  lg: 48px高, 16px字号                        │
└─────────────────────────────────────────────┘
```

#### 8.5.3 输入框

```
┌─────────────────────────────────────────────┐
│  输入框样式                                   │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  🔍 搜索地址、交易哈希...           │    │
│  └─────────────────────────────────────┘    │
│  - 毛玻璃背景                               │
│  - 聚焦时蓝色边框 + 微弱发光                │
│  - 错误时红色边框                           │
│  - 圆角 12px                                │
└─────────────────────────────────────────────┘
```

### 8.6 动画规范

```css
/* 全局过渡 */
* {
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}

/* 页面切换 */
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease-out;
}

/* 卡片悬浮 */
.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

/* 按钮点击 */
.button:active {
  transform: scale(0.97);
}

/* 模态框 */
.modal-enter {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
.modal-enter-active {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### 8.7 自定义模块化仪表盘

```
┌─────────────────────────────────────────────────────────┐
│  仪表盘 (可拖拽排列)                                     │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  💰 资产总览  │  │  📈 价格走势  │  │  🔔 最新通知 │  │
│  │              │  │              │  │              │  │
│  │  $123,456    │  │  📊 [图表]   │  │  • 转入 100  │  │
│  │  +2.34%      │  │              │  │  • 多签待签  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │  📋 最近交易          │  │  🖼 NFT 收藏          │    │
│  │                      │  │                      │    │
│  │  → 张三  100 TRX     │  │  [img] [img] [img]   │    │
│  │  ← 李四  500 USDT    │  │  [img] [img]         │    │
│  └──────────────────────┘  └──────────────────────┘    │
│                                                         │
│  [+ 添加模块]  [重置布局]  [保存布局]                    │
└─────────────────────────────────────────────────────────┘
```

**实现**: 使用 `react-grid-layout` 库实现拖拽排列。

### 8.8 全局命令面板 (Ctrl+K)

```
┌─────────────────────────────────────────────┐
│  🔍 输入命令或搜索...                       │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │  快捷操作                            │    │
│  │  ├─ 发送 TRX                        │    │
│  │  ├─ 发送 USDT                       │    │
│  │  ├─ 创建多签提案                     │    │
│  │  └─ 打开 DApp 浏览器                │    │
│  │                                     │    │
│  │  最近使用                            │    │
│  │  ├─ 张三的地址                       │    │
│  │  └─ SunSwap                         │    │
│  │                                     │    │
│  │  设置                               │    │
│  │  ├─ 切换网络                         │    │
│  │  └─ 主题设置                         │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**实现**: 类似 VS Code 的 Command Palette，支持模糊搜索。

### 8.9 新手引导系统

```
首次启动流程:

1. 欢迎页面 → 介绍钱包功能
2. 创建/导入钱包 → 引导安全设置
3. 设置密码 → 强度指示器
4. 备份助记词 → 确认验证
5. 开启生物识别 → 可选
6. 引导完成 → 进入仪表盘

功能提示 (Tooltips):
- 首次使用某功能时显示引导提示
- 可手动关闭或"不再显示"
- 使用 Framer Motion 动画
```

### 8.10 窗口行为

```rust
// Tauri 窗口配置
{
  "windows": [{
    "title": "TRON Wallet",
    "width": 1280,
    "height": 800,
    "minWidth": 1024,
    "minHeight": 700,
    "decorations": false,        // 自定义标题栏
    "transparent": true,         // 支持毛玻璃
    "center": true,
    "resizable": true,
    "fullscreen": false
  }]
}
```

**自定义标题栏**:
- 无边框窗口，自绘标题栏
- 支持拖拽移动
- 最小化/最大化/关闭按钮
- 窗口状态记忆（位置、大小）

---

## 9. DApp交互系统

### 9.1 内置DApp浏览器

```
┌─────────────────────────────────────────────────────────┐
│  DApp浏览器                                              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  🔒 https://sunswap.com    ←→ ⟳  ⭐  🔖         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │              DApp 内容区域                         │  │
│  │              (WebView 加载)                        │  │
│  │                                                   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  连接状态: ● 已连接 (TXYZ...123)                        │
└─────────────────────────────────────────────────────────┘
```

**实现方式**:
- Tauri WebView2 加载DApp页面
- 注入 `tronWeb` 对象到页面上下文
- 拦截DApp的签名请求，弹出钱包确认

### 9.2 DApp连接协议

```
DApp ←→ 钱包 通信流程:

DApp                              Wallet
  │                                  │
  │  1. tronWeb.request(...)         │
  │  ─────────────────────────────▶ │
  │                                  │
  │                    2. 弹出确认窗口
  │                    3. 用户审查请求
  │                    4. 用户确认/拒绝
  │                                  │
  │  5. 返回结果                     │
  │  ◀───────────────────────────── │
  │                                  │
```

### 9.3 WalletConnect v2集成

```rust
pub struct WalletConnectSession {
    pub topic: String,
    pub peer: PeerMetadata,
    pub chains: Vec<String>,        // tron:mainnet, tron:shasta
    pub methods: Vec<String>,       // supported methods
    pub expiry: DateTime<Utc>,
}

// 支持的方法
const SUPPORTED_METHODS: &[&str] = &[
    "tron_signTransaction",
    "tron_signMessage",
    "tron_multiSign",
];
```

**流程**:
1. 扫描WalletConnect二维码或点击链接
2. 建立加密会话
3. DApp发送请求 → 钱包弹出确认
4. 用户确认 → 签名 → 返回结果

### 9.4 合约调用预览

```
┌─────────────────────────────────────────────┐
│  合约调用预览                                │
│                                             │
│  合约: SunSwap V2 Router                    │
│  地址: TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  方法: swapExactTokensForTokens     │    │
│  │                                     │    │
│  │  参数:                              │    │
│  │  ├─ amountIn: 1000 USDT            │    │
│  │  ├─ amountOutMin: 998 USDT         │    │
│  │  ├─ path: [USDT → TRX]            │    │
│  │  ├─ to: TXYZ...123                │    │
│  │  └─ deadline: 1714567890           │    │
│  │                                     │    │
│  │  预估结果:                          │    │
│  │  ├─ 输入: 1000 USDT               │    │
│  │  ├─ 输出: ~6500 TRX               │    │
│  │  └─ 滑点: 0.2%                    │    │
│  │                                     │    │
│  │  资源消耗:                          │    │
│  │  ├─ 能量: 145,000                 │    │
│  │  └─ 带宽: 345                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ⚠️ 安全提示:                               │
│  • 此合约未经验证                            │
│  • 建议先小额测试                            │
│                                             │
│  [ 确认 ]  [ 拒绝 ]  [ 查看原始数据 ]       │
└─────────────────────────────────────────────┘
```

### 9.5 合约风险评估

```rust
pub struct ContractRiskAssessment {
    pub address: String,
    pub risk_level: RiskLevel,          // Low / Medium / High / Critical
    pub factors: Vec<RiskFactor>,
    pub is_verified: bool,              // 是否在TRONSCAN验证
    pub audit_report: Option<String>,   // 审计报告链接
}

pub enum RiskFactor {
    UnverifiedContract,         // 未验证合约
    HighPermissionRequest,      // 高权限请求
    UnusualTransferPattern,     // 异常转账模式
    KnownPhishingAddress,       // 已知钓鱼地址
    NewContract,                // 新部署合约
    LargeApprovalRequest,       // 大额授权请求
}
```

**风险评分逻辑**:
- 已验证合约: 基础分降低
- 有审计报告: 进一步降低
- 新合约 (<7天): 风险升高
- 大额授权: 风险升高
- 已知钓鱼库匹配: 直接标记危险

### 9.6 DApp书签管理

```rust
pub struct DAppBookmark {
    pub id: Uuid,
    pub name: String,
    pub url: String,
    pub icon: Option<String>,
    pub category: String,           // "DeFi", "NFT", "GameFi", "工具"
    pub is_favorite: bool,
    pub visit_count: u32,
    pub last_visited: DateTime<Utc>,
}
```

**预置书签**:
- SunSwap (DEX)
- JustLend (借贷)
- TRONSCAN (区块浏览器)
- APENFT (NFT市场)

### 9.7 DApp连接管理

```
┌─────────────────────────────────────────────┐
│  DApp连接管理                                │
│                                             │
│  当前连接:                                   │
│  ┌─────────────────────────────────────┐    │
│  │  🌐 SunSwap                         │    │
│  │  权限: 读取地址, 签名交易            │    │
│  │  连接时间: 2026-05-01 14:30         │    │
│  │  [断开连接]  [管理权限]              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  🌐 JustLend                        │    │
│  │  权限: 读取地址                      │    │
│  │  连接时间: 2026-05-01 10:15         │    │
│  │  [断开连接]  [管理权限]              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  WalletConnect会话:                         │
│  ┌─────────────────────────────────────┐    │
│  │  📱 某DApp (手机端)                  │    │
│  │  链: TRON Mainnet                   │    │
│  │  过期: 2026-05-02 14:30             │    │
│  │  [断开]                              │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 10. 数据存储设计

### 10.1 存储架构

```
┌─────────────────────────────────────────────┐
│            数据存储分层                        │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Level 1: 内存缓存 (Rust)           │    │
│  │  ├─ 当前钱包状态                     │    │
│  │  ├─ 解密后的密钥 (临时)              │    │
│  │  └─ 最近交易缓存                     │    │
│  └─────────────────────────────────────┘    │
│                  │                           │
│  ┌─────────────────────────────────────┐    │
│  │  Level 2: SQLite 数据库              │    │
│  │  ├─ 钱包信息 (加密)                  │    │
│  │  ├─ 交易历史                         │    │
│  │  ├─ 地址簿                           │    │
│  │  ├─ 多签提案                         │    │
│  │  ├─ DApp书签                         │    │
│  │  ├─ 设置                             │    │
│  │  └─ 审计日志                         │    │
│  └─────────────────────────────────────┘    │
│                  │                           │
│  ┌─────────────────────────────────────┐    │
│  │  Level 3: 文件系统                   │    │
│  │  ├─ Keystore文件 (导入/导出)         │    │
│  │  ├─ 日志文件                         │    │
│  │  └─ 缓存文件                         │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 10.2 数据库表结构

```sql
-- 钱包表
CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL UNIQUE,
    wallet_type TEXT NOT NULL,           -- 'single' | 'multisig' | 'watch'
    encrypted_seed BLOB,                 -- 加密种子 (观察钱包为NULL)
    salt BLOB NOT NULL,
    nonce BLOB NOT NULL,
    tag BLOB NOT NULL,
    derivation_path TEXT,
    network TEXT NOT NULL DEFAULT 'mainnet',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 交易历史表
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    block_number INTEGER,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount TEXT NOT NULL,                -- 使用字符串避免精度问题
    token_address TEXT,                  -- NULL表示TRX
    token_symbol TEXT,
    fee TEXT,
    energy_used INTEGER,
    bandwidth_used INTEGER,
    memo TEXT,
    status TEXT NOT NULL,                -- 'pending' | 'confirmed' | 'failed'
    direction TEXT NOT NULL,             -- 'in' | 'out' | 'self'
    timestamp TEXT NOT NULL,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

-- 地址簿表
CREATE TABLE address_book (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    network TEXT NOT NULL,
    "group" TEXT,
    tags TEXT,                           -- JSON数组
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_used_at TEXT
);

-- 多签钱包表
CREATE TABLE multisig_wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL UNIQUE,
    threshold INTEGER NOT NULL,
    network TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 多签签名者表
CREATE TABLE multisig_signers (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    address TEXT NOT NULL,
    name TEXT,
    "group" TEXT,
    role TEXT NOT NULL,
    FOREIGN KEY (wallet_id) REFERENCES multisig_wallets(id)
);

-- 多签提案表
CREATE TABLE multisig_proposals (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    proposal_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    data TEXT NOT NULL,                  -- JSON格式的提案数据
    status TEXT NOT NULL,                -- 'draft' | 'pending' | 'approved' | 'executed' | 'rejected' | 'expired'
    creator TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    executed_at TEXT,
    tx_hash TEXT,
    FOREIGN KEY (wallet_id) REFERENCES multisig_wallets(id)
);

-- 多签签名记录表
CREATE TABLE multisig_signatures (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL,
    signer TEXT NOT NULL,
    action TEXT NOT NULL,                -- 'sign' | 'reject'
    signed_at TEXT NOT NULL,
    FOREIGN KEY (proposal_id) REFERENCES multisig_proposals(id)
);

-- 审计日志表
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    proposal_id TEXT,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT,                        -- JSON
    timestamp TEXT NOT NULL
);

-- DApp书签表
CREATE TABLE dapp_bookmarks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    category TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    visit_count INTEGER NOT NULL DEFAULT 0,
    last_visited TEXT
);

-- 定时交易表
CREATE TABLE scheduled_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,      -- JSON
    schedule TEXT NOT NULL,              -- JSON
    next_execute_at TEXT NOT NULL,
    status TEXT NOT NULL,                -- 'pending' | 'executing' | 'completed' | 'failed'
    execution_history TEXT,              -- JSON数组
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

-- 设置表
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 索引
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_multisig_proposals_wallet ON multisig_proposals(wallet_id);
CREATE INDEX idx_multisig_proposals_status ON multisig_proposals(status);
CREATE INDEX idx_address_book_group ON address_book("group");
```

### 10.3 数据库加密

```rust
// 使用 rusqlite + SQLCipher 实现数据库加密
use rusqlite::Connection;

fn open_encrypted_db(path: &str, key: &[u8]) -> Result<Connection> {
    let conn = Connection::open(path)?;

    // 设置加密密钥
    conn.execute_batch(&format!(
        "PRAGMA key = \"x'{}'\";",
        hex::encode(key)
    ))?;

    // 启用加密
    conn.execute_batch("PRAGMA cipher_compatibility = 4;")?;

    // 验证密钥正确
    conn.execute_batch("SELECT count(*) FROM sqlite_master;")?;

    Ok(conn)
}
```

**加密方案**:
- SQLCipher 4.0
- AES-256-CBC 加密
- PBKDF2 密钥派生 (256000轮)
- 数据库文件整体加密，防直接读取

### 10.4 数据备份与恢复

```
备份格式:

┌─────────────────────────────────────┐
│  backup.json                        │
│  {                                  │
│    "version": "1.0",                │
│    "created_at": "2026-05-01",      │
│    "wallets": [                     │
│      {                              │
│        "name": "主钱包",            │
│        "address": "TXYZ...",        │
│        "encrypted_seed": "...",     │
│        "settings": { ... }          │
│      }                              │
│    ],                               │
│    "address_book": [ ... ],         │
│    "dapp_bookmarks": [ ... ],       │
│    "settings": { ... }              │
│  }                                  │
└─────────────────────────────────────┘

恢复流程:
1. 选择备份文件
2. 验证文件完整性
3. 输入密码解密
4. 预览将恢复的内容
5. 确认恢复
```

---

## 11. 通知系统

### 11.1 通知架构

```
┌─────────────────────────────────────────────┐
│              通知系统架构                      │
│                                             │
│  事件源                                      │
│  ├─ 链上交易监听 (轮询/WebSocket)           │
│  ├─ 多签提案状态变化                         │
│  ├─ 定时任务触发                             │
│  └─ 价格预警触发                             │
│       │                                      │
│       ▼                                      │
│  ┌─────────────────────┐                    │
│  │    通知引擎          │                    │
│  │  ├─ 事件过滤         │                    │
│  │  ├─ 规则匹配         │                    │
│  │  └─ 通知分发         │                    │
│  └──────────┬──────────┘                    │
│             │                                │
│  ┌──────────┴──────────┐                    │
│  │                     │                    │
│  ▼                     ▼                    │
│  应用内通知           Windows通知            │
│  (消息中心)           (系统托盘)             │
└─────────────────────────────────────────────┘
```

### 11.2 通知类型

```rust
pub enum NotificationType {
    // 交易相关
    TransactionReceived {
        from: String,
        amount: String,
        token: String,
    },
    TransactionConfirmed {
        tx_hash: String,
    },
    TransactionFailed {
        tx_hash: String,
        reason: String,
    },

    // 多签相关
    MultiSigProposalCreated {
        proposal_id: String,
        title: String,
    },
    MultiSigSignatureRequired {
        proposal_id: String,
        title: String,
    },
    MultiSigProposalExecuted {
        proposal_id: String,
    },

    // 预警相关
    LargeTransactionDetected {
        address: String,
        amount: String,
        threshold: String,
    },
    AddressActivity {
        address: String,
        activity_type: String,
    },

    // 系统相关
    PriceAlert {
        token: String,
        price: String,
        direction: String, // "above" | "below"
    },
}
```

### 11.3 通知规则引擎

```rust
pub struct NotificationRule {
    pub id: Uuid,
    pub name: String,
    pub enabled: bool,
    pub conditions: Vec<Condition>,
    pub actions: Vec<NotificationAction>,
}

pub enum Condition {
    // 金额条件
    AmountAbove { threshold: u64, token: String },
    AmountBelow { threshold: u64, token: String },

    // 地址条件
    FromAddress { address: String },
    ToAddress { address: String },

    // 多签条件
    MultiSigStatus { status: String },

    // 价格条件
    PriceAbove { token: String, price: f64 },
    PriceBelow { token: String, price: f64 },
}

pub enum NotificationAction {
    InAppNotification,
    WindowsNotification,
    Sound,
    Webhook { url: String },
}
```

### 11.4 Windows桌面通知

```rust
use winrt_notification::{Duration, Sound, Toast};

fn send_windows_notification(title: &str, body: &str) {
    Toast::new(Toast::POWERSHELL_APP_ID)
        .title(title)
        .text1(body)
        .sound(Some(Sound::Default))
        .duration(Duration::Short)
        .show()
        .ok();
}
```

### 11.5 消息中心UI

```
┌─────────────────────────────────────────────┐
│  通知中心                            [清除]  │
│                                             │
│  今天                                       │
│  ┌─────────────────────────────────────┐    │
│  │  💰 收到 100 USDT                   │    │
│  │  来自: TXYZ...123                   │    │
│  │  时间: 14:30                         │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  🔐 多签提案需要您的签名            │    │
│  │  提案: 月度工资发放                  │    │
│  │  时间: 13:15                         │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  昨天                                       │
│  ┌─────────────────────────────────────┐    │
│  │  ⚠️ 大额交易预警                     │    │
│  │  地址: TXYZ...456 转出 50,000 TRX   │    │
│  │  时间: 18:45                         │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [全部已读]  [通知设置]                      │
└─────────────────────────────────────────────┘
```

---

## 12. NFT模块

### 12.1 NFT数据模型

```rust
pub struct NFT {
    pub contract_address: String,
    pub token_id: String,
    pub name: String,
    pub description: Option<String>,
    pub image_url: String,
    pub thumbnail_url: Option<String>,
    pub attributes: Vec<NFTAttribute>,
    pub owner: String,
    pub collection: Option<NFTCollection>,
    pub floor_price: Option<u64>,
}

pub struct NFTAttribute {
    pub trait_type: String,
    pub value: String,
}

pub struct NFTCollection {
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub contract_address: String,
    pub total_supply: u32,
    pub floor_price: Option<u64>,
}
```

### 12.2 NFT画廊UI

```
┌─────────────────────────────────────────────────────────┐
│  NFT收藏                                      [筛选] [排序]
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  [图片]    │  │  [图片]    │  │  [图片]    │        │
│  │            │  │            │  │            │        │
│  │  #1234    │  │  #5678    │  │  #9012    │        │
│  │  CryptoK...│  │  CryptoK...│  │  Bored A...│        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  [图片]    │  │  [图片]    │  │  [图片]    │        │
│  │            │  │            │  │            │        │
│  │  #3456    │  │  #7890    │  │  #2345    │        │
│  │  Bored A...│  │  Azuki     │  │  Doodles   │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                         │
│  显示: 6 / 42 个NFT                                     │
└─────────────────────────────────────────────────────────┘
```

### 12.3 NFT详情页

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回                                                │
│                                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │                  │  │  CryptoKitties              │  │
│  │                  │  │  #1234                      │  │
│  │    [大图]        │  │                            │  │
│  │                  │  │  属性:                      │  │
│  │                  │  │  ├─ 背景: 紫色              │  │
│  │                  │  │  ├─ 眼睛: 激光              │  │
│  │                  │  │  ├─ 嘴巴: 微笑              │  │
│  │                  │  │  └─ 稀有度: 传奇            │  │
│  │                  │  │                            │  │
│  │                  │  │  底价: 1,200 TRX           │  │
│  │                  │  │  最后交易: 1,500 TRX       │  │
│  │                  │  │                            │  │
│  │                  │  │  [转移]  [在市场查看]       │  │
│  └──────────────────┘  └────────────────────────────┘  │
│                                                         │
│  交易历史:                                              │
│  ├─ 2026-04-15 从 TXYZ...123 转入                      │
│  ├─ 2026-03-01 购买 1,500 TRX                          │
│  └─ 2026-01-15 铸造                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 13. 权限与资源管理

### 13.1 TRON账户权限模型

```
TRON账户权限结构:

Account
├─ Owner Permission (最高权限)
│   ├─ keys: [key1, key2, ...]
│   └─ threshold: M
│
└─ Active Permissions (可自定义)
    ├─ Permission 1 (如: 转账权限)
    │   ├─ keys: [key1, key3]
    │   ├─ threshold: 1
    │   └─ operations: [TransferContract, TransferAssetContract]
    │
    └─ Permission 2 (如: 合约调用权限)
        ├─ keys: [key2, key3]
        ├─ threshold: 2
        └─ operations: [TriggerSmartContract]
```

### 13.2 权限修改UI

```
┌─────────────────────────────────────────────────────────┐
│  账户权限管理                                            │
│                                                         │
│  Owner权限                                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │  签名者:                                         │    │
│  │  ├─ TXYZ...123 (权重: 1)                        │    │
│  │  └─ TABC...456 (权重: 1)                        │    │
│  │  阈值: 2                                         │    │
│  │  [修改]                                          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Active权限                                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │  名称: 转账权限                                   │    │
│  │  签名者:                                         │    │
│  │  └─ TXYZ...123 (权重: 1)                        │    │
│  │  阈值: 1                                         │    │
│  │  操作: TransferContract, TransferAssetContract   │    │
│  │  [修改]  [删除]                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [+ 添加Active权限]                                     │
│                                                         │
│  ⚠️ 修改Owner权限需要当前Owner签名                      │
│  ⚠️ 修改后可能影响多签钱包的控制权                       │
│                                                         │
│  [提交修改]  [查看原始数据]                              │
└─────────────────────────────────────────────────────────┘
```

### 13.3 资源管理

```
┌─────────────────────────────────────────────────────────┐
│  资源管理                                                │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  带宽             │  │  能量             │            │
│  │  ████████░░ 80%  │  │  █████░░░░░ 50%  │            │
│  │  已用: 1,200     │  │  已用: 50,000    │            │
│  │  总量: 1,500     │  │  总量: 100,000   │            │
│  │  冻结: 5,000 TRX │  │  冻结: 20,000 TRX│            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  代理给他人:                                            │
│  ├─ TABC...456 带宽: 500                               │
│  └─ TDEF...789 能量: 30,000                            │
│                                                         │
│  [冻结TRX]  [解冻TRX]  [代理资源]  [回收资源]           │
└─────────────────────────────────────────────────────────┘
```

### 13.4 冻结/投票管理

```rust
pub struct FreezeRequest {
    pub amount: u64,
    pub resource: ResourceType,     // Energy | Bandwidth
    pub receiver: Option<String>,   // 代理给他人
}

pub struct Vote {
    pub witness_address: String,    // 超级代表地址
    pub vote_count: u64,            // 投票数
}

pub struct UnfreezeRequest {
    pub resource: ResourceType,
    pub receiver: Option<String>,
}
```

**流程**:
1. 冻结TRX → 获得带宽/能量
2. 使用带宽/能量进行投票
3. 投票给超级代表 → 获得投票奖励
4. 解冻TRX → 14天后到账

---

## 14. 国际化方案

### 14.1 语言支持

| 语言 | 代码 | 优先级 |
|------|------|--------|
| 简体中文 | zh-CN | P0 |
| English | en | P0 |
| 繁體中文 | zh-TW | P1 |

### 14.2 实现方案

```tsx
// 使用 react-i18next
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en': { translation: en },
    'zh-TW': { translation: zhTW },
  },
  lng: 'zh-CN', // 默认语言
  fallbackLng: 'en',
});
```

### 14.3 翻译文件结构

```json
{
  "common": {
    "confirm": "确认",
    "cancel": "取消",
    "send": "发送",
    "receive": "接收",
    "copy": "复制",
    "success": "成功",
    "failed": "失败"
  },
  "wallet": {
    "create": "创建钱包",
    "import": "导入钱包",
    "backup": "备份钱包",
    "mnemonic": "助记词",
    "privateKey": "私钥",
    "keystore": "Keystore"
  },
  "transaction": {
    "send": "发送交易",
    "history": "交易历史",
    "pending": "待确认",
    "confirmed": "已确认",
    "failed": "失败"
  }
}
```

---

## 15. 工程化与CI/CD

### 15.1 测试策略

```
测试金字塔:

        ┌───────────┐
        │   E2E测试  │  ← 关键流程 (Playwright)
        ├───────────┤
        │  集成测试  │  ← IPC通信、数据库
        ├───────────┤
        │  单元测试  │  ← 核心逻辑、加密
        └───────────┘

覆盖目标:
- 单元测试: 80%+ 覆盖率
- 集成测试: 核心模块100%
- E2E测试: 关键用户流程
```

#### 单元测试 (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mnemonic_generation() {
        let mnemonic = generate_mnemonic(12);
        assert_eq!(mnemonic.split_whitespace().count(), 12);
    }

    #[test]
    fn test_address_derivation() {
        let mnemonic = "abandon abandon abandon ...";
        let address = derive_address(mnemonic, "m/44'/195'/0'/0/0");
        assert!(address.starts_with('T'));
    }

    #[test]
    fn test_encryption_roundtrip() {
        let key = generate_key();
        let data = b"secret data";
        let encrypted = encrypt(data, &key);
        let decrypted = decrypt(&encrypted, &key);
        assert_eq!(data, decrypted.as_slice());
    }
}
```

#### E2E测试 (Playwright)

```typescript
// tests/e2e/wallet.spec.ts
import { test, expect } from '@playwright/test';

test('创建新钱包流程', async ({ page }) => {
  await page.goto('/');
  await page.click('text=创建钱包');
  await page.fill('input[name="name"]', '测试钱包');
  await page.fill('input[name="password"]', 'Test123!@#');
  await page.click('text=下一步');

  // 显示助记词
  const mnemonic = await page.textContent('.mnemonic-words');
  expect(mnemonic?.split(' ').length).toBe(12);

  // 确认助记词
  await page.click('text=已备份');
  await page.click('text=完成');

  // 验证进入仪表盘
  await expect(page.locator('text=仪表盘')).toBeVisible();
});
```

### 15.2 CI/CD流水线

```yaml
# .github/workflows/build.yml
name: Build & Release

on:
  push:
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: pnpm install

      - name: Run Rust tests
        run: cargo test --manifest-path src-tauri/Cargo.toml

      - name: Run frontend tests
        run: pnpm test

      - name: Run E2E tests
        run: pnpm test:e2e

  build:
    needs: test
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: pnpm install

      - name: Build Tauri app
        run: pnpm tauri build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: tron-wallet-setup
          path: src-tauri/target/release/bundle/

  release:
    needs: build
    if: startsWith(github.ref, 'refs/tags/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            *.msi
            *.exe
```

### 15.3 自动更新

```rust
// Tauri 自动更新配置
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://api.tron-wallet.app/update/{{target}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "..."
  }
}
```

**更新流程**:
1. 应用启动时检查更新
2. 发现新版本 → 弹出更新提示
3. 用户确认 → 下载更新包
4. 验证签名 → 安装更新
5. 重启应用

### 15.4 错误日志收集

```rust
use tracing::{info, warn, error};
use tracing_subscriber::EnvFilter;

// 日志配置
fn setup_logging() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_file(true)
        .with_line_number(true)
        .init();
}

// 错误上报 (可选)
fn report_error(error: &AppError) {
    // 本地日志
    error!("{:?}", error);

    // 可选: 上报到错误收集服务
    if config.error_reporting_enabled {
        send_error_report(error);
    }
}
```

---

## 16. 开发路线图

### Phase 1: 基础框架 (第1-2周)

- [ ] Tauri + React 项目初始化
- [ ] 基础UI框架 (侧边栏、布局、主题)
- [ ] 毛玻璃组件库
- [ ] Rust后端基础架构
- [ ] SQLite数据库初始化
- [ ] 基础IPC通信

### Phase 2: 钱包核心 (第3-4周)

- [ ] 助记词生成/导入
- [ ] 私钥管理 (加密存储)
- [ ] 地址生成
- [ ] Windows Hello集成
- [ ] 自动锁屏
- [ ] 钱包创建/导入流程

### Phase 3: 交易系统 (第5-6周)

- [ ] TRX转账
- [ ] TRC-20代币转账
- [ ] 交易历史
- [ ] 地址簿
- [ ] Gas预估
- [ ] 交易模拟

### Phase 4: 多签系统 (第7-8周)

- [ ] 多签钱包创建
- [ ] 提案创建/审批流程
- [ ] 签名状态追踪
- [ ] 提案模板
- [ ] 审计日志

### Phase 5: 高级功能 (第9-10周)

- [ ] DApp浏览器
- [ ] WalletConnect集成
- [ ] NFT画廊
- [ ] 权限管理
- [ ] 资源管理

### Phase 6: 完善与优化 (第11-12周)

- [ ] 通知系统
- [ ] 国际化
- [ ] 自动更新
- [ ] E2E测试
- [ ] 性能优化
- [ ] 文档编写

---

## 附录

### A. 依赖清单

#### Rust (Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = ["system-tray"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
ring = "0.17"                    # 加密
aes-gcm = "0.10"                 # AES-256-GCM
argon2 = "0.5"                   # 密钥派生
bip39 = "2"                      # 助记词
ed25519-dalek = "2"              # Ed25519签名
reqwest = { version = "0.11", features = ["json"] }  # HTTP客户端
tokio = { version = "1", features = ["full"] }        # 异步运行时
tracing = "0.1"                  # 日志
tracing-subscriber = "0.3"
zeroize = "1"                    # 内存清零
chrono = "0.4"                   # 时间处理
uuid = { version = "1", features = ["v4"] }
thiserror = "1"                  # 错误处理
```

#### Frontend (package.json)

```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^6",
    "@tauri-apps/api": "^2",
    "zustand": "^4",
    "i18next": "^23",
    "react-i18next": "^14",
    "framer-motion": "^11",
    "recharts": "^2",
    "react-grid-layout": "^1",
    "lucide-react": "^0.400"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3.4",
    "@playwright/test": "^1.44",
    "vitest": "^1"
  }
}
```

### B. 环境变量

```env
# .env
TRON_NETWORK=mainnet
TRON_API_KEY=your_api_key_here
TRON_RPC_URL=https://api.trongrid.io
PRICE_API_URL=https://api.coingecko.com/api/v3
```

### C. 参考资料

- [Tauri 2.0 文档](https://v2.tauri.app/)
- [TRON 开发文档](https://developers.tron.network/)
- [BIP39 规范](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP44 规范](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [WalletConnect v2](https://docs.walletconnect.com/)
