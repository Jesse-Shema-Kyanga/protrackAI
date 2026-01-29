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
        
        $result = @{
            title = $sb.ToString()
            owner = @{ 
                name = if ($process) { $process.ProcessName } else { "Unknown" }
            }
        }
        
        $result | ConvertTo-Json -Compress
    } else {
        Write-Output "null"
    }
} catch {
    Write-Error $_.Exception.Message
    Write-Output "null"
}