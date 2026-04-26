$temp = "scratch/spec_temp"
$zip = "scratch/spec.zip"
if (Test-Path $temp) { Remove-Item -Recurse -Force $temp }
Copy-Item "QUEST_Master_Spec.docx" $zip -Force
Expand-Archive -Path $zip -DestinationPath $temp -Force
[xml]$doc = Get-Content (Join-Path $temp "word/document.xml")
$doc.document.body.InnerText
