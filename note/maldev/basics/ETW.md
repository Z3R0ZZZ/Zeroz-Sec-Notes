**ETW (Event Tracing for Windows)** is a **low-level logging system built into Windows**, designed to allow tools and services (including EDRs) to **monitor the behavior of applications, the kernel, and the system** in **real time**.

## **What is it used for?**

* **Debugging** (Microsoft, developers)

* **System monitoring** (PerfMon, Sysinternals, etc.)

* **Security**: **EDRs, Defender, Sysmon** heavily rely on it to:

  * trace **sensitive APIs** (injection, thread creation, etc.),

  * detect abnormal behavior,
  
  * collect detailed logs, even if I avoid using `ntdll.dll`.

## **How does it work?**

* The ETW system is based on **"providers"** that **generate events**.

  * Examples: `Microsoft-Windows-Kernel-Process`, `Microsoft-Windows-Threat-Intelligence`

* Other applications (consumers) **read these events in real time**:

  * Examples: **Windows Defender**, **Sysmon**, **EDRs** (Crowdstrike, SentinelOne, etc.)

* Thousands of events can be captured: thread creation, image loading, memory allocation, etc.

## **Why is it a problem?**

Even when bypassing hooks and using direct syscalls, ETW can still trace our actions.
