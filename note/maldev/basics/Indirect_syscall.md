An **indirect syscall** is a technique where we **perform a system call (`syscall`) without executing it directly**, but instead **we call an existing function in `ntdll.dll` or another “clean” memory module**, while **controlling the context or execution address indirectly**.

The goal is to **avoid embedding a `syscall` instruction directly in our code**, to **evade detection by signatures, heuristics, or behavioral EDRs**.

### ⚠️ Problem with **direct syscall**:

* our code contains the `syscall` instruction **in cleartext**.

* Some EDRs perform **memory scanning** looking for `syscall` instructions outside of `ntdll.dll` (e.g., `syscall; ret` in `.text` sections).

* Others verify that the `RIP` (instruction pointer) of the `syscall` **originates from a signed module** like `ntdll.dll` (which is not the case for direct syscalls).

### Example with Hell’s Gate

**Hell’s Gate** is a technique published by **am0nsec** that:

**Dynamically extracts the syscall ID from a function in `ntdll.dll` (e.g., `NtWriteVirtualMemory`) and performs a syscall directly** with the correct registers and Windows ABI — **without using a hardcoded syscall ID**.

##### **Simplified Steps:**

1. **Locate the address of the target function in `ntdll.dll`** (e.g., `NtWriteVirtualMemory`)

2. Read the first bytes to find the instruction sequence:

```asm
mov eax, XX          ; syscall ID  
mov r10, rcx  
syscall
```

3. Dynamically extract the value `XX` (the syscall ID)

4. Create a custom syscall stub and inject `eax = XX` + `syscall`

5. Execute the syscall with the correct arguments (Windows ABI)
