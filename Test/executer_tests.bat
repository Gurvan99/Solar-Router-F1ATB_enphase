@echo off
setlocal
cd /d "%~dp0"

where g++ >nul 2>&1
if %ERRORLEVEL% equ 0 goto compiler_gcc

where clang++ >nul 2>&1
if %ERRORLEVEL% equ 0 goto compiler_clang

where cl >nul 2>&1
if %ERRORLEVEL% equ 0 goto compiler_msvc

echo Aucun compilateur C++ trouve. Installez MinGW-w64, LLVM ou Visual Studio C++.
exit /b 1

:compiler_gcc
echo Compilation des tests avec g++...
g++ -std=c++11 -Wall -Wextra -pedantic -o test_reserve_batterie.exe test_reserve_batterie.cpp
if errorlevel 1 exit /b 1
goto run_tests

:compiler_clang
echo Compilation des tests avec clang++...
clang++ -std=c++11 -Wall -Wextra -pedantic -o test_reserve_batterie.exe test_reserve_batterie.cpp
if errorlevel 1 exit /b 1
goto run_tests

:compiler_msvc
echo Compilation des tests avec Visual C++...
cl /nologo /std:c++14 /EHsc /W4 /utf-8 /Fe:test_reserve_batterie.exe test_reserve_batterie.cpp
if errorlevel 1 exit /b 1
goto run_tests

:run_tests
echo.
test_reserve_batterie.exe
exit /b %ERRORLEVEL%
