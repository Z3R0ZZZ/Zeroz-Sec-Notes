# Task 1: IP address of Forela-Wkstn001

Using Network Miner I find: `172.17.79.129 [Forela-Wkstn001] [Forela-Wkstn001.forela.local] [FORELA-WKSTN001] [Forela-Wkstn001.local] (Windows)`

# Task 2: IP address of Forela-Wkstn002

Same method: `172.17.79.136 [FORELA-WKSTN002] (Windows)`

# Task 3: Which user had their hash stolen?

The username is `arthur.kyle` (seen in credentials via Network Miner)

# Task 4: IP address of the attacker’s machine

Same approach, looking for an unknown machine: `172.17.79.135 [E9OGH1DCE] [D.local] [D] [FORELA-WKSTN002] [d.local] [d] (Other)`

# Task 5: Name of the share

In the requests, I look for a Tree Connect request from the victim’s machine. Request 1418 matches:

`1418	112.565902	172.17.79.136	172.17.79.4	SMB2	152		Tree Connect Request Tree: \\DC01\Trip`

Also, many requests attempt access to this share, which confirms the lead.
**The share:** `\\DC01\Trip`

# Task 6/7: Source port used for the logon + logon ID

To find this, I search in the `security.evtx` file for an event with ID 4624 (successful authentication).
I find the following:

* **Port:** `40252`
* **Logon ID:** `0x64a799`
  (from `<Data Name="TargetLogonId">0x000000000064a799</Data>`)

# Task 8: IP and hostname of the machine that initiated the connection

Still in the same event:

* **IP address:** `172.17.79.135`
* **Machine name:** `FORELA-WKSTN002`

# Task 9: Logon timestamp

From the same event: `2024-07-31 04:55:16`

# Task 10: Share accessed by the malicious tool

I look for event ID `5140` (network share access):

* **Share name:** `\\*\IPC$`
* **User:** `arthur.kyle`
* **IP address:** `172.17.79.135`
* **Port:** `40252`
* **Logon ID:** `0x64a799`
* **Timestamp:** `2024-07-31 04:55:16.243324`