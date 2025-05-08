The **ABI (Application Binary Interface)** is a **binary contract between two software components**, often:

* between **my program** and **the operating system** (Windows, Linux, etc.),

* or between **different parts of a program** (e.g., dynamic libraries, DLL/SO).

### It defines the set of **low-level rules** such as:

* **How functions are called** (calling convention),

* **How arguments are passed** (in which registers or on the stack),

* **How memory is aligned**,

* **How return values are handled**,

* **Which registers are preserved or not (caller/callee-saved)**,

* And **how binary files are organized** (PE, ELF, etc.).

## **Why is it important?**

If we want to call a system function, make a syscall, inject code, dynamically load a DLL, write shellcode, etc. → **we must respect the ABI**.

## Syscall invocation in the Windows x64 ABI:

```asm
mov rcx, handle              ; 1st parameter (process handle)
mov rdx, baseAddress         ; 2nd parameter (address)
mov r8,  buffer              ; 3rd parameter (data)
mov r9,  size                ; 4th parameter
mov r10, rcx                 ; Required for syscall
mov eax, 0x3F                ; Syscall ID (e.g., NtWriteVirtualMemory)
syscall
```
