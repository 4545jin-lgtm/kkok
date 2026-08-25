param([string]$Root, [int]$Port = 8123)

$ErrorActionPreference = 'Stop'
$Root = [System.IO.Path]::GetFullPath($Root)

$types = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "serving $Root at http://localhost:$Port/"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
        $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
        if ($rel -eq '' -or $rel.EndsWith('/')) { $rel = $rel + 'index.html' }
        $file = Join-Path $Root ($rel -replace '/', '\')

        if (Test-Path $file -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            if ($types.ContainsKey($ext)) { $res.ContentType = $types[$ext] }
            else { $res.ContentType = 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $res.Headers.Add('Cache-Control', 'no-store')
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes('404 not found: ' + $rel)
            $res.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        $res.StatusCode = 500
    } finally {
        $res.OutputStream.Close()
    }
}
