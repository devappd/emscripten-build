echo @"
########################################################################
# Install Chocolatey and deps
########################################################################
"@

Start-Process -FilePath 'choco' -ArgumentList ('install','python','--version','3.9.0','-y') -Wait -NoNewWindow
Start-Process -FilePath 'choco' -ArgumentList ('install','pip','-y') -Wait -NoNewWindow

$ourPATH  =  "C:\Python39"
$ourPATH += ";C:\Python39\Scripts"

$env:PATH = "$ourPATH;$env:PATH"

# Install root certificates so that emsdk downloading will work
# See https://github.com/emscripten-core/emscripten/issues/9036
# See cert links from https://pki.goog/repository

$certFile = New-TemporaryFile
Invoke-WebRequest -Uri "https://pki.goog/repo/certs/gsr2.pem" -UseBasicParsing -OutFile $certFile.FullName
Import-Certificate -FilePath $certFile.FullName -CertStoreLocation Cert:\LocalMachine\Root

# In case the above does not work, try this too

Start-Process -FilePath 'pip' -ArgumentList ('install','certifi') -Wait -NoNewWindow
$certifiPath = & 'python' -c 'import certifi; print(certifi.where())' | Out-String
Import-Certificate -FilePath "$certifiPath" -CertStoreLocation Cert:\LocalMachine\Root
