$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
'@

Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

try {
    $hWnd = [Win32]::GetForegroundWindow()
    
    if ($hWnd -ne [IntPtr]::Zero) {
        $sb = New-Object System.Text.StringBuilder 256
        $null = [Win32]::GetWindowText($hWnd, $sb, $sb.Capacity)
        
        $processId = 0
        $null = [Win32]::GetWindowThreadProcessId($hWnd, [ref]$processId)
        
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        $appName = if ($process) { $process.ProcessName } else { "Unknown" }
        $url = ""

        # --- URL Capture for Browsers using UI Automation ---
        if ($appName -match "chrome|msedge|brave") {
            try {
                Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
                $root = [Windows.Automation.AutomationElement]::FromHandle($hWnd)
                
                # Search for the address bar. In Chromium, it usually has a specific Name or ControlType
                # We search for an Edit or Text element that contains the URL
                $condition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::NameProperty, "Address and search bar")
                if (-not $condition) {
                    $condition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ControlTypeProperty, [Windows.Automation.ControlType]::Edit)
                }
                
                $addressBar = $root.FindFirst([Windows.Automation.TreeScope]::Descendants, $condition)
                
                if ($addressBar) {
                    $url = $addressBar.Current.Value
                    if (-not $url -and $addressBar.Current.Name) {
                        $url = $addressBar.Current.Name
                    }
                }
            } catch {
                # Fallback or silent fail for URL capture
            }
        }
        
        $result = @{
            title = $sb.ToString()
            url = $url
            owner = @{ 
                name = $appName
            }
        }
        
        $result | ConvertTo-Json -Compress
    } else {
        Write-Output "null"
    }
} catch {
    Write-Output "null"
}