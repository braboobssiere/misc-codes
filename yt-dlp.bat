@echo off
setlocal enabledelayedexpansion

:loop
:: Prompt the user for a YouTube URL
set /p "url=Enter a YouTube URL: "

:: Initialize video_id variable
set "video_id="

:: Check for /watch?v=<id> or /embed/<id> format
if not "!url!"=="" (
    echo !url! | findstr /c:"/watch?v=" >nul
    if !errorlevel! == 0 (
        for /f "tokens=2 delims==&" %%a in ("!url!") do (
            set "video_id=%%a"
        )
    ) else (
        echo !url! | findstr /c:"/embed/" >nul
        if !errorlevel! == 0 (
            set "video_id=!url:*embed/=!"
		)
        )
    )
)

:: Check if video_id is empty
if "!video_id!"=="" (
    echo Unable to extract video ID. Please check the URL format.
    goto loop
)

:: Construct the new URL
set "new_url=https://inv.nadeko.net/api/manifest/dash/id/!video_id!?local=true&unique_res=1"

:: Run yt-dlp with the constructed URL, setting max resolution to 1080p and concurrent downloads to 5
echo Running yt-dlp with the following URL:
echo !new_url!
yt-dlp --restrict-filenames -N 5 -f "bv*[height<=1080]+ba/b[height<=1080]" "!new_url!"

:: Ask if the user wants to try another URL
set /p "try_again=Do you want to try another URL? (y/n): "
if /i "!try_again!"=="y" (
    goto loop
)

endlocal
