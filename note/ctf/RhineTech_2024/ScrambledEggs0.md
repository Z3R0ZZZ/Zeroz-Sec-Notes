For this challenge, which looks like a flag validator, the objective was to find the real flag.

You can download this challenge here : [scrambled_eggs_0](challenges/scrambled_eggs_0)

When we launch it via CLI, we are asked to enter a flag:

```bash
./scrambled_eggs_0
Please enter the flag !
```

If we are wrong, the program prints: `Please retry !` and launches a sleep.

Let’s reverse this!

## Analyzing the workflow:

When analyzing the binary, we find the main function (we can also tell it was written in Rust): `scrambled_eggs_0::main::h22e4220587d99ce1`

There are two ways to get the flag (there are probably more ways to solve it, but these are the two I found):

1. Catch the flag while it is being generated (tricky)

2. Catch the flag at the final comparison (easy)

## 1: Catch the flag while it is being generated

To do that, we need to understand where the flag is generated.

The best candidate is here:

```
0000555555408282      if (var_108_1 != 0)
0000555555408288          char* rbx_1 = var_110_1
0000555555408290          void* r15_1 = var_108_1 + rbx_1
000055555540829b          void* rbp_1 = nullptr
000055555540829b          
00005555554082a6          do
🛑=>00005555554082ac              uint32_t rax_8 = zx.d(*rbx_1)
00005555554082ac              
00005555554082b1              if (rax_8.b s>= 0)
00005555554082b3                  rbx_1 = &rbx_1[1]
00005555554082b3                  
00005555554082b9                  if (rbp_1 u< var_108 - 1)
0000555555408324                      label_555555408324:
0000555555408324                      
0000555555408328                      if (rbp_1 u> -3)
0000555555408677                          core::str::slice_error_fail::h402ef64b20c243ef(var_110, var_108, rbp_1, rbp_1 + 2)
0000555555408677                          noreturn
0000555555408677                      
0000555555408331                      if (rbp_1 != 0)
0000555555408336                          if (rbp_1 u>= var_108)
0000555555408348                              if (rbp_1 != var_108)
0000555555408677                                  core::str::slice_error_fail::h402ef64b20c243ef(var_110, var_108, rbp_1, rbp_1 + 2)
0000555555408677                                  noreturn
0000555555408336                          else if (*(var_110 + rbp_1) s<= 0xbf)
0000555555408677                              core::str::slice_error_fail::h402ef64b20c243ef(var_110, var_108, rbp_1, rbp_1 + 2)
0000555555408677                              noreturn
0000555555408677                      
0000555555408351                      if (rbp_1 + 2 u>= var_108)
0000555555408373                          if (var_108 - 2 != rbp_1)
0000555555408677                              core::str::slice_error_fail::h402ef64b20c243ef(var_110, var_108, rbp_1, rbp_1 + 2)
0000555555408677                              noreturn
0000555555408351                      else if (*(var_110 + rbp_1 + 2) s<= 0xbf)
0000555555408677                          core::str::slice_error_fail::h402ef64b20c243ef(var_110, var_108, rbp_1, rbp_1 + 2)
0000555555408677                          noreturn
0000555555408677                      
0000555555408387                      int64_t rax_14 = core::num::_$LT$impl$u20...$u32$GT$::from_str::hcb16b30e8490ab70(var_110 + rbp_1, 2)
0000555555408387                      
000055555540838f                      if ((rax_14.b & 1) != 0)
0000555555408682                          var_f8.b = rax_14:1.b
00005555554086a5                          core::result::unwrap_failed::hfa79a499befff387("called `Result::unwrap()` on an …", 0x2b, &var_f8)
00005555554086a5                          noreturn
00005555554086a5                      
0000555555408395                      uint64_t rax_15 = rax_14 u>> 0x20
00005555554083aa                      int32_t rax_16 = rax_15.d - ((rax_15 * 0x38e38e39) u>> 0x23).d * 0x24
00005555554083b3                      int32_t rsi_6 = rax_16 + 0x57
00005555554083b3                      
00005555554083b8                      if (rax_16.b u< 0xa)
00005555554083b8                          rsi_6 = rax_16 | 0x30
```

A lot of operations are done to `rax_8`, so it might be interesting to know what's going on, so I place a breakpoint.

Why here? `🛑=>00005555554082ac uint32_t rax_8 = zx.d(*rbx_1)`

This line is the very first step of each iteration in the loop that parses an input character-by-character (not our input because we do not enter it yet).

It's where the code begins to analyze each byte to determine whether it's a valid UTF-8 sequence or a pair of ASCII digits (e.g., "17", "25").

I placed the breakpoint here because it's just before the input is decoded and transformed into a character that may be added to the flag.

When I hit this breakpoint, the flag buffer has already started to be constructed, and `rax` often points to that buffer. This makes it a convenient spot to inspect the current state of the generated flag — even though `rax_8` at this point contains only a raw input byte, not yet a flag character.

Let’s see what we got:

![alt text](note/ctf/RhineTech_2024/asset/ScrambleEggs0_0.png)

We can see that `rax` contains this chain: `16242325261232125464546464645464564644`

This will be processed to generate the flag! Let’s see another loop iteration:

![alt text](note/ctf/RhineTech_2024/asset/ScrambleEggs0_1.png)

We will be able to catch the flag!

![alt text](note/ctf/RhineTech_2024/asset/ScrambleEggs0_2.png)

But this method takes some time and it was quite complicated to find the perfect point to dump this. However, there is a simpler way to flag this!

## 2: Catch the flag at the final comparison

We can simply go here:

```
00008560      if (var_a8 + 1 != var_38)
0000857f          label_857f:
0000857f          var_f8 = &data_257270
00008584          int64_t var_f0_2 = 1
0000858d          int64_t var_e8_4 = 8
00008599          int128_t var_e0_1 = zx.o(0)
000085a3          std::io::stdio::_print::h47fcac1e810b43ce(&var_f8)
000085b0          result = std::thread::sleep::h34f2e5f5d74bd6b5(0xa, 0)
00008560      else
🛑00008572          if (bcmp(rax_4, var_40, var_38) != 0)
00008572              goto label_857f
```

But for some reason, this comparison `if (var_a8 + 1 != var_38)` will stop us from reaching `if (bcmp(rax_4, var_40, var_38) != 0)`. No problem, we just patch it (while debugging: right-click => Patch => invert branch).

PS: If the main function goes to undefined while debugging (sometimes it happens with Binary Ninja), you need to place a breakpoint right before `if (var_a8 + 1 != var_38)` (restart binary ninja and make sure to do it before launching the debug). This allows you to go into the `sub_555555408540` which is basically the code shown before and the logic is the same:

```
0000555555408540  void* sub_555555408540(int64_t arg1, int64_t arg2, int64_t arg3, int64_t arg4, 
0000555555408540      int64_t arg5, int64_t arg6, int64_t arg7, int64_t arg8, int64_t arg9, 
0000555555408540      uint64_t arg10, int64_t arg11, int64_t arg12, int64_t arg13, int64_t arg14, 
0000555555408540      int64_t arg15, int64_t arg16)

0000555555408560      void* result
0000555555408560      
0000555555408560      if (arg6 != arg10) # apply the same patch logic here! (right-click => Patch => invert branch)
000055555540857f          label_55555540857f:
000055555540857f          arg_30 = &data_555555657270
0000555555408584          arg_38 = 1
000055555540858d          arg_40 = 8
0000555555408599          arg_48 = zx.o(0)
00005555554085a3          std::io::stdio::_print::h47fcac1e810b43ce(&arg_30)
00005555554085b0          result = std::thread::sleep::h34f2e5f5d74bd6b5()
0000555555408560      else
🛑=>0000555555408572          if (bcmp(arg5, arg9, arg10) != 0)
0000555555408572              goto label_55555540857f
0000555555408572          
0000555555408636          arg_30 = &data_555555657280
000055555540863b          arg_38 = 1
0000555555408644          arg_40 = 8
0000555555408650          arg_48 = zx.o(0)
000055555540865a          result = std::io::stdio::_print::h47fcac1e810b43ce(&arg_30)
000055555540865a      
00005555554085b9      if (arg8 != 0)
00005555554085c6          result = __rust_dealloc(mem: arg9)
00005555554085c6      
00005555554085d4      if (arg1 != 0)
00005555554085e0          result = __rust_dealloc(mem: arg2)
00005555554085e0      
00005555554085ee      if (arg4 != 0)
00005555554085fa          result = __rust_dealloc(mem: arg5)
00005555554085fa      
000055555540860b      if (arg7 == 0)
000055555540862e          return result
000055555540862e      
0000555555408617      return __rust_dealloc(mem: arg3)
```

Keep in mind that our main goal is to reach `bcmp`.

After reaching this:

![alt text](note/ctf/RhineTech_2024/asset/ScrambleEggs0_3.png)

We can see the comparison and the correct flag!
