https://app.hackthebox.com/challenges/746

This scenario strongly suggests the presence of a **userland rootkit** — malicious software that modifies or intercepts system calls at the user-space level to **hide files, processes, or connections**, usually by altering shared libraries (`libc`, `ld.so`, etc.) or via `LD_PRELOAD`.

To verify, I check for suspicious library linking errors:

```bash
ldd /usr/sbin/sshd
```

And I find a very suspicious file:

```
/lib/x86_64-linux-gnu/libc.hook.so.6
```

Upon analysis, this is indeed the rootkit, and it hides the folder pr3l04d_:

![alt text](note/ctf/asset/HTB_sus_threat.png)

I remove it by moving it into `/tmp`:

```bash
mv /lib/x86_64-linux-gnu/libc.hook.so.6 /tmp
```

Then I search for the hidden folder:

```bash
find / -name pr3l04d_ 2>/dev/null
/var/pr3l04d_
```

I explore the directory:

```bash
cd /var/pr3l04d_
ls
ERROR: ld.so: object '/lib/x86_64-linux-gnu/libc.hook.so.6' from /etc/ld.so.preload cannot be preloaded (cannot open shared object file): ignored.
flag.txt
```

Finally, I read the flag:

```bash
cat flag.txt
ERROR: ld.so: object '/lib/x86_64-linux-gnu/libc.hook.so.6' from /etc/ld.so.preload cannot be preloaded (cannot open shared object file): ignored.
HTB{Us3rL4nd_R00tK1t_R3m0v3dd!}
```