![https://app.hackthebox.com/challenges/240](https://app.hackthebox.com/challenges/240)

## Tool : Android Studio + JADX

I analyzed the code with JADX and checked the manifest:
`<activity android:name="com.example.apkey.MainActivity">`

Ok so **MainActivity** is the entry point, and an `onClick` function caught my attention:

```java
 public void onClick(View view) {  
            Toast makeText;  
            String str;  
            try {  
                if (MainActivity.this.f928c.getText().toString().equals("admin")) {  
                    MainActivity mainActivity = MainActivity.this;  
                    b bVar = mainActivity.e;  
                    String obj = mainActivity.d.getText().toString();  
                    try {  
                        MessageDigest messageDigest = MessageDigest.getInstance("MD5");  
                        messageDigest.update(obj.getBytes());  
                        byte[] digest = messageDigest.digest();  
                        StringBuffer stringBuffer = new StringBuffer();  
                        for (byte b2 : digest) {  
                            stringBuffer.append(Integer.toHexString(b2 & 255));  
                        }  
                        str = stringBuffer.toString();  
                    } catch (NoSuchAlgorithmException e) {  
                        e.printStackTrace();  
                        str = "";  
                    }  
                    if (str.equals("a2a3d412e92d896134d9c9126d756f")) {  
                        Context applicationContext = MainActivity.this.getApplicationContext();  
                        MainActivity mainActivity2 = MainActivity.this;  
                        b bVar2 = mainActivity2.e;  
                        g gVar = mainActivity2.f;  
                        makeText = Toast.makeText(applicationContext, b.a(g.a()), 1);  
                        makeText.show();  
                    }  
                }  
                makeText = Toast.makeText(MainActivity.this.getApplicationContext(), "Wrong Credentials!", 0);  
                makeText.show();  
            } catch (Exception e2) {  
                e2.printStackTrace();  
            }  
        }  
    }
```

I only need to patch :

```java
if (str.equals("a2a3d412e92d896134d9c9126d756f")) {
```

So I decompiled and changed the condition:

```
apktool d APkey.apk -o decompile --copy-original
```

I found:
`decompile/smali/com/example/apkey/MainActivity$a.smali`

and at line 148 I modified:

```
if-eqz p1, :cond_1
```

to

```
if-nez p1, :cond_1
```

in order to invert the condition. Then I recompiled:

```
 keytool -genkey -v \                                                         
  -keystore debug.keystore \
  -storepass android \
  -alias androiddebugkey \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000


apksigner sign \                                     
  --ks debug.keystore \
  --ks-key-alias androiddebugkey \
  --ks-pass pass:android \
  --key-pass pass:android \
  patched.apk
```

![alt text](note/ctf/asset/APKey.png)