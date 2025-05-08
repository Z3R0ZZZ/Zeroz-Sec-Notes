The **PEB (Process Environment Block)** is an **internal structure** used by Windows to **store critical information about a running process**.

It is a **hidden (unofficially undocumented) structure**, but it's **present in every Windows process**, accessible from **userland**, and commonly used by:

* The **Windows loader**

* The **C / C++ runtime**

* **Security tools**

* **Malware & injectors**

### Main Contents of the PEB

The PEB begins with a **well-known field: `BeingDebugged`**, a simple flag indicating whether a debugger is attached to the process. This is the first thing malware often checks to **evade analysis**: if the flag is set to `1`, it may alter its behavior, self-terminate, or lie about its actions.

Next, there's a **pointer to `PEB_LDR_DATA`**, another structure containing **linked lists of loaded modules** (DLLs such as `ntdll.dll`, `kernel32.dll`, etc.). Malware often uses this to **retrieve DLL addresses without ever calling `LoadLibrary`**, by inspecting memory directly.

Also within the PEB is a pointer to **`ProcessParameters`**, a structure holding:

* the full path to the executable (`C:\Users\...`),

* command-line arguments,

* environment variables,

* and other process configuration details.

  This is highly useful for **enumeration**, **reconnaissance**, or even **anti-sandbox techniques** (some sandboxes use unusual paths).

You’ll also find pointers to the **main process heap**, used for memory allocation, as well as information about the **Windows version**, the **subsystem** (GUI or console), and structures related to **exception handling** (SEH).

Finally, some PEB fields reveal **vital details for low-level malware development**, such as the **base address of the main process image**, allowing retrieval of the process's own module base address without calling `GetModuleHandle`.
