**AMSI (Antimalware Scan Interface)** is **a Windows API** introduced with **Windows 10** (and Server 2016), which allows antivirus solutions (and EDRs) to **dynamically analyze potentially malicious content before execution**, especially **scripts and content loaded in memory** (via the `AmsiScanBuffer` function).

It is used to **detect and block malware at runtime**.

### **How does it work?**

1. An application (like **PowerShell**, **WScript**, **Excel VBA**) loads a script into memory.

2. Before execution, the **plaintext code is passed to AMSI**.

3. AMSI **forwards it to the antivirus** registered as the AMSI provider.

4. The antivirus scans and decides:

   * OK → execute.

   * KO → block.

Even if our malware is encrypted on disk or heavily obfuscated, **the moment we generate/load the plaintext code in memory, AMSI can see it**.

### **Key AMSI Functions**

* `AmsiInitialize`

* `AmsiOpenSession`

* `AmsiScanBuffer` ⬅️ best bypass target

* `AmsiCloseSession`

* `AmsiUninitialize`