# Catnip Forge 客户数据路径迁移施工文档

更新日期：2026-07-25  
施工分支：`qwen_vision_attachments`

## 1. 目标

Windows `win-unpacked` 在客户电脑上的应用外持久化路径统一为：

```text
%APPDATA%\@Catnip_Forge\electron
C:\Catnip_Forge\hardboard
```

停止为新客户创建：

```text
%APPDATA%\@vibeide\electron
C:\vibeide-hw
```

内部 npm 包名、仓库代号和历史日志中的 `vibeide` 不因此强制重命名；本次只调整客户电脑上的运行态路径。

## 2. 启动顺序

Electron 默认会根据 `package.json.name` 计算 `userData`。当前主进程模块在加载时就会初始化日志和会话，因此不能等 `index.ts` 执行后再修改路径。

施工采用独立 bootstrap：

1. Electron 进入主进程 bootstrap。
2. bootstrap 计算 `%APPDATA%\@Catnip_Forge\electron`。
3. 在加载 logger、session store、Agent、附件等模块之前调用 `app.setPath('userData', ...)`。
4. 完成路径设置后再加载原主进程入口。

这样 Chromium Cache、Local Storage、浏览器 Partition、日志、会话、附件、Agent workspace 和 Claude 配置都会落在同一个新根目录。

## 3. 旧数据迁移

为避免已有用户升级后丢失历史对话、附件和浏览器状态：

- 新目录不存在而旧 `%APPDATA%\@vibeide\electron` 存在时，首次启动复制旧目录到新目录。
- 迁移过滤 Chromium/进程锁等瞬时文件，失败时记录到新目录的迁移状态文件，但不删除旧数据。
- 新目录已存在时不覆盖，迁移过程可重复启动。
- 旧目录保留为安全备份，不做自动递归删除；确认新版数据无误后可由用户手工清理。
- 新安装、全新 Windows 用户不会创建旧目录。

## 4. Hardboard 短路径

打包版 ESP-IDF 短路径从 `C:\vibeide-hw\hardboard` 改为 `C:\Catnip_Forge\hardboard` junction。

- 只在硬件 Runtime 首次加载时创建。
- 如果旧 `C:\vibeide-hw\hardboard` 是本软件创建的 junction，在新 junction 成功后可安全移除旧 junction；普通文件夹绝不自动删除。
- `C:\` 不可写时，辅助目录名同步使用 `%TEMP%\Catnip_Forge`，并回退到原资源路径。

## 5. 验收

- 隔离 `appData` 下验证新 `userData` 精确等于 `@Catnip_Forge\electron`。
- 验证旧会话、附件 fixture 能复制到新目录。
- 验证二次启动不覆盖新目录。
- 验证 bootstrap 是打包主入口，且设置路径后才加载 `index`。
- 验证 Runtime 当前短路径只使用 `C:\Catnip_Forge`。
- Electron/Runtime typecheck、main/renderer build、专项路径测试和 `git diff --check` 通过。
- 后续更新 `win-unpacked` 后，必须在隔离客户环境或干净 Windows 用户下复核实际创建目录。

## 6. 边界

- DeepSeek/Qwen Key 仍保存在软件包内部的 `resources`，不迁入 `%APPDATA%`。
- 用户主动选择的工程目录和 Agent 主动修改的外部工程不属于应用数据目录迁移。
- Windows Prefetch、CrashDump、Defender 等系统文件不由应用控制，不在本次改名范围。
