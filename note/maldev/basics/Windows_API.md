**Windows APIs** are **a set of functions provided by Microsoft** that allow programs to **interact with the Windows operating system**.

In short: **they are the official toolbox provided by Windows to manage system resources**, such as:

* files,

* processes,

* memory,

* network,

* graphical interface,

* registry,

* etc.

Windows APIs are **our entry point to interact with the target system** without reinventing the wheel.

They are organized by domain:

#### 📁 1. **File & Registry API**

* `CreateFile`, `ReadFile`, `WriteFile`

* `RegOpenKeyEx`, `RegSetValueEx`, etc.

#### 💻 2. **Process & Thread API**

* `CreateProcess`, `OpenProcess`, `TerminateProcess`

* `CreateRemoteThread`, `GetThreadContext`, etc.

#### 🧠 3. **Memory Management API**

* `VirtualAlloc`, `VirtualFree`, `VirtualProtect`, `ReadProcessMemory`, etc.

#### 🧬 4. **DLL & Code Injection**

* `LoadLibrary`, `GetProcAddress`

* `SetWindowsHookEx`, `QueueUserAPC`, `NtMapViewOfSection` (low-level)

#### 🌐 5. **Network API**

* `WinInet`, `WinHttp`, `WSAStartup`, `send`, `recv`, etc.

#### 🛡️ 6. **Security & Credentials API**

* `LogonUser`, `CryptProtectData`, `OpenProcessToken`, etc.

### **Low-level vs High-level: WinAPI vs Native API**

#### 🧱 **WinAPI (user-mode):**

* Accessible from languages like C, C++, Rust, Go, Python via bindings.

* Examples: `CreateFile`, `VirtualAlloc`, `LoadLibrary`.

#### 🧬 **Native API (NTAPI):**

* Functions exposed by `ntdll.dll`, internally used by WinAPI.

* Examples: `NtCreateFile`, `NtAllocateVirtualMemory`, `NtQueryInformationProcess`.

* Lower-level, **used for EDR evasion**, as they are often harder to monitor.
