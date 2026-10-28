<#
.SYNOPSIS
    Supergence // SIS 1.0 Modern Windows GUI Installer
.DESCRIPTION
    Native Windows Presentation Foundation (WPF) Installer with modern dark slate,
    electric cyan accents, custom user-defined paths, shell:appsfolder registration,
    and desktop shortcut creation.
#>

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms, System.Drawing

$AppRoot = Split-Path -Parent $PSScriptRoot
$ReleaseDir = Join-Path $AppRoot "release"
$WinUnpackedDir = Join-Path $ReleaseDir "win-unpacked"
$SetupExe = Join-Path $ReleaseDir "Supergence Setup 1.0.0.exe"
$PortableExe = Join-Path $ReleaseDir "Supergence-Portable-1.0.0.exe"

$DefaultInstallDir = Join-Path $env:LOCALAPPDATA "Programs\Supergence"
$DefaultAppDataDir = Join-Path $env:APPDATA "Supergence\data"
$DefaultWorkspaceDir = Join-Path $env:APPDATA "Supergence\workspace"

[xml]$xaml = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="Supergence SIS 1.0 Setup"
    Height="670" Width="720"
    WindowStartupLocation="CenterScreen"
    WindowStyle="None"
    AllowsTransparency="True"
    Background="Transparent"
    ResizeMode="NoResize">

    <Window.Resources>
        <Style x:Key="ModernBtn" TargetType="Button">
            <Setter Property="Foreground" Value="#FFFFFF"/>
            <Setter Property="FontWeight" Value="Bold"/>
            <Setter Property="FontSize" Value="14"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="btnBorder" Background="#00A3FF" CornerRadius="8" Padding="14,10">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="btnBorder" Property="Background" Value="#00F2FE"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="btnBorder" Property="Background" Value="#0077B6"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <Style x:Key="BrowseBtn" TargetType="Button">
            <Setter Property="Foreground" Value="#00F2FE"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="FontSize" Value="11"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="bBorder" Background="#102A43" BorderBrush="#00F2FE" BorderThickness="1" CornerRadius="6" Padding="10,4">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="bBorder" Property="Background" Value="#00F2FE"/>
                                <Setter Property="Foreground" Value="#030712"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <Style x:Key="SecondaryBtn" TargetType="Button">
            <Setter Property="Foreground" Value="#CBD5E1"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="secBorder" Background="#1E293B" BorderBrush="#334155" BorderThickness="1" CornerRadius="8" Padding="12,8">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="secBorder" Property="Background" Value="#334155"/>
                                <Setter TargetName="secBorder" Property="BorderBrush" Value="#00F2FE"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <Style x:Key="PathBox" TargetType="TextBox">
            <Setter Property="Background" Value="#030712"/>
            <Setter Property="Foreground" Value="#F8FAFC"/>
            <Setter Property="BorderBrush" Value="#334155"/>
            <Setter Property="BorderThickness" Value="1"/>
            <Setter Property="FontFamily" Value="Consolas, monospace"/>
            <Setter Property="FontSize" Value="12"/>
            <Setter Property="Padding" Value="8,5"/>
            <Setter Property="VerticalContentAlignment" Value="Center"/>
        </Style>

        <Style x:Key="ModernCheckBox" TargetType="CheckBox">
            <Setter Property="Foreground" Value="#E2E8F0"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="FontWeight" Value="Medium"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Margin" Value="0,4"/>
        </Style>
    </Window.Resources>

    <Border CornerRadius="16" Background="#080C16" BorderBrush="#00F2FE" BorderThickness="1.5">
        <Border.Effect>
            <DropShadowEffect Color="#00F2FE" BlurRadius="28" Opacity="0.32" ShadowDepth="0"/>
        </Border.Effect>
        <Grid Margin="26">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="Auto"/>
            </Grid.RowDefinitions>

            <!-- Top Header & Close Button -->
            <Grid Grid.Row="0" Margin="0,0,0,14">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>

                <StackPanel Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
                    <Border Width="38" Height="38" CornerRadius="8" Background="#0D1B2A" BorderBrush="#00F2FE" BorderThickness="1" Margin="0,0,14,0">
                        <TextBlock Text="⚡" FontSize="20" HorizontalAlignment="Center" VerticalAlignment="Center" Foreground="#00F2FE"/>
                    </Border>
                    <StackPanel VerticalAlignment="Center">
                        <StackPanel Orientation="Horizontal">
                            <TextBlock Text="SUPERGENCE" FontSize="18" FontWeight="ExtraBold" Foreground="#FFFFFF" LetterSpacing="1"/>
                            <Border Background="#102A43" BorderBrush="#00F2FE" BorderThickness="0.8" CornerRadius="4" Margin="10,0,0,0" Padding="5,1">
                                <TextBlock Text="v1.0.0" FontSize="10" FontWeight="Bold" Foreground="#00F2FE" FontFamily="Consolas"/>
                            </Border>
                        </StackPanel>
                        <TextBlock Text="Autonomous Superintelligence for Windows" FontSize="12" Foreground="#94A3B8"/>
                    </StackPanel>
                </StackPanel>

                <Button x:Name="BtnClose" Grid.Column="1" Content="✕" Width="30" Height="30"
                        Foreground="#94A3B8" Background="Transparent" BorderThickness="0"
                        FontSize="14" Cursor="Hand" FontWeight="Bold"/>
            </Grid>

            <!-- Separator Line -->
            <Rectangle Grid.Row="1" Height="1" Fill="#1E293B" Margin="0,0,0,16"/>

            <!-- Center Content -->
            <ScrollViewer Grid.Row="2" VerticalScrollBarVisibility="Auto" Margin="0,0,0,10">
                <StackPanel>
                    <TextBlock Text="Configure Installation &amp; Storage Paths" FontSize="20" FontWeight="Bold" Foreground="#F8FAFC" Margin="0,0,0,4"/>
                    <TextBlock Text="You can customize exactly where the application binaries and persistent data are stored on your computer."
                               FontSize="12" Foreground="#94A3B8" TextWrapping="Wrap" Margin="0,0,0,16"/>

                    <!-- Custom Paths Configuration Card -->
                    <Border Background="#0D1527" BorderBrush="#1E293B" BorderThickness="1" CornerRadius="10" Padding="14" Margin="0,0,0,16">
                        <StackPanel>
                            <!-- 1. Program Installation Path -->
                            <TextBlock Text="📁 Program Installation Directory:" FontSize="12" FontWeight="SemiBold" Foreground="#38BDF8" Margin="0,0,0,4"/>
                            <Grid Margin="0,0,0,12">
                                <Grid.ColumnDefinitions>
                                    <ColumnDefinition Width="*"/>
                                    <ColumnDefinition Width="Auto"/>
                                </Grid.ColumnDefinitions>
                                <TextBox x:Name="TxtInstallPath" Grid.Column="0" Style="{StaticResource PathBox}"/>
                                <Button x:Name="BtnBrowseInstall" Grid.Column="1" Content="Browse..." Style="{StaticResource BrowseBtn}" Margin="8,0,0,0"/>
                            </Grid>

                            <!-- 2. Cognitive AppData Path -->
                            <TextBlock Text="💾 Cognitive Data &amp; Memory Directory (Conversations, Graphs, Brain):" FontSize="12" FontWeight="SemiBold" Foreground="#10B981" Margin="0,0,0,4"/>
                            <Grid Margin="0,0,0,12">
                                <Grid.ColumnDefinitions>
                                    <ColumnDefinition Width="*"/>
                                    <ColumnDefinition Width="Auto"/>
                                </Grid.ColumnDefinitions>
                                <TextBox x:Name="TxtDataPath" Grid.Column="0" Style="{StaticResource PathBox}"/>
                                <Button x:Name="BtnBrowseData" Grid.Column="1" Content="Browse..." Style="{StaticResource BrowseBtn}" Margin="8,0,0,0"/>
                            </Grid>

                            <!-- 3. Workspace Path -->
                            <TextBlock Text="📂 Workspace Directory (Generated Code, Projects, 3D Simulations):" FontSize="12" FontWeight="SemiBold" Foreground="#A855F7" Margin="0,0,0,4"/>
                            <Grid Margin="0,0,0,4">
                                <Grid.ColumnDefinitions>
                                    <ColumnDefinition Width="*"/>
                                    <ColumnDefinition Width="Auto"/>
                                </Grid.ColumnDefinitions>
                                <TextBox x:Name="TxtWorkspacePath" Grid.Column="0" Style="{StaticResource PathBox}"/>
                                <Button x:Name="BtnBrowseWorkspace" Grid.Column="1" Content="Browse..." Style="{StaticResource BrowseBtn}" Margin="8,0,0,0"/>
                            </Grid>
                        </StackPanel>
                    </Border>

                    <!-- User Options Checkboxes -->
                    <Border Background="#0D1527" BorderBrush="#1E293B" BorderThickness="1" CornerRadius="10" Padding="14" Margin="0,0,0,16">
                        <StackPanel>
                            <TextBlock Text="Installation Options:" FontSize="12" FontWeight="SemiBold" Foreground="#F8FAFC" Margin="0,0,0,8"/>

                            <!-- Desktop Shortcut Checkbox (Clickable by User) -->
                            <CheckBox x:Name="ChkDesktopShortcut" IsChecked="True" Style="{StaticResource ModernCheckBox}">
                                <StackPanel Orientation="Horizontal">
                                    <TextBlock Text="Create a shortcut on Desktop" Foreground="#F8FAFC"/>
                                    <TextBlock Text=" (accessible directly from your desktop)" Foreground="#64748B" FontSize="11" Margin="4,2,0,0"/>
                                </StackPanel>
                            </CheckBox>

                            <!-- shell:appsfolder Registration Checkbox -->
                            <CheckBox x:Name="ChkAppsFolder" IsChecked="True" Style="{StaticResource ModernCheckBox}">
                                <StackPanel Orientation="Horizontal">
                                    <TextBlock Text="Register in Applications (shell:appsfolder)" Foreground="#F8FAFC"/>
                                    <TextBlock Text=" (shows in Windows Start Menu &amp; Applications folder)" Foreground="#64748B" FontSize="11" Margin="4,2,0,0"/>
                                </StackPanel>
                            </CheckBox>

                            <!-- Launch Checkbox -->
                            <CheckBox x:Name="ChkLaunch" IsChecked="True" Style="{StaticResource ModernCheckBox}">
                                <TextBlock Text="Launch Supergence immediately after installation" Foreground="#F8FAFC"/>
                            </CheckBox>
                        </StackPanel>
                    </Border>

                    <!-- Live Status & Progress -->
                    <TextBlock x:Name="TxtStatus" Text="Ready to install Supergence SIS 1.0." FontSize="13" FontWeight="SemiBold" Foreground="#00F2FE" Margin="0,0,0,6"/>
                    <ProgressBar x:Name="ProgBar" Height="7" Minimum="0" Maximum="100" Value="0"
                                 Foreground="#00F2FE" Background="#1E293B" BorderThickness="0"/>
                </StackPanel>
            </ScrollViewer>

            <!-- Bottom Action Buttons -->
            <Grid Grid.Row="4" Margin="0,14,0,0">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="Auto"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>

                <StackPanel Grid.Column="0" Orientation="Horizontal">
                    <Button x:Name="BtnOpenData" Content="Open Data Folder" Style="{StaticResource SecondaryBtn}" Margin="0,0,8,0" Visibility="Collapsed"/>
                    <Button x:Name="BtnOpenInstall" Content="Open Install Folder" Style="{StaticResource SecondaryBtn}" Visibility="Collapsed"/>
                </StackPanel>

                <StackPanel Grid.Column="2" Orientation="Horizontal">
                    <Button x:Name="BtnInstall" Content="Install Supergence" Style="{StaticResource ModernBtn}" Width="190"/>
                    <Button x:Name="BtnLaunchApp" Content="Launch Supergence" Style="{StaticResource ModernBtn}" Width="190" Visibility="Collapsed"/>
                </StackPanel>
            </Grid>
        </Grid>
    </Border>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader $xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Element References
$btnClose = $window.FindName("BtnClose")
$btnInstall = $window.FindName("BtnInstall")
$btnLaunchApp = $window.FindName("BtnLaunchApp")
$btnOpenData = $window.FindName("BtnOpenData")
$btnOpenInstall = $window.FindName("BtnOpenInstall")

$txtInstallPath = $window.FindName("TxtInstallPath")
$txtDataPath = $window.FindName("TxtDataPath")
$txtWorkspacePath = $window.FindName("TxtWorkspacePath")

$btnBrowseInstall = $window.FindName("BtnBrowseInstall")
$btnBrowseData = $window.FindName("BtnBrowseData")
$btnBrowseWorkspace = $window.FindName("BtnBrowseWorkspace")

$chkDesktopShortcut = $window.FindName("ChkDesktopShortcut")
$chkAppsFolder = $window.FindName("ChkAppsFolder")
$chkLaunch = $window.FindName("ChkLaunch")

$txtStatus = $window.FindName("TxtStatus")
$progBar = $window.FindName("ProgBar")

# Prepopulate with defaults
$txtInstallPath.Text = $DefaultInstallDir
$txtDataPath.Text = $DefaultAppDataDir
$txtWorkspacePath.Text = $DefaultWorkspaceDir

# Drag window anywhere on mouse down
$window.Add_MouseDown({
    if ($_.ChangedButton -eq [System.Windows.Input.MouseButton]::Left) {
        $window.DragMove()
    }
})

$btnClose.Add_Click({
    $window.Close()
})

# Folder Browsing Handlers
function Browse-Folder([string]$title, [string]$initialPath) {
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = $title
    $dialog.ShowNewFolderButton = $true
    if (Test-Path $initialPath) {
        $dialog.SelectedPath = $initialPath
    }
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return $dialog.SelectedPath
    }
    return $null
}

$btnBrowseInstall.Add_Click({
    $selected = Browse-Folder "Select Supergence Program Installation Directory" $txtInstallPath.Text
    if ($selected) { $txtInstallPath.Text = $selected }
})

$btnBrowseData.Add_Click({
    $selected = Browse-Folder "Select Supergence Cognitive Data Storage Directory" $txtDataPath.Text
    if ($selected) { $txtDataPath.Text = $selected }
})

$btnBrowseWorkspace.Add_Click({
    $selected = Browse-Folder "Select Supergence Workspace Directory" $txtWorkspacePath.Text
    if ($selected) { $txtWorkspacePath.Text = $selected }
})

$btnOpenData.Add_Click({
    if (Test-Path $txtDataPath.Text) {
        [System.Diagnostics.Process]::Start("explorer.exe", $txtDataPath.Text)
    }
})

$btnOpenInstall.Add_Click({
    if (Test-Path $txtInstallPath.Text) {
        [System.Diagnostics.Process]::Start("explorer.exe", $txtInstallPath.Text)
    }
})

$btnLaunchApp.Add_Click({
    $targetExe = Join-Path $txtInstallPath.Text "Supergence.exe"
    if (Test-Path $targetExe) {
        Start-Process $targetExe
        $window.Close()
    } else {
        $txtStatus.Text = "Could not find $targetExe to launch."
        $txtStatus.Foreground = [System.Windows.Media.Brushes]::IndianRed
    }
})

# Installation Routine
$btnInstall.Add_Click({
    $btnInstall.IsEnabled = $false
    $btnBrowseInstall.IsEnabled = $false
    $btnBrowseData.IsEnabled = $false
    $btnBrowseWorkspace.IsEnabled = $false
    $txtInstallPath.IsReadOnly = $true
    $txtDataPath.IsReadOnly = $true
    $txtWorkspacePath.IsReadOnly = $true
    $chkDesktopShortcut.IsEnabled = $false
    $chkAppsFolder.IsEnabled = $false

    $finalInstallDir = $txtInstallPath.Text.Trim()
    $finalDataDir = $txtDataPath.Text.Trim()
    $finalWorkspaceDir = $txtWorkspacePath.Text.Trim()
    $finalAppDataRoot = Split-Path -Parent $finalDataDir

    # Step 1: Create directories
    $txtStatus.Text = "Step 1/6: Creating user-specified directories..."
    $progBar.Value = 15
    [System.Windows.Forms.Application]::DoEvents()

    if (-not (Test-Path $finalInstallDir)) { New-Item -ItemType Directory -Path $finalInstallDir -Force | Out-Null }
    if (-not (Test-Path $finalDataDir)) { New-Item -ItemType Directory -Path $finalDataDir -Force | Out-Null }
    if (-not (Test-Path $finalWorkspaceDir)) { New-Item -ItemType Directory -Path $finalWorkspaceDir -Force | Out-Null }

    $subdirs = @(
        "conversations", "memory", "theories", "research",
        "rules", "skills\learned", "tools\custom", "rsi", "improvement"
    )
    foreach ($sub in $subdirs) {
        $p = Join-Path $finalDataDir $sub
        if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
    }

    # Step 2: Write custom configuration
    $txtStatus.Text = "Step 2/6: Writing path configuration (supergence-config.json)..."
    $progBar.Value = 30
    [System.Windows.Forms.Application]::DoEvents()

    $configObj = @{
        installPath = $finalInstallDir
        dataPath = $finalDataDir
        workspacePath = $finalWorkspaceDir
        installedAt = (Get-Date).ToString("o")
        version = "1.0.0"
    }
    $configJson = $configObj | ConvertTo-Json -Depth 4

    # Save to install directory and to %APPDATA%\Supergence
    Set-Content -Path (Join-Path $finalInstallDir "supergence-config.json") -Value $configJson -Encoding UTF8
    $appDataDefaultDir = Join-Path $env:APPDATA "Supergence"
    if (-not (Test-Path $appDataDefaultDir)) { New-Item -ItemType Directory -Path $appDataDefaultDir -Force | Out-Null }
    Set-Content -Path (Join-Path $appDataDefaultDir "supergence-config.json") -Value $configJson -Encoding UTF8

    # Step 3: Seed initial cognitive data
    $txtStatus.Text = "Step 3/6: Seeding initial knowledge graph & long-term memory..."
    $progBar.Value = 45
    [System.Windows.Forms.Application]::DoEvents()

    $sourceDataDir = Join-Path $AppRoot "data"
    if (Test-Path $sourceDataDir) {
        $seedFiles = @("survival.json", "dynamic-parts.json", "memory\long-term.json", "memory\knowledge-graph.json")
        foreach ($rel in $seedFiles) {
            $src = Join-Path $sourceDataDir $rel
            $dest = Join-Path $finalDataDir $rel
            if ((Test-Path $src) -and (-not (Test-Path $dest))) {
                $destParent = Split-Path -Parent $dest
                if (-not (Test-Path $destParent)) { New-Item -ItemType Directory -Path $destParent -Force | Out-Null }
                Copy-Item -Path $src -Destination $dest -Force
            }
        }
    }

    # Step 4: Deploy application binaries
    $txtStatus.Text = "Step 4/6: Deploying Supergence application binaries..."
    $progBar.Value = 65
    [System.Windows.Forms.Application]::DoEvents()

    if (Test-Path $WinUnpackedDir) {
        Copy-Item -Path "$WinUnpackedDir\*" -Destination $finalInstallDir -Recurse -Force
    } elseif (Test-Path $PortableExe) {
        Copy-Item -Path $PortableExe -Destination (Join-Path $finalInstallDir "Supergence.exe") -Force
    }

    $targetExe = Join-Path $finalInstallDir "Supergence.exe"

    # Step 5: Register in shell:appsfolder (Start Menu & Windows Applications Registry)
    $txtStatus.Text = "Step 5/6: Registering in Windows Applications (shell:appsfolder)..."
    $progBar.Value = 85
    [System.Windows.Forms.Application]::DoEvents()

    $wsh = New-Object -ComObject WScript.Shell

    if ($chkAppsFolder.IsChecked) {
        $programsPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
        $startShortcutPath = Join-Path $programsPath "Supergence SIS 1.0.lnk"
        $startShortcut = $wsh.CreateShortcut($startShortcutPath)
        $startShortcut.TargetPath = $targetExe
        $startShortcut.WorkingDirectory = $finalInstallDir
        $startShortcut.IconLocation = "$targetExe,0"
        $startShortcut.Description = "Supergence SIS 1.0 Autonomous Superintelligence"
        $startShortcut.Save()

        # Register in Windows App Paths (so Supergence.exe launches from Run / Shell)
        $appPathsKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\Supergence.exe"
        if (-not (Test-Path $appPathsKey)) { New-Item -Path $appPathsKey -Force | Out-Null }
        Set-ItemProperty -Path $appPathsKey -Name "(Default)" -Value $targetExe
        Set-ItemProperty -Path $appPathsKey -Name "Path" -Value $finalInstallDir

        # Register in Windows Applications for shell:appsfolder recognition
        $appRegKey = "HKCU:\Software\Classes\Applications\Supergence.exe"
        if (-not (Test-Path $appRegKey)) { New-Item -Path $appRegKey -Force | Out-Null }
        Set-ItemProperty -Path $appRegKey -Name "FriendlyAppName" -Value "Supergence SIS 1.0"
        Set-ItemProperty -Path $appRegKey -Name "ApplicationCompany" -Value "Supergence"

        # Register in Windows Uninstall (Add/Remove Programs & shell:appsfolder indexing)
        $uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Supergence"
        if (-not (Test-Path $uninstallKey)) { New-Item -Path $uninstallKey -Force | Out-Null }
        Set-ItemProperty -Path $uninstallKey -Name "DisplayName" -Value "Supergence SIS 1.0"
        Set-ItemProperty -Path $uninstallKey -Name "DisplayIcon" -Value "$targetExe,0"
        Set-ItemProperty -Path $uninstallKey -Name "DisplayVersion" -Value "1.0.0"
        Set-ItemProperty -Path $uninstallKey -Name "Publisher" -Value "Supergence"
        Set-ItemProperty -Path $uninstallKey -Name "InstallLocation" -Value $finalInstallDir
        Set-ItemProperty -Path $uninstallKey -Name "UninstallString" -Value "`"$finalInstallDir\uninstall.bat`""

        # Create uninstaller batch
        $uninstallerContent = @"
@echo off
echo Uninstalling Supergence SIS 1.0...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\Supergence.exe" /f >nul 2>&1
reg delete "HKCU\Software\Classes\Applications\Supergence.exe" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Supergence" /f >nul 2>&1
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Supergence SIS 1.0.lnk" >nul 2>&1
del "%USERPROFILE%\Desktop\Supergence SIS 1.0.lnk" >nul 2>&1
echo Supergence shortcuts and registry registrations removed.
pause
"@
        Set-Content -Path (Join-Path $finalInstallDir "uninstall.bat") -Value $uninstallerContent -Encoding ASCII
    }

    # Step 6: Create Desktop Shortcut if user checked the box!
    if ($chkDesktopShortcut.IsChecked) {
        $txtStatus.Text = "Step 6/6: Creating Desktop shortcut..."
        $desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
        $desktopShortcutPath = Join-Path $desktopPath "Supergence SIS 1.0.lnk"
        $desktopShortcut = $wsh.CreateShortcut($desktopShortcutPath)
        $desktopShortcut.TargetPath = $targetExe
        $desktopShortcut.WorkingDirectory = $finalInstallDir
        $desktopShortcut.IconLocation = "$targetExe,0"
        $desktopShortcut.Description = "Supergence SIS 1.0 Autonomous Superintelligence"
        $desktopShortcut.Save()
    }

    # Refresh Windows Shell Icon Cache / Association
    try {
        $code = '[DllImport("shell32.dll")] public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);'
        $type = Add-Type -MemberDefinition $code -Name "ShellNotification" -Namespace "Win32" -PassThru
        $type::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero) # SHCNE_ASSOCCHANGED
    } catch {}

    $progBar.Value = 100
    $txtStatus.Text = "Installation complete! Registered in shell:appsfolder."
    $txtStatus.Foreground = [System.Windows.Media.Brushes]::LightGreen

    $btnInstall.Visibility = [System.Windows.Visibility]::Collapsed
    $btnLaunchApp.Visibility = [System.Windows.Visibility]::Visible
    $btnOpenData.Visibility = [System.Windows.Visibility]::Visible
    $btnOpenInstall.Visibility = [System.Windows.Visibility]::Visible

    # Auto-launch if requested
    if ($chkLaunch.IsChecked) {
        Start-Sleep -Milliseconds 600
        Start-Process $targetExe
        $window.Close()
    }
})

$window.ShowDialog() | Out-Null
