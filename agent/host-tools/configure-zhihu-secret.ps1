param(
    [Parameter(Mandatory = $true)]
    [string]$OfficialRunScript
)

$ErrorActionPreference = 'Stop'
$secretPointer = [IntPtr]::Zero
$plainSecret = $null

try {
    if (-not (Test-Path -LiteralPath $OfficialRunScript -PathType Leaf)) {
        throw '知乎官方连接组件不完整。'
    }

    Write-Host 'Catnip Forge - 连接知乎开放平台'
    Write-Host '请先在浏览器中的知乎开放平台个人中心申请 Access Secret。'
    Write-Host '下面的输入会被遮蔽，内容不会发送给 Catnip 页面或聊天。'
    $secureSecret = Read-Host '请粘贴 Access Secret' -AsSecureString
    $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
    $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    if ([string]::IsNullOrWhiteSpace($plainSecret)) {
        throw 'Access Secret 不能为空。'
    }

    $processInfo = [Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = 'powershell.exe'
    $escapedRunScript = $OfficialRunScript.Replace('"', '\"')
    $processInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$escapedRunScript`" auth set --secret-stdin"
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardInput = $true
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $processInfo
    [void]$process.Start()
    $process.StandardInput.Write($plainSecret)
    $process.StandardInput.Close()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        throw '知乎开放平台未接受该凭证，请检查后重试。'
    }

    Write-Host '连接配置完成。请关闭此窗口，回到 Catnip Forge 点击“重新检查”。'
} catch {
    Write-Host ('连接失败：' + $_.Exception.Message)
} finally {
    $plainSecret = $null
    if ($secretPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    }
    Read-Host '按 Enter 关闭窗口'
}
