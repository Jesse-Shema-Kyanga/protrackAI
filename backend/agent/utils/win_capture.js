const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Custom Active Window Capture for Windows
 * ✅ FIXED: Proper PowerShell string escaping
 */
function getActiveWindow() {
  return new Promise((resolve) => {
    // ✅ CRITICAL FIX: Use single quotes for TypeDefinition to avoid escaping hell
    const psScript = `
\$code = @'
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

Add-Type -TypeDefinition \$code -ErrorAction SilentlyContinue

try {
    \$hWnd = [Win32]::GetForegroundWindow()
    
    if (\$hWnd -ne [IntPtr]::Zero) {
        \$sb = New-Object System.Text.StringBuilder 256
        \$null = [Win32]::GetWindowText(\$hWnd, \$sb, \$sb.Capacity)
        
        \$processId = 0
        \$null = [Win32]::GetWindowThreadProcessId(\$hWnd, [ref]\$processId)
        
        \$process = Get-Process -Id \$processId -ErrorAction SilentlyContinue
        \$appName = if (\$process) { \$process.ProcessName } else { "Unknown" }
        \$url = ""

        # --- URL Capture for Browsers using UI Automation ---
        if (\$appName -match "chrome|msedge|brave") {
            try {
                Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
                \$root = [Windows.Automation.AutomationElement]::FromHandle(\$hWnd)
                
                # Search for the address bar. In Chromium, it usually has a specific Name or ControlType
                # We search for an Edit or Text element that contains the URL
                \$condition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::NameProperty, "Address and search bar")
                if (-not \$condition) {
                    \$condition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ControlTypeProperty, [Windows.Automation.ControlType]::Edit)
                }
                
                \$addressBar = \$root.FindFirst([Windows.Automation.TreeScope]::Descendants, \$condition)
                
                if (\$addressBar) {
                    \$url = \$addressBar.Current.Value
                    if (-not \$url -and \$addressBar.Current.Name) {
                        \$url = \$addressBar.Current.Name
                    }
                }
            } catch {
                # Fallback or silent fail for URL capture
            }
        }
        
        \$result = @{
            title = \$sb.ToString()
            url = \$url
            owner = @{ 
                name = \$appName
            }
        }
        
        \$result | ConvertTo-Json -Compress
    } else {
        Write-Output "null"
    }
} catch {
    Write-Output "null"
}
`.trim();

    const scriptName = 'capture.ps1';
    const scriptPath = path.join(__dirname, scriptName);

    // Write the script
    try {
      fs.writeFileSync(scriptPath, psScript, 'utf8');
    } catch (e) {
      console.error('[WinCapture] ❌ Failed to write PowerShell script:', e.message);
      resolve(null);
      return;
    }

    // Execute PowerShell script
    const cmd = `powershell -ExecutionPolicy Bypass -File .\\${scriptName}`;

    exec(cmd, {
      timeout: 5000,
      cwd: __dirname
    }, (error, stdout, stderr) => {

      if (error) {
        console.error('[WinCapture] ❌ Execution error:', error.message);
        console.error('[WinCapture] Error code:', error.code);
        console.error('[WinCapture] Command:', cmd);
        console.error('[WinCapture] CWD:', __dirname);
        if (stderr) console.error('[WinCapture] stderr:', stderr);
        if (stdout) console.error('[WinCapture] stdout:', stdout);
        resolve(null);
        return;
      }

      if (stderr && stderr.trim()) {
        // Only log warnings if they're not about Add-Type (which is expected first run)
        if (!stderr.includes('Add-Type') && !stderr.includes('already exists')) {
          console.warn('[WinCapture] ⚠️  PowerShell warnings:', stderr.trim().substring(0, 200));
        }
      }

      if (!stdout || stdout.trim() === 'null' || stdout.trim() === '') {
        console.log('[WinCapture] No active window detected');
        resolve(null);
        return;
      }

      try {
        // Extract JSON from stdout
        const jsonMatch = stdout.trim().match(/\{.*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log(`[WinCapture] ✅ Captured: ${result.owner?.name || 'Unknown'} - ${result.title?.substring(0, 40) || 'Untitled'}`);
          resolve(result);
        } else {
          console.warn('[WinCapture] ⚠️  Invalid JSON format');
          resolve(null);
        }
      } catch (e) {
        console.error('[WinCapture] ❌ JSON parse error:', e.message);
        resolve(null);
      }
    });
  });
}

module.exports = { getActiveWindow };