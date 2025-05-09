https://app.hackthebox.com/sherlocks/Loggy

# Task 1: SHA256 hash

`sha256sum Loggy.exe => 6acd8a362def62034cbd011e6632ba5120196e2011c83dc6045fcb28b590457c`

# Task 2: Language and its version

By analyzing with Ghidra, I find that the malware is written in Golang version 1.22.3.

# Task 3: GitHub used for exfiltration

I find the package github.com/jlaffaye/ftp which is used for exfiltration.

# Task 4: GitHub repo simulating screenshot capture

The package [https://github.com/kbinani/screenshot](https://github.com/kbinani/screenshot) is used for taking screenshots.

# Task 5: Function call that produces a file after execution

The call to the WriteFile function is the suspicious one.

# Task 6: Data transfer domain

I find `main.sendFilesViaFTP` and deduce that the name must be used here:
![alt text](note/ctf/HTB/Sherlock/asset/Loggy1.png)

I notice `github.com/jlaffaye/ftp::github.com/jlaffaye/ftp.Dial(sVar9, options)` which initiates communication with `sVar9`.

By analyzing `sVar9`, I find the corresponding string: gotthem.htb

# Task 7: Hacker's credentials

I look into the `main.sendFilesViaFTP` function and find something interesting:

![alt text](note/ctf/HTB/Sherlock/asset/Loggy2.png)

I find that the password length is 17 and the username length is 11.

I count the number of characters in the corresponding strings and get the credentials:

NottaHacker\:Cle\@rtextP\@ssword

# Task 8: File being written continuously

I find a file opened with `os::os.Openfile` and assume it is very likely this one: keylog.txt