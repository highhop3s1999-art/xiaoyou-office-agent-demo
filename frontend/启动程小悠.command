#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  print '未找到 Python 3，请先安装 Python 3 后再打开程小悠。'
  read 'reply?按回车关闭窗口…'
  exit 1
fi
python3 ./preview.py
result=$?
if (( result != 0 )); then
  read 'reply?按回车关闭窗口…'
fi
exit "$result"
