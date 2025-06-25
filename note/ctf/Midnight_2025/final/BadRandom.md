You can download this challenge here : [RansomwareApp.7z](challenges/RansomwareApp.7z)

```
⚠️ WARNING:

THIS IS A FUNCTIONAL RANSOMWARE SAMPLE. DO NOT RUN OUTSIDE OF A SANDBOX.

An employee from the IT department, probably searching for a crack for Excel 2073, had the brilliant idea of executing badransom.exe from a shady network share. The result? All critical files on the machine are now encrypted. Fortunately, the ransomware developer seemed more inspired by YouTube tutorials than by actual cryptography research papers. Your mission: recover the encryption keys in order to decrypt the affected machines.

Archive password: Azerty+123

Flag format: MCTF{HEX_KEY:HEX_IV}
```

RansomwareApp.exe: PE32 executable (GUI) Intel 80386 Mono/.Net assembly, for MS Windows, 3 sections

Tool used : Dnspy / ILspy

First I opened it with ILspy in order to understand the workflow

![alt text](note/ctf/Midnight_2025/asset/Badrandom0.png)

The main is interesting, this is a typical loader that deciphers the array : Decrypt(array, 3531425751u);

and it loads it into memory :

```
byte[] array2 = (byte[])gCHandle.Target;
Module module = executingAssembly.LoadModule("koi", array2);
```

Let's see the decrypt function :

![alt text](note/ctf/Midnight_2025/asset/Badrandom1.png)

It looks interesting and it might be fun to reverse, but I got other plans! I only need the deciphered array that is returned after the decryption, how can I do that? Just set a breakpoint at the end of the Decrypt function that will allow me to dump the content of the array, and I can see that the array I needed to dump will be array4 :

![alt text](note/ctf/Midnight_2025/asset/Badrandom2.png)

I will use my Windows 10 VM with Dnspy in order to debug the ransomware (but stop it before the load of the ransomware!)

![alt text](note/ctf/Midnight_2025/asset/Badrandom3.png)

Now that I'm here, I can extract the array by just saving it as Ransomapp\_dump.bin :

![alt text](note/ctf/Midnight_2025/asset/Badrandom4.png)

If I do a `file` on this new file : `Ransomapp_dump.bin: PE32 executable (GUI) Intel 80386 Mono/.Net assembly, for MS Windows, 3 sections`

So we got the deciphered ransomware, let's get those keys! After some research using ILspy on this new binary :

![alt text](note/ctf/Midnight_2025/asset/Badrandom5.png)

I just found them hardcoded into the class CryptoUtils :

KEY : Xmy0nlyRegr3tsLockbitW0ntHir3MeX

IV : L3v3lIsInsan3Br0

So I just converted them into hex and it's flag : `MCTF{586d79306e6c79526567723374734c6f636b62697457306e74486972334d6558:4c3376336c4973496e73616e33427230}`