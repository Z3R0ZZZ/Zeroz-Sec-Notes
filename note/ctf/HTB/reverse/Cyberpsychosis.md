![https://app.hackthebox.com/challenges/536](https://app.hackthebox.com/challenges/536)

I immediately notice the README provided with the injected library. I decide to search for **“Diamorphine github”** and I find [Diamorphine](https://github.com/m0nad/Diamorphine).

There I also see the instructions for shutdown. I connect to the instance with:

```bash
nc -nv 94.237.59.174 58293
```

and try the shutdown commands:

```bash
kill -63 0
rmmod diamorphine
```

but it crashes with `kill -63 0`, so the attacker probably modified the code. I open it in **Binary Ninja** to look for the killswitch.

I find it here:

```
00000280  int64_t hacked_kill()

00000280      void* rdi_6 = __fentry__()
0000028b      int32_t rax = (*(rdi_6 + 0x68)).d
0000028b      
00000296      if (rax == 0x2e)
00000348          if (module_hidden != 0)
0000034a              uint64_t module_previous_1 = module_previous
00000354              void* rdx_5 = *module_previous_1
00000357              *(rdx_5 + 8) = 0x10d8
0000035f              data_10d8 = rdx_5
00000368              data_10e0 = module_previous_1
0000036f              module_hidden = 0
00000376              *module_previous_1 = 0x10d8
00000385              return __x86_return_thunk() __tailcall
00000385          
000003ad          uint64_t rax_15 = data_10e0
000003b4          void* rdx_8 = data_10d8
000003be          *(rdx_8 + 8) = rax_15
000003c2          module_previous = rax_15
000003c9          *rax_15 = rdx_8
000003d6          data_10d8 = -0x2152ffffffffff00
000003e1          data_10e0 = -0x2152fffffffffede
000003ed          module_hidden = 1
00000296      else if (rax == 0x40)
000002fe          int64_t rax_8 = prepare_creds()
000002fe          
0000030c          if (rax_8 != 0)
0000030e              __builtin_memset(s: rax_8 + 4, c: 0, n: 0x20)
0000032e              commit_creds(rax_8)
0000033b              return __x86_return_thunk() __tailcall
0000029f      else
000002a1          void* const rdx_1 = init_task
000002a1          
000002ab          if (rax == 0x1f)
000002d5              while (true)
000002d5                  void* rax_5 = *(rdx_1 + 0x8b8)
000002dc                  rdx_1 = rax_5 - 0x8b8
000002dc                  
000002e9                  if (rax_5 == (init_task + 0x8b8))
000002e9                      break
000002e9                  
000002cf                  if ((*(rdi_6 + 0x70)).d == *(rax_5 + 0x108))
0000038d                      if (rdx_1 == 0)
0000038d                          break
0000038d                      
00000393                      *(rax_5 - 0x88c) ^= 0x10000000
000003a8                      return __x86_return_thunk() __tailcall
000003a8              
000002f9              return __x86_return_thunk() __tailcall
000002f9          
000002ad          orig_kill
000002b4          __x86_indirect_thunk_rax()
000002b4      
000002c4      return __x86_return_thunk() __tailcall
```

## Analysis

```
00000296      if (rax == 0x2e)
00000348          if (module_hidden != 0)
0000034a              uint64_t module_previous_1 = module_previous
00000354              void* rdx_5 = *module_previous_1
00000357              *(rdx_5 + 8) = 0x10d8
0000035f              data_10d8 = rdx_5
00000368              data_10e0 = module_previous_1
0000036f              module_hidden = 0
00000376              *module_previous_1 = 0x10d8
00000385              return __x86_return_thunk() __tailcall
00000385          
000003ad          uint64_t rax_15 = data_10e0
000003b4          void* rdx_8 = data_10d8
000003be          *(rdx_8 + 8) = rax_15
000003c2          module_previous = rax_15
000003c9          *rax_15 = rdx_8
000003d6          data_10d8 = -0x2152ffffffffff00
000003e1          data_10e0 = -0x2152fffffffffede
000003ed          module_hidden = 1
```

This block corresponds to toggling the module visibility (**hide/unhide the kernel module**) when calling:

```
kill -46 0
```

---

```
00000296      else if (rax == 0x40)
000002fe          int64_t rax_8 = prepare_creds()
000002fe          
0000030c          if (rax_8 != 0)
0000030e              __builtin_memset(s: rax_8 + 4, c: 0, n: 0x20)
0000032e              commit_creds(rax_8)
0000033b              return __x86_return_thunk() __tailcall
```

This block corresponds to **privilege escalation to root** via:

```
kill -64 0
```

---

```
000002ab          if (rax == 0x1f)
000002d5              while (true)
000002d5                  void* rax_5 = *(rdx_1 + 0x8b8)
000002dc                  rdx_1 = rax_5 - 0x8b8
000002dc                  
000002e9                  if (rax_5 == (init_task + 0x8b8))
000002e9                      break
000002e9                  
000002cf                  if ((*(rdi_6 + 0x70)).d == *(rax_5 + 0x108))
0000038d                      if (rdx_1 == 0)
0000038d                          break
0000038d                      
00000393                      *(rax_5 - 0x88c) ^= 0x10000000
000003a8                      return __x86_return_thunk() __tailcall
000003a8              
000002f9              return __x86_return_thunk() __tailcall
000002f9          
000002ad          orig_kill
000002b4          __x86_indirect_thunk_rax()
```

This block corresponds to **hiding/unhiding a specific process** via:

```
kill -31 <pid>
```

### Plan of Action

1. **Escalate privileges to root**:

```bash
kill -64 0
```

2. **Make the module visible again**:

```bash
kill -46 0
```

3. **Unload the malicious module**:

```bash
rmmod diamorphine
```

You can check if it’s gone with:

```bash
lsmod | grep diamorphine
```

which should return nothing.

### Final Step

Search for the flag:

```bash
find / -name flag.txt 2>/dev/null
```

and I find it at:

```
/opt/psychosis/flag.txt
```

```
HTB{N0w_Y0u_C4n_S33_m3_4nd_th3_r00tk1t_h4s_b33n_sUcc3ssfully_d3f34t3d!!}
```