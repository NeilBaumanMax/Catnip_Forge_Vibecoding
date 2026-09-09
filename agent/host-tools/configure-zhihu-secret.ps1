param(
    [Parameter(Mandatory = $true)]
    [string]$OfficialRunScript
)

$ErrorActionPreference = 'Stop'
$secretPointer = [IntPtr]::Zero
$plainSecret = $null

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

function Show-SecretInputDialog {
    [xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Catnip Forge · 连接知乎开放平台"
        Width="560" Height="390" WindowStartupLocation="CenterScreen"
        ResizeMode="NoResize" WindowStyle="None" AllowsTransparency="True"
        Background="Transparent" Topmost="True" ShowInTaskbar="True">
  <Border CornerRadius="20" Background="#F7F8FA" BorderBrush="#E1E2E6" BorderThickness="1">
    <Border.Effect><DropShadowEffect BlurRadius="28" ShadowDepth="10" Opacity="0.28" Color="#000000"/></Border.Effect>
    <Grid Margin="28">
      <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/>
      </Grid.RowDefinitions>
      <Grid x:Name="Header" Grid.Row="0">
        <Grid.ColumnDefinitions><ColumnDefinition Width="48"/><ColumnDefinition Width="*"/><ColumnDefinition Width="32"/></Grid.ColumnDefinitions>
        <Border Width="42" Height="42" CornerRadius="13" Background="#0A84FF" VerticalAlignment="Top">
          <TextBlock Text="✓" Foreground="White" FontFamily="Segoe UI Symbol" FontSize="20" FontWeight="SemiBold" HorizontalAlignment="Center" VerticalAlignment="Center"/>
        </Border>
        <StackPanel Grid.Column="1" Margin="14,0,12,0">
          <TextBlock Text="连接知乎开放平台" Foreground="#1C1C1E" FontFamily="Microsoft YaHei UI" FontSize="20" FontWeight="SemiBold"/>
          <TextBlock Text="只需配置一次，之后探索会自动使用" Margin="0,5,0,0" Foreground="#6E6E73" FontFamily="Microsoft YaHei UI" FontSize="12"/>
        </StackPanel>
        <Button x:Name="CloseButton" Grid.Column="2" Width="30" Height="30" Content="×" FontSize="18" Foreground="#6E6E73" Background="Transparent" BorderThickness="0" Cursor="Hand"/>
      </Grid>
      <Border Grid.Row="1" Margin="0,24,0,0" Padding="12,10" CornerRadius="10" Background="#EAF4FF">
        <TextBlock Text="Secret 只交给知乎官方连接工具，不会进入探索页面、聊天或日志。" Foreground="#265D91" FontFamily="Microsoft YaHei UI" FontSize="12" TextWrapping="Wrap"/>
      </Border>
      <TextBlock Grid.Row="2" Margin="0,22,0,8" Text="ACCESS SECRET" Foreground="#636366" FontFamily="Segoe UI" FontSize="11" FontWeight="SemiBold"/>
      <Border Grid.Row="3" Height="46" CornerRadius="10" Background="White" BorderBrush="#C7C7CC" BorderThickness="1">
        <PasswordBox x:Name="SecretInput" Padding="13,10" Foreground="#1C1C1E" Background="Transparent" BorderThickness="0" FontFamily="Segoe UI" FontSize="14"/>
      </Border>
      <TextBlock x:Name="ValidationText" Grid.Row="4" Margin="2,8,0,0" Foreground="#D70015" FontFamily="Microsoft YaHei UI" FontSize="11" Visibility="Collapsed" Text="请先粘贴 Access Secret。"/>
      <StackPanel Grid.Row="5" Margin="0,22,0,0" Orientation="Horizontal" HorizontalAlignment="Right">
        <Button x:Name="CancelButton" Width="92" Height="40" Margin="0,0,10,0" Content="取消" IsCancel="True" Foreground="#3A3A3C" Background="White" BorderBrush="#D1D1D6" FontFamily="Microsoft YaHei UI" Cursor="Hand"/>
        <Button x:Name="ConnectButton" Width="150" Height="40" Content="安全连接" IsDefault="True" Foreground="White" Background="#0A84FF" BorderBrush="#0A84FF" FontFamily="Microsoft YaHei UI" FontWeight="SemiBold" Cursor="Hand"/>
      </StackPanel>
    </Grid>
  </Border>
</Window>
'@

    $reader = [System.Xml.XmlNodeReader]::new($xaml)
    $window = [Windows.Markup.XamlReader]::Load($reader)
    $passwordBox = $window.FindName('SecretInput')
    $validationText = $window.FindName('ValidationText')
    $connectButton = $window.FindName('ConnectButton')
    $cancelButton = $window.FindName('CancelButton')
    $closeButton = $window.FindName('CloseButton')
    $header = $window.FindName('Header')

    $connectButton.Add_Click({
        if ([string]::IsNullOrWhiteSpace($passwordBox.Password)) {
            $validationText.Visibility = [Windows.Visibility]::Visible
            [void]$passwordBox.Focus()
            return
        }
        $window.DialogResult = $true
    }.GetNewClosure())
    $cancelButton.Add_Click({ $window.DialogResult = $false }.GetNewClosure())
    $closeButton.Add_Click({ $window.DialogResult = $false }.GetNewClosure())
    $header.Add_MouseLeftButtonDown({ $window.DragMove() }.GetNewClosure())
    $window.Add_ContentRendered({ [void]$passwordBox.Focus() }.GetNewClosure())

    $result = $window.ShowDialog()
    if ($result -ne $true) {
        $passwordBox.Clear()
        $window.Close()
        return $null
    }

    $secureValue = $passwordBox.SecurePassword.Copy()
    $passwordBox.Clear()
    $window.Close()
    return $secureValue
}

function Show-ConnectionMessage([string]$Message, [Windows.MessageBoxImage]$Icon) {
    [void][Windows.MessageBox]::Show($Message, 'Catnip Forge · 知乎开放平台', [Windows.MessageBoxButton]::OK, $Icon)
}

try {
    if (-not (Test-Path -LiteralPath $OfficialRunScript -PathType Leaf)) { throw '知乎官方连接组件不完整。' }
    $secureSecret = Show-SecretInputDialog
    if ($null -eq $secureSecret) { exit 0 }
    $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
    $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    if ([string]::IsNullOrWhiteSpace($plainSecret)) { throw 'Access Secret 不能为空。' }

    $processInfo = [Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = 'powershell.exe'
    $escapedRunScript = $OfficialRunScript.Replace('"', '\"')
    $processInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$escapedRunScript`" auth set --secret-stdin"
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    $processInfo.RedirectStandardInput = $true
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $processInfo
    [void]$process.Start()
    $process.StandardInput.Write($plainSecret)
    $process.StandardInput.Close()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw '知乎开放平台未接受该凭证，请检查后重试。' }
    Show-ConnectionMessage '连接配置完成。返回探索页后会自动确认。' ([Windows.MessageBoxImage]::Information)
} catch {
    Show-ConnectionMessage ('连接失败：' + $_.Exception.Message) ([Windows.MessageBoxImage]::Error)
} finally {
    $plainSecret = $null
    if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
}
