param(
  [int]$From = 106001,
  [int]$To = 106096,
  [string]$Out = "tools\sheets\sheet.png",
  [int]$Cell = 76
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = 'C:\ugc\ClientUIAnimationEditor\site\ugc-tool-data\Public\CustomUIImage\sprite'
$cols = 12
$items = @()
for ($i = $From; $i -le $To; $i++) {
  $p = Join-Path $root ("$i.png")
  if (Test-Path $p) { $items += [pscustomobject]@{ Id = $i; Path = $p } }
}
$rows = [math]::Ceiling($items.Count / $cols)
$labelH = 14
$bmp = New-Object System.Drawing.Bitmap ($cols * $Cell), ($rows * ($Cell + $labelH))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 40, 44, 52))
$font = New-Object System.Drawing.Font('Consolas', 7)
$white = [System.Drawing.Brushes]::White
for ($k = 0; $k -lt $items.Count; $k++) {
  $cx = ($k % $cols) * $Cell
  $cy = [math]::Floor($k / $cols) * ($Cell + $labelH)
  try {
    $img = [System.Drawing.Image]::FromFile($items[$k].Path)
    $side = [math]::Min($img.Width, $img.Height)
    $scale = [math]::Min(($Cell - 6) / $img.Width, ($Cell - 6) / $img.Height)
    $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
    $g.DrawImage($img, ($cx + [int](($Cell - $w) / 2)), ($cy + [int](($Cell - $h) / 2)), $w, $h)
    $img.Dispose()
  } catch {}
  $g.DrawString([string]$items[$k].Id, $font, $white, $cx + 2, $cy + $Cell)
}
$g.Dispose()
$dir = Split-Path $Out -Parent
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "saved $Out ($($items.Count) items)"
