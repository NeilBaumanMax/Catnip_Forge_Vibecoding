param(
    [Parameter(Mandatory = $true)]
    [string]$ProviderName,
    [Parameter(Mandatory = $true)]
    [string]$ReadyFile
)

$ErrorActionPreference = 'Stop'
$secretPointer = [IntPtr]::Zero
$plainSecret = $null

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

try {
    [xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Catnip Forge · 配置模型凭据" Width="560" Height="360"
        WindowStartupLocation="CenterScreen" ResizeMode="NoResize" WindowStyle="None"
        AllowsTransparency="True" Background="Transparent" Topmost="True" ShowInTaskbar="True">
  <Border CornerRadius="20" Background="#F7F8FA" BorderBrush="#E1E2E6" BorderThickness="1">
    <Grid Margin="28">
      <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
      <Grid x:Name="Header" Grid.Row="0">
        <Grid.ColumnDefinitions><ColumnDefinition Width="48"/><ColumnDefinition Width="*"/><ColumnDefinition Width="32"/></Grid.ColumnDefinitions>
        <Border Width="42" Height="42" CornerRadius="13" Background="#5865F2"><TextBlock Text="◆" Foreground="White" FontSize="18" HorizontalAlignment="Center" VerticalAlignment="Center"/></Border>
        <StackPanel Grid.Column="1" Margin="14,0,12,0"><TextBlock x:Name="TitleText" Foreground="#1C1C1E" FontFamily="Microsoft YaHei UI" FontSize="20" FontWeight="SemiBold"/><TextBlock Text="凭据由 Windows 加密，只在本机 Main 进程使用" Margin="0,5,0,0" Foreground="#6E6E73" FontFamily="Microsoft YaHei UI" FontSize="12"/></StackPanel>
        <Button x:Name="CloseButton" Grid.Column="2" Width="30" Height="30" Content="×" FontSize="18" Foreground="#6E6E73" Background="Transparent" BorderThickness="0" Cursor="Hand"/>
      </Grid>
      <Border Grid.Row="1" Margin="0,24,0,0" Padding="12,10" CornerRadius="10" Background="#EEF0FF"><TextBlock Text="API Key 不会进入模型页面、聊天、日志或命令参数。" Foreground="#37408F" FontFamily="Microsoft YaHei UI" FontSize="12" TextWrapping="Wrap"/></Border>
      <TextBlock Grid.Row="2" Margin="0,20,0,8" Text="API KEY / ACCESS TOKEN" Foreground="#636366" FontFamily="Segoe UI" FontSize="11" FontWeight="SemiBold"/>
      <Border Grid.Row="3" Height="46" CornerRadius="10" Background="White" BorderBrush="#C7C7CC" BorderThickness="1"><PasswordBox x:Name="SecretInput" Padding="13,10" Foreground="#1C1C1E" Background="Transparent" BorderThickness="0" FontFamily="Segoe UI" FontSize="14"/></Border>
      <TextBlock x:Name="ValidationText" Grid.Row="4" Margin="2,8,0,0" Foreground="#D70015" FontFamily="Microsoft YaHei UI" FontSize="11" Visibility="Collapsed" Text="请输入凭据。"/>
      <StackPanel Grid.Row="5" Margin="0,20,0,0" Orientation="Horizontal" HorizontalAlignment="Right"><Button x:Name="CancelButton" Width="92" Height="40" Margin="0,0,10,0" Content="取消" IsCancel="True"/><Button x:Name="SaveButton" Width="150" Height="40" Content="安全保存" IsDefault="True" Foreground="White" Background="#5865F2" BorderBrush="#5865F2" FontWeight="SemiBold"/></StackPanel>
    </Grid>
  </Border>
</Window>
'@
    $reader = [System.Xml.XmlNodeReader]::new($xaml)
    $window = [Windows.Markup.XamlReader]::Load($reader)
    $passwordBox = $window.FindName('SecretInput')
    $validationText = $window.FindName('ValidationText')
    $window.FindName('TitleText').Text = '配置 ' + $ProviderName
    $window.FindName('SaveButton').Add_Click({ if ([string]::IsNullOrWhiteSpace($passwordBox.Password)) { $validationText.Visibility = [Windows.Visibility]::Visible; [void]$passwordBox.Focus(); return }; $window.DialogResult = $true }.GetNewClosure())
    $window.FindName('CancelButton').Add_Click({ $window.DialogResult = $false }.GetNewClosure())
    $window.FindName('CloseButton').Add_Click({ $window.DialogResult = $false }.GetNewClosure())
    $window.FindName('Header').Add_MouseLeftButtonDown({ $window.DragMove() }.GetNewClosure())
    $window.Add_ContentRendered({ [IO.File]::WriteAllText($ReadyFile, 'ready', [Text.Encoding]::UTF8); [void]$window.Activate(); [void]$passwordBox.Focus() }.GetNewClosure())
    $result = $window.ShowDialog()
    if ($result -ne $true) { $passwordBox.Clear(); exit 2 }
    $secureSecret = $passwordBox.SecurePassword.Copy()
    $passwordBox.Clear()
    $window.Close()
    $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
    $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    if ([string]::IsNullOrWhiteSpace($plainSecret)) { exit 3 }
    [Console]::Out.Write($plainSecret)
    exit 0
} catch {
    exit 1
} finally {
    $plainSecret = $null
    if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
}
