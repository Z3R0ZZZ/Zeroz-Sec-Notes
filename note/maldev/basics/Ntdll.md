`ntdll.dll` is a **Windows system DLL** that contains:

All **NTAPI (Native API)** functions, which are **the closest to kernel mode**, while still accessible from **userland**.

It represents **the last layer before a raw syscall into the kernel**.

**Everything goes through `ntdll.dll`** when malware calls system functions.

**It is always loaded in every process!**

## **Architecture of a Typical System Call (WinAPI ➜ Kernel)**

Example: I call `VirtualAlloc(...)`

1. `VirtualAlloc` resides in `kernel32.dll`

2. `kernel32` calls `ntdll!NtAllocateVirtualMemory`

3. `NtAllocateVirtualMemory` contains a stub that:

   * **prepares the registers**

   * executes the **`syscall`** instruction
   
4. The kernel executes the real handler for `NtAllocateVirtualMemory`

**`ntdll.dll` = interface layer between userland APIs (WinAPI) and the kernel**
