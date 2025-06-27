You can download this challenge here : [neuronet.exe](challenges/neuronet.exe)

```
A military artificial intelligence, deactivated since the Great Cyber Outage of 2069, has mysteriously reactivated a connection terminal. This terminal, called NeuroNet, is requesting an access key. Your mission, should you choose to accept it, is to gain access to the terminal and retrieve the classified data. — Jim Phelps
```

neuronet.exe: PE32+ executable (console) x86-64 (stripped to external PDB), for MS Windows, 10 sections

tool used : IDA and Binary Ninja

Let's analyse the main with Binary Ninja, however, it might not always appear as main for some reason (due to my Binary Ninja I guess...) so I need to find it. I will find it by looking into the .rdata section, I might be able to find some text that is contained in the main function and that is printed when I execute this binary.

And I found it : `140008658  char const data\_140008658\[0x49] = "\[FATAL ERROR] Quantum entanglement failed. Neural interface unavailable.", 0`

This leads me to the sub\_140005bc0 function by using cross-references in Binary Ninja, which is the main function!

By analysing it we can see important things!

## The functions called (most interesting ones)

I can see different functions that are being called in this main. Let's quickly dive into it:

#### sub\_1400017e0() :

This function is an anti-debugging system. I can clearly identify it here :

```
140001814      BOOL result = IsDebuggerPresent()
140001814      
14000181c      if (result == 0)
140001823          return result
140001823      
140001839      std::ostream* rax = std::__ostream_insert<char>(std::cout, data_14000c0e0, data_14000c0e8)
140001851      std::__ostream_insert<char>(rax, "[SECURITY BREACH] Debugging dete…", 0x34)
```

So I might need to bypass it?

#### sub\_140001bb0() :

It only prints the ASCII art and the first messages.

#### sub\_140003530() :

This one is pretty interesting, it's the hashing function that the binary explains: `1400085a0  char const data_1400085a0[0x4a] = "Key generation algorithm: HASH(NetworkMAC + VolumeID + TimeWindow + Seed)", 0`

I will keep it in mind!

#### sub\_140002670() :

That's the function that allows the user to enter the key.

#### sub\_140004010() :

This is the flag generation:

```
140004289              if (0x3fffffffffffffff - var_60_2 u<= 4)
1400044ca                  std::__throw_length_error(what: "basic_string::append")
1400044ca                  noreturn
1400044ca              
14000429f              std::string::_M_append(&var_68, "MCTF{")
14000429f              
1400042b6              if (0x3fffffffffffffff - var_60_2 u< var_80_1)
1400044fa                  std::__throw_length_error(what: "basic_string::append")
1400044fa                  noreturn
1400044fa              
1400042c5              std::string::_M_append(&var_68, r15)
1400042c5              
1400042d9              if (var_60_2 == 0x3fffffffffffffff)
1400044bc                  std::__throw_length_error(what: "basic_string::append")
1400044bc                  noreturn
```

## How to obtain the flag?

```
140005bfa      if (var_a0 == 0)
140006107          std::ostream* rax_29 = std::__ostream_insert<char>(std::cout, data_14000c0e0, data_14000c0e8)
14000611f          std::__ostream_insert<char>(rax_29, "[FATAL ERROR] Quantum entangleme…", 0x48)
14000613d          sub_140001480(std::__ostream_insert<char>(rax_29, data_14000c0a0, data_14000c0a8))
140006153          std::ostream* rax_31 = std::__ostream_insert<char>(std::cout, data_14000c0e0, data_14000c0e8)
14000616b          std::__ostream_insert<char>(rax_31, "[SYSTEM] Please ensure your cybe…", 0x47)
140006189          sub_140001480(std::__ostream_insert<char>(rax_31, data_14000c0a0, data_14000c0a8))
14000618e          rbx_1 = 1
140005bfa      else
140005c00          sub_140002670()
140005c18          uint64_t _Size = 0
140005c23          char var_78
140005c23          char* _Buf1 = &var_78
140005c28          var_78 = 0
140005c2d          std::operator>><char>(std::cin, &_Buf1)
140005c32          sub_1400017e0()
140005c32          
140005c41          if (_Size == var_a0)
140005db9              if (_Size != 0 && memcmp(_Buf1, _Buf2, _Size) != 0)
140005dcc                  goto label_140005c5f
140005dcc              
140005ddd              char* var_68
140005ddd              sub_140004010(&var_68, &_Buf2)
140005de8              int64_t var_60
140005de8              std::ostream* rdi_10
140005de8              
140005de8              if (var_60 == 0)
1400060a7                  label_1400060a7:
1400060a7                  std::ostream* rax_27 = std::__ostream_insert<char>(std::cout, data_14000c0e0, data_14000c0e8)
1400060bc                  rdi_10 = rax_27
1400060bf                  std::__ostream_insert<char>(rax_27, "\n[SECURITY ERROR] Quantum authe…", 0x4c)
140005de8              else
140005dfb                  if (sub_140004530(&var_68) == 0)
140005dfb                      goto label_1400060a7
140005dfb                  
140005e19                  std::ostream* rax_12 = std::__ostream_insert<char>(std::cout, data_14000c120, data_14000c128)
140005e31                  std::__ostream_insert<char>(rax_12, "\n[QUANTUM SYNC SUCCESSFUL] Neur…", 0x38)
140005e4f                  sub_140001480(std::__ostream_insert<char>(rax_12, data_14000c0a0, data_14000c0a8))
140005e65                  std::ostream* rax_14 = std::__ostream_insert<char>(std::cout, data_14000c140, data_14000c148)
140005e7d                  std::__ostream_insert<char>(rax_14, "[DATA STREAM] Generating classif…", 0x2e)
140005e9b                  sub_140001480(std::__ostream_insert<char>(rax_14, data_14000c0a0, data_14000c0a8))
140005ea7                  int32_t i_1 = 3
140005ef4                  int32_t i
```

There are 3 essential conditions (`if (var_a0 == 0)` will not bother me)

* if (\_Size == var\_a0)

* if (\_Size != 0 && memcmp(\_Buf1, \_Buf2, \_Size) != 0)

* if (var\_60 == 0)

And label\_140005c5f corresponds to an error so I must avoid it.

## The solve

Okay so I know that I need to predict a hash, in order to decipher the flag and be able to see it. This is feasible, but isn't there an easier way? Well yes, there is one. I analysed those 3 conditions earlier, what if I invert them all? Like that, I can enter basically anything and it will give me the flag! Let's try it out!

I will patch it with IDA, but before I save the address of those conditions in order to jump to them in IDA:

* if (\_Size == var\_a0) => 0x140005c41

* if (\_Size != 0 && memcmp(\_Buf1, \_Buf2, \_Size) != 0) => 0x140005db9

* if (var\_60 == 0) => 0x140005de8

![alt text](note/ctf/Midnight_2025/asset/neuronet0.png)

This is our 3 conditions:

* 1 : jz needs to become jnz

* 2 : jz needs to become jnz

* 3 : jnz needs to become jz

In order to do that we can use the Edit/Patch Program/Change byte from IDA while selecting the instruction:

![alt text](note/ctf/Midnight_2025/asset/neuronet1.png)

Then I need to change the right byte in order to invert it:

![alt text](note/ctf/Midnight_2025/asset/neuronet2.png)

Here I need to change `0F 84` to `0F 85`

For the second one:

![alt text](note/ctf/Midnight_2025/asset/neuronet3.png)

I need to change `74` to `75`

And for the last condition:

![alt text](note/ctf/Midnight_2025/asset/neuronet4.png)

I need to change `0F 85` to `0F 84`

When it's done it should look like this:

![alt text](note/ctf/Midnight_2025/asset/neuronet5.png)

Now I apply changes in the Edit/Patch Program/Apply patches to input file tool of IDA and I run it!

![alt text](note/ctf/Midnight_2025/asset/neuronet6.png)

As you can see, I typed: I Patched this!

And it gives me the flag: MCTF{dYn4m1c\_Qu4n7uM\_P455w0rd\_M45t3ry!}
