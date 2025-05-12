Link for this challenge : https://app.hackthebox.com/challenges/114

`Bypass.exe: PE32 executable (console) Intel 80386 Mono/.Net assembly, for MS Windows, 3 sections`

**Tool used: DnSpy 32**

As the name suggests, we need to bypass some conditions. When running the code, we’re presented with a classic authentication prompt:

![alt text](note/ctf/HTB/reverse/asset/Bypassexe1.png)

I begin reversing:
![alt text](note/ctf/HTB/reverse/asset/Bypassexe2.png)

I immediately notice a boolean `flag` that must be set to `true` to proceed to function 2. To avoid wasting time, I’ll adopt a dynamic strategy and debug step by step to bypass certain conditions and retrieve values of interest (This allow me to not waste time on static analysis since this challenge is pretty small) :

![alt text](note/ctf/HTB/reverse/asset/Bypassexe3.png)

I see that `flag` is set to `false`, so I patch it and set it to `true` (F2 on `flag`, I do this for both instances).

I reach function 2:
![alt text](note/ctf/HTB/reverse/asset/Bypassexe4.png)

I observe some very interesting things! A `null` value `b` (probably useful later), another `false` flag, and `ThisIsAReallyReallySecureKeyButYouCanReadItFromSourceSoItSucks`, so there might be some encryption? I’ll switch the flag back to `true`:

![alt text](note/ctf/HTB/reverse/asset/Bypassexe5.png)

So the key is potentially used to move to the next step?

I proceed and the program stops, but I didn’t manage to retrieve the flag? No problem, there’s a trick! I restart and make sure to stop here in function 2:

![alt text](note/ctf/HTB/reverse/asset/Bypassexe5_1.png)

I click on the *Step Into* option which will let me dive deeper into this `Write` call and, more importantly, see what’s about to happen:

![alt text](note/ctf/HTB/reverse/asset/Bypassexe6.png)

And I get the flag!
**HTB{SuP3rC00lFL4g}**
