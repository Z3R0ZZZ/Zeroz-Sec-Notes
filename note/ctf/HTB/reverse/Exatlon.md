https://app.hackthebox.com/challenges/121

`exatlon_v1`: ELF 64-bit LSB executable, x86-64, version 1 (GNU/Linux), statically linked, no section header

Since reversing gives nothing at first glance, I check whether it has been packed:

```bash
strings -a exatlon_v1 | grep -i packed
$Info: This file is packed with the UPX executable packer http://upx.sf.net $
```

Ok, so I need to unpack it:

```bash
upx -d exatlon_v1
                       Ultimate Packer for eXecutables
                          Copyright (C) 1996 - 2024
UPX 4.2.4       Markus Oberhumer, Laszlo Molnar & John Reiser    May 9th 2024

        File size         Ratio      Format      Name
   --------------------   ------   -----------   -----------
   2210504 <-    709524   32.10%   linux/amd64   exatlon_v1

Unpacked 1 file.
```

I find the `main` function:

```cpp
int __fastcall main(int argc, const char **argv, const char **envp)
{
  int v3; // r12d
  __int64 v4; // rdx
  __int64 v5; // rdx
  __int64 v6; // rdx
  __int64 v7; // rdx
  __int64 v8; // rdx
  __int64 v9; // rdx
  __int64 v10; // rdx
  char v11; // bl
  __int64 v12; // rdx
  std::ostream *v13; // rax
  int v14; // ebx
  __int64 v15; // rdx
  std::ostream *v16; // rax
  char v18[32]; // [rsp+0h] [rbp-50h] BYREF
  char v19[48]; // [rsp+20h] [rbp-30h] BYREF

  do
  {
    std::operator<<<std::char_traits<char>>(&std::cout, &unk_54B00F, envp);
    std::operator<<<std::char_traits<char>>(&std::cout, &unk_54B018, v4);
    std::operator<<<std::char_traits<char>>(&std::cout, &unk_54B0D8, v5);
    sleep(1LL);
    std::operator<<<std::char_traits<char>>(&std::cout, &unk_54B1A8, v6);
    std::operator<<<std::char_traits<char>>(&std::cout, &unk_54B260, v7);
    sleep(1LL);
    std::operator<<<std::char_traits<char>>(&std::cout, &unk_54B320, v8);
    sleep(1LL);
    std::operator<<<std::char_traits<char>>(&std::cout, &unk_54B400, v9);
    sleep(1LL);
    std::string::basic_string(v18);
    std::operator<<<std::char_traits<char>>(&std::cout, "[+] Enter Exatlon Password  : ", v10);
    std::operator>><char>(&std::cin, v18);
    exatlon(v19, v18);
    v11 = std::operator==<char>(
            v19,
            "1152 1344 1056 1968 1728 816 1648 784 1584 816 1728 1520 1840 1664 784 1632 1856 1520 1728 816 1632 1856 152"
            "0 784 1760 1840 1824 816 1584 1856 784 1776 1760 528 528 2000 ");
    std::string::~string(v19);
    if ( v11 )
    {
      v13 = (std::ostream *)std::operator<<<std::char_traits<char>>(&std::cout, "[+] Looks Good ^_^ \n\n\n", v12);
      std::endl<char,std::char_traits<char>>(v13);
      v3 = 0;
      v14 = 0;
    }
    else if ( (unsigned __int8)std::operator==<char>(v18, "q") )
    {
      v3 = 0;
      v14 = 0;
    }
    else
    {
      v16 = (std::ostream *)std::operator<<<std::char_traits<char>>(&std::cout, "[-] ;(\n", v15);
      std::endl<char,std::char_traits<char>>(v16);
      v14 = 1;
    }
    std::string::~string(v18);
  }
  while ( v14 == 1 );
  return v3;
}
```

And I also find the function `exatlon`:

```cpp
__int64 __fastcall exatlon(__int64 a1, __int64 a2)
{
  ...
  while (...)
  {
    v8 = *(_BYTE *)__gnu_cxx::__normal_iterator<char const*,std::string>::operator*(&v4);
    std::to_string((std::__cxx11 *)v7, 16 * v8);
    std::operator+<char>(v6, v7, &unk_54B00D);
    std::string::operator+=(a1, v6);
    ...
  }
  return a1;
}
```

### Logic

* Our input string is passed into `exatlon`.
* Each character (ASCII code) is taken one by one.
* It is multiplied by **16** and appended as a string of numbers.
* Finally, this transformed string is compared to the following value:

```
"1152 1344 1056 1968 1728 816 1648 784 1584 816 1728 1520 1840 1664 784 1632 1856 1520 1728 816 1632 1856 1520 784 1760 1840 1824 816 1584 1856 784 1776 1760 528 528 2000"
```

So to recover the password:

1. Split this sequence of numbers.
2. Divide each by **16**.
3. Convert the result into ASCII characters.

That directly gives the password.

 **Flag → HTB{l3g1c3l\_sh1ft\_l3ft\_1nsr3ct1on!!}**