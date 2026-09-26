Add-Type -AssemblyName System.Drawing

$srcPath = Resolve-Path "public/logo2.png"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

$maxDim = [Math]::Max($src.Width, $src.Height)
$squareBmp = New-Object System.Drawing.Bitmap($maxDim, $maxDim, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($squareBmp)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$offsetX = [int](($maxDim - $src.Width) / 2)
$offsetY = [int](($maxDim - $src.Height) / 2)

$g.DrawImage($src, $offsetX, $offsetY, $src.Width, $src.Height)

$outPath = Join-Path (Get-Location) "public/logo2_square.png"
$squareBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$squareBmp.Dispose()
$src.Dispose()

Write-Output "Successfully saved square icon to $outPath"
