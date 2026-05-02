@echo off
echo ========================================
echo   TRON Wallet - Dev Server
echo ========================================
echo.

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust not found. Install from: https://rustup.rs/
    pause
    exit /b 1
)

call pnpm tauri dev
pause
