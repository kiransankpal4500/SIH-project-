@echo off
setlocal enabledelayedexpansion
title OceanScope Universal Deployment Tool
cls

echo ========================================================
echo        OCEANSCOPE - UNIVERSAL DEPLOYMENT TOOL
echo ========================================================
echo.
echo Choose a deployment action:
echo.
echo  [1] Deploy Frontend to Firebase Hosting (oceanscope-d6305)
echo  [2] Deploy Firestore Security Rules & Indexes
echo  [3] Deploy Frontend + Firestore to Firebase (Full)
echo  [4] Deploy Backend to Vercel (Production)
echo  [5] Build & Run with Docker Compose (Local or VPS)
echo  [6] Test Backend Health Status
echo  [7] Exit
echo.
set /p opt="Enter your choice (1-7): "

if "%opt%"=="1" goto deploy_firebase
if "%opt%"=="2" goto deploy_firestore
if "%opt%"=="3" goto deploy_firebase_all
if "%opt%"=="4" goto deploy_vercel
if "%opt%"=="5" goto deploy_docker
if "%opt%"=="6" goto test_health
if "%opt%"=="7" goto end

echo Invalid option selected.
pause
goto end

:deploy_firebase
echo.
echo [1/2] Building frontend for production...
cd OceanScope\frontend
call npm run build
if %errorlevel% neq 0 (
    echo Build failed! Aborting deployment.
    cd ..\..
    pause
    goto end
)
cd ..\..
echo.
echo [2/2] Deploying to Firebase Hosting...
call firebase deploy --only hosting
echo.
echo Done! View your app at: https://oceanscope-d6305.web.app
pause
goto end

:deploy_firestore
echo.
echo Deploying Firestore Rules & Indexes to Firebase...
call firebase deploy --only firestore:rules,firestore:indexes
echo.
echo Firestore rules and indexes deployed successfully.
pause
goto end

:deploy_firebase_all
echo.
echo [1/2] Building frontend...
cd OceanScope\frontend
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    cd ..\..
    pause
    goto end
)
cd ..\..
echo.
echo [2/2] Deploying Hosting + Firestore to Firebase...
call firebase deploy --only hosting,firestore:rules,firestore:indexes
echo.
echo Deployment complete!
pause
goto end

:deploy_vercel
echo.
echo Deploying OceanScope to Vercel...
call vercel --prod
pause
goto end

:deploy_docker
echo.
echo Building and starting containers via Docker Compose...
docker compose up -d --build
echo.
echo Containers started!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000/docs
pause
goto end

:test_health
echo.
echo Testing Backend health...
curl -s http://localhost:8000/health
echo.
pause
goto end

:end
