param(
  [string]$OutputPath,
  [ValidateSet("small", "large")]
  [string]$Variant = "small",
  [switch]$BuildAll
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRootPrefix = $projectRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
$distDir = Join-Path $projectRoot "dist"

$excludeNames = @(
  ".git",
  ".github",
  ".firebase",
  ".firebaserc",
  ".venv",
  "analysis_output",
  "dataconnect",
  "node_modules",
  "prepared_data",
  "scripts",
  "src",
  "tools",
  "serviceAccountKey.json",
  "firebase-debug.log",
  "firebase.json",
  "firestore.rules",
  "dist",
  ".package-staging",
  ".gitignore",
  "README.md",
  "DOCS.md",
  "package.json",
  "package-lock.json",
  "feedback.txt",
  "webpage.txt",
  "data_combined.json",
  "stage-idea-slop.txt",
  "Jira.csv",
  "404.html"
)

$excludePatterns = @(
  "*.zip",
  "*.csv",
  "*.txt",
  "*.ps1"
)

$smallOnlyRelativePaths = @(
  "imgs/home_button.clip",
  "imgs/fruits.clip",
  "imgs/chains.clip"
)

function Remove-PathIfExists {
  param(
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $item = Get-Item -LiteralPath $Path -Force
  if ($item.PSIsContainer) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  } else {
    Remove-Item -LiteralPath $Path -Force
  }
}

function Ensure-Directory {
  param(
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Test-IsExcludedRootItem {
  param(
    [System.IO.FileSystemInfo]$Item
  )

  if ($excludeNames -contains $Item.Name) {
    return $true
  }

  return [bool]($excludePatterns | Where-Object { $Item.Name -like $_ } | Select-Object -First 1)
}

function Test-ShouldExcludeRelativePath {
  param(
    [string]$RelativePath,
    [string]$VariantName
  )

  $normalized = ($RelativePath -replace '\\', '/').ToLowerInvariant()
  $fileName = [System.IO.Path]::GetFileName($normalized)

  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return $true
  }

  if ($fileName.StartsWith(".")) {
    return $true
  }

  if ($VariantName -ne "small") {
    return $false
  }

  return ($smallOnlyRelativePaths -contains $normalized)
}

function Get-PackageFiles {
  param(
    [string]$VariantName
  )

  $rootItems = Get-ChildItem -LiteralPath $projectRoot -Force | Where-Object {
    -not (Test-IsExcludedRootItem $_)
  }

  $packageFiles = New-Object System.Collections.Generic.List[object]

  foreach ($item in $rootItems) {
    if ($item.PSIsContainer) {
      $files = Get-ChildItem -LiteralPath $item.FullName -Recurse -File -Force | Where-Object {
        $relativePath = $_.FullName.Substring($projectRootPrefix.Length)
        (
          -not $_.Name.StartsWith(".") -and
          $_.FullName -notmatch '[\\/]\.' -and
          -not (Test-ShouldExcludeRelativePath $relativePath $VariantName)
        )
      }

      foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($projectRootPrefix.Length) -replace '\\', '/'
        $packageFiles.Add([PSCustomObject]@{
            FullName     = $file.FullName
            RelativePath = $relativePath
          })
      }
    } else {
      if (-not (Test-ShouldExcludeRelativePath $item.Name $VariantName)) {
        $packageFiles.Add([PSCustomObject]@{
            FullName     = $item.FullName
            RelativePath = $item.Name
          })
      }
    }
  }

  return $packageFiles
}

function Publish-ToDirectory {
  param(
    [System.Collections.IEnumerable]$Files,
    [string]$TargetDirectory
  )

  Remove-PathIfExists -Path $TargetDirectory
  Ensure-Directory -Path $TargetDirectory

  foreach ($file in $Files) {
    $destination = Join-Path $TargetDirectory $file.RelativePath
    $destinationParent = Split-Path -Parent $destination
    Ensure-Directory -Path $destinationParent
    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
  }
}

function Publish-ZipFromDirectory {
  param(
    [string]$SourceDirectory,
    [string]$ZipPath
  )

  Ensure-Directory -Path (Split-Path -Parent $ZipPath)
  Remove-PathIfExists -Path $ZipPath

  $zip = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    $sourcePrefix = $SourceDirectory.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $files = Get-ChildItem -LiteralPath $SourceDirectory -Recurse -File -Force
    foreach ($file in $files) {
      $entryName = $file.FullName.Substring($sourcePrefix.Length) -replace '\\', '/'
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip,
        $file.FullName,
        $entryName,
        [System.IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  } finally {
    $zip.Dispose()
  }
}

function Copy-Artifact {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  Remove-PathIfExists -Path $DestinationPath
  Ensure-Directory -Path (Split-Path -Parent $DestinationPath)

  $sourceItem = Get-Item -LiteralPath $SourcePath -Force
  if ($sourceItem.PSIsContainer) {
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Recurse -Force
  } else {
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
  }
}

function Build-StandardArtifacts {
  param(
    [string]$VariantName
  )

  $files = Get-PackageFiles -VariantName $VariantName
  $directoryName = "crazygames-$VariantName"
  $directoryPath = Join-Path $distDir $directoryName

  Publish-ToDirectory -Files $files -TargetDirectory $directoryPath

  $zipTargets = @(
    (Join-Path $projectRoot "gamejolt-$VariantName.zip"),
    (Join-Path $distDir "flash-recall-$VariantName.zip")
  )

  foreach ($zipTarget in $zipTargets) {
    Publish-ZipFromDirectory -SourceDirectory $directoryPath -ZipPath $zipTarget
  }

  if ($VariantName -eq "small") {
    Copy-Artifact -SourcePath $directoryPath -DestinationPath (Join-Path $distDir "crazygames")
    Copy-Artifact -SourcePath (Join-Path $projectRoot "gamejolt-small.zip") -DestinationPath (Join-Path $projectRoot "gamejolt.zip")
    Copy-Artifact -SourcePath (Join-Path $distDir "flash-recall-small.zip") -DestinationPath (Join-Path $distDir "flash-recall.zip")
  }

  return [PSCustomObject]@{
    Variant       = $VariantName
    DirectoryPath = $directoryPath
    ZipPaths      = $zipTargets
  }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not $PSBoundParameters.ContainsKey("OutputPath") -and -not $BuildAll) {
  $BuildAll = $true
}

if ($BuildAll) {
  Ensure-Directory -Path $distDir
  $results = @(
    Build-StandardArtifacts -VariantName "small"
    Build-StandardArtifacts -VariantName "large"
  )

  foreach ($result in $results) {
    Write-Host ("Built {0} CrazyGames folder: {1}" -f $result.Variant, $result.DirectoryPath)
    foreach ($zipPath in $result.ZipPaths) {
      Write-Host ("Built {0} zip: {1}" -f $result.Variant, $zipPath)
    }
  }

  Write-Host ("Updated compatibility aliases: {0}, {1}, {2}" -f `
      (Join-Path $distDir "crazygames"), `
      (Join-Path $projectRoot "gamejolt.zip"), `
      (Join-Path $distDir "flash-recall.zip"))
  return
}

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputPath))
$outputDirectory = Split-Path -Parent $resolvedOutput
Ensure-Directory -Path $outputDirectory

$customFiles = Get-PackageFiles -VariantName $Variant
$stagingDirectory = Join-Path $projectRoot ".package-staging\$Variant"
Publish-ToDirectory -Files $customFiles -TargetDirectory $stagingDirectory
Publish-ZipFromDirectory -SourceDirectory $stagingDirectory -ZipPath $resolvedOutput
Remove-PathIfExists -Path $stagingDirectory

Write-Host ("Created {0} package: {1}" -f $Variant, $resolvedOutput)
