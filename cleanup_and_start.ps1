# Forcefully kill everything on backend and frontend ports
Write-Host "Cleaning up ports 5000 and 5173..." -ForegroundColor Cyan

$ports = @(5000, 5173)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            Write-Host "Killing process $procId on port $port..." -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}

# Also kill any stray node or electron processes just in case
Write-Host "Killing stray node/electron processes..." -ForegroundColor Cyan
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM electron.exe /T 2>$null

Write-Host "Done! Ports are clear. Starting servers..." -ForegroundColor Green

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Sleep -Seconds 5

# Start frontend in a new window
# Correctly navigate to frontend folder
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Both servers are starting in separate windows. Please wait a few seconds and then refresh your browser." -ForegroundColor Green
