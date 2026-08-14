; 在安装开始前检测 Node.js，缺失则尝试通过 winget 自动安装。
; 若自动安装失败（如无 winget / 需要管理员权限），应用首次启动时仍会再次引导安装。

!macro customInit
  DetailPrint "正在检测 Node.js 运行时…"

  ; 1) 注册表检测
  ReadRegStr $0 HKLM "SOFTWARE\Node.js" "InstallDir"
  ReadRegStr $1 HKCU "SOFTWARE\Node.js" "InstallDir"

  ; 2) PATH 检测（node -v 退出码）
  nsExec::ExecToStack 'cmd /c node -v'
  Pop $2   ; exit code
  Pop $3   ; output

  ${If} $0 != ""
  ${OrIf} $1 != ""
  ${OrIf} $2 == 0
    DetailPrint "已检测到 Node.js（$0$1$3），跳过安装。"
    DetailPrint "注：dsh 需要 Node.js 22.19 及以上（含 zstd 支持），应用启动时会进一步校验。"
  ${Else}
    DetailPrint "未检测到 Node.js，尝试通过 winget 自动安装…"
    nsExec::ExecToLog 'winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements --disable-interactivity'
    DetailPrint "自动安装结束。若失败，应用首次启动时会引导手动安装。"
  ${EndIf}
!macroend
