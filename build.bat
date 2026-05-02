@echo off
echo ========================================
echo   TRON Wallet - Build Installer
echo ========================================
echo.

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust not found. Install from: https://rustup.rs/
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from: https://nodejs.org/
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing pnpm...
    npm install -g pnpm
)

echo [1/4] Cleaning old node_modules...
if exist "node_modules" (
    rmdir /s /q "node_modules" 2>nul
    if exist "node_modules" (
        echo [WARN] Could not delete node_modules, trying with rd...
        rd /s /q "node_modules" 2>nul
    )
    if exist "node_modules" (
        echo [ERROR] Cannot delete node_modules. Please delete it manually and run again.
        echo         Right-click node_modules folder -^> Delete
        pause
        exit /b 1
    )
)

echo [2/4] Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Building installer (first time takes a few minutes)...
call pnpm tauri build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo [4/4] Build complete!
echo.
echo Installer location:
echo   EXE: src-tauri\target\release\bundle\nsis\tron-wallet_0.1.0_x64-setup.exe
echo   MSI: src-tauri\target\release\bundle\msi\tron-wallet_0.1.0_x64_en-US.msi
echo.
echo ========================================
pause
