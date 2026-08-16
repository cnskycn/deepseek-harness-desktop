; 安装包已内置 portable Node.js（resources/node/win-x64/node.exe），
; 应用启动时优先使用内置 node，无需在安装时检测或安装系统 Node.js。
; 因此这里不再执行 winget 安装，保持安装过程快速、免 UAC。
;
; 仅当内置 node 缺失（极端情况，如安装被篡改）时，应用首次启动会引导
; 安装系统 Node.js（见 electron/main.js 的 ensureNode 回退逻辑）。

!macro customInit
  DetailPrint "DeepSeek Harness 已内置 Node.js 运行时，无需额外安装。"
!macroend
