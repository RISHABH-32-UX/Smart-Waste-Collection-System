@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Project-local Maven bootstrapper for Windows. Maven is downloaded once and SHA-512 verified.
set "MAVEN_VERSION=3.9.16"
set "WRAPPER_DIR=%~dp0.mvn\wrapper"
set "MAVEN_HOME=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%"
set "ZIP_FILE=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%-bin.zip"
set "ZIP_URL=https://dlcdn.apache.org/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip"
set "SHA_URL=%ZIP_URL%.sha512"

if exist "%MAVEN_HOME%\bin\mvn.cmd" goto run
if not exist "%WRAPPER_DIR%" mkdir "%WRAPPER_DIR%"

echo Downloading Apache Maven %MAVEN_VERSION% for this project...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing -Uri '%ZIP_URL%' -OutFile '%ZIP_FILE%'; $expected=((Invoke-WebRequest -UseBasicParsing -Uri '%SHA_URL%').Content.Trim() -split '\s+')[0].ToLower(); $actual=(Get-FileHash -Algorithm SHA512 '%ZIP_FILE%').Hash.ToLower(); if ($actual -ne $expected) { Remove-Item -LiteralPath '%ZIP_FILE%' -Force; throw 'Maven download checksum verification failed.' }; Expand-Archive -LiteralPath '%ZIP_FILE%' -DestinationPath '%WRAPPER_DIR%' -Force; Remove-Item -LiteralPath '%ZIP_FILE%' -Force"
if errorlevel 1 exit /b %errorlevel%

:run
call "%MAVEN_HOME%\bin\mvn.cmd" %*
exit /b %errorlevel%

