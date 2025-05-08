A **direct syscall** is an **evasion technique** that involves **bypassing traditional Windows APIs (WinAPI)** by **calling kernel functions directly using their syscall numbers**.

➡️ We **no longer go through functions like `NtOpenProcess`, `NtWriteVirtualMemory`, etc.** via `ntdll.dll`

➡️ We **perform the system call myself using the `syscall` instruction** (or `int 0x2e` in 32-bit mode)

## **How does it work?**

1. We retrieve the **syscall ID (number)** of the target function (e.g., `NtAllocateVirtualMemory` → `0x18` on certain Windows versions).

2. We prepare the **parameters in the correct registers** according to the Windows ABI.

3. We execute the **`syscall`** instruction (or `int 0x2e` on x86).

4. The result is returned in `RAX`.

### In x64, a direct syscall looks like this (in ASM):

```asm
mov r10, rcx         ; required for syscall
mov eax, SYSCALL_ID  ; syscall number
syscall              ; jump into the kernel
ret
```

### **Risks?**

Syscall IDs **vary across Windows versions**.

A mistake = crash → no WinAPI-style error handling.

Some EDRs use **kernel-level monitoring**, so **it’s not 100% stealthy**.