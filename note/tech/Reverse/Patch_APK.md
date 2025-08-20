I will show you how you can patch an APK in order to change the workflow and bypass some conditions :

First of all, you need `apktool`. This will allow us to decompile our APK and get Smali files that can be modified (and we are going to use it to patch our APK !)

I also used JADX and Android Studio as well to :

* see the original code
* see the result of my patch
* and of course, test our patched executable !

Let's get started !

# 1 : Decompiling the APK

As I said before, we need to decompile the APK. I usually run this command :

`apktool d target.apk -o decompile --copy-original`

Here is an explanation :

* d : decompile the target
* -o : the output of the decompilation
* \--copy-original : copies the original manifest (you can also use --debug instead of --copy-original if you want to add debuggable="true" into the manifest for dynamic analysis)

Now you have your decompile folder that usually looks like this :

```bash
ls decompile 

AndroidManifest.xml  build   original  smali_classes2  smali_classes5  smali_classes8
META-INF             kotlin  res       smali_classes3  smali_classes6  unknown
apktool.yml          lib     smali     smali_classes4  smali_classes7
```

# 2 : Locate the smali files

A simple way to locate the smali file you need to modify is to use JADX.

Here is an example :

![alt text](note/tech/asset/patchAPK0.png)

I need to patch `isAdmin` but where is it ?

Just switch to Smali mode ! (bottom)

![alt text](note/tech/asset/patchAPK1.png)

You will see how the code looks in Smali, then search for the same file in your decompile folder (in my case it was located in smali\_classes3/com/example/neopasswd2/MainActivity.smali)

# 3 : Patch it !

### Some basics :

| Data Type / Element     | Smali Notation                        | Definition                                                              |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| byte                    | B                                     | 8-bit signed integer                                                    |
| short                   | S                                     | 16-bit signed integer                                                   |
| int                     | I                                     | 32-bit signed integer                                                   |
| long                    | J                                     | 64-bit signed integer                                                   |
| float                   | F                                     | 32-bit floating point                                                   |
| double                  | D                                     | 64-bit floating point                                                   |
| boolean                 | Z                                     | true/false                                                              |
| char                    | C                                     | UTF-16 char                                                             |
| class or interface      | Lclassname;                           | Ex: `Ljava/lang/String;`                                                |
| array of type           | \[<type>                              | Ex: `[I` (int\[]), `[[I` (int\[]\[]), `[Ljava/lang/String;` (String\[]) |
| void (return type only) | V                                     | Only for return                                                         |
| method descriptor       | (args)returnType                      | Ex: `(II)I` → method taking 2 ints and returning int                    |
| object (generic)        | Lpackage/ClassName;                   | Ex: `Ljava/util/List;`                                                  |
| string literal          | "text"                                | Ex: `const-string v0, "Hello"`                                          |
| null reference          | null                                  | Ex: `const/4 v0, 0x0`                                                   |
| field access (static)   | .field ...                            | Ex: `.field public static final DEBUG:Z`                                |
| method call (instance)  | invoke-virtual {p0}, L...;->method()V | Call instance method                                                    |
| method call (static)    | invoke-static {...}, L...;->method()V | Call static method                                                      |

### Boolean Patch (Smali Notation : Z)

Here are a few examples of boolean patching. Let’s take `isAdmin` from earlier :

```
    .line 34
    const/4 v0, 0x0

    iput-boolean v0, p0, Lcom/example/neopasswd2/MainActivity;->isAdmin:Z
```

How do I know that’s the right one ?

Look at this : `iput-boolean v0, p0` it means that `isAdmin` will take the value of v0, and Z at the end indicates that this is a boolean.

But what is v0 ? Well, it’s just above ! : `const/4 v0, 0x0` where 0x0 equals `false`.

We want to patch it to true, so we just set `const/4 v0, 0x1` and it’s patched to true.

Sometimes it can appear like this:

```
.field public static final DEBUG:Z
```

Where DEBUG is false, just set it to true !

```
.field public static final DEBUG:Z = true
```

Simple as that !

### The return of a method/function (pretty much the same) :

Let’s take this :

```
# virtual methods
.method public getMaxAllowedLength()I
    .locals 1

    .line 136
    const/16 v0, 0x40

    return v0
.end method
```

This method returns an int (look at the I at the end of `method public getMaxAllowedLength()I`).

We could modify v0 by changing its value (0x20).

OR we could directly add another variable and redirect the return to this variable, like this :

```
# virtual methods
.method public getMaxAllowedLength()I
    .locals 2

    const/16 v0, 0x40
    const/16 v1, 0x20

    return v1
.end method
```

Here we set `.locals 2` in order to use 2 variables (v0/v1). Then we set v1 `const/16 v1, 0x20` where 0x20 is the value and /16 means 16-bit signed.

Finally, we control the return by replacing v0 with v1. This can be useful when you need to control a certain value (also works with return-object).

### Create a fake method and call it :

Let’s take :

```
.method public getMaxAllowedLength()I
    .locals 1

    .line 136
    const/16 v0, 0x40

    return v0
.end method
```

It’s called here : `invoke-virtual {p0}, Lcom/example/neopasswd2/MainActivity;->getMaxAllowedLength()I`

Nothing stops us from creating :

```
.method public getEvilAllowedLength()I
    .locals 1

    const/16 v0, 0x20

    return v0
.end method
```

And call our fake method : `invoke-virtual {p0}, Lcom/example/neopasswd2/MainActivity;->getEvilAllowedLength()I`

Meaning we can also control called methods !

### Patch condition :

let's have a look at this :

```
if (str.equals("a2a3d412e92d896134d9c9126d756f")) {
```

this condition look like this :

```
    const-string p1, ""

    :goto_1
    const-string v1, "a2a3d412e92d896134d9c9126d756f"

    .line 2
    invoke-virtual {p1, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p1

    if-eqz p1, :cond_1

    iget-object p1, p0, Lcom/example/apkey/MainActivity$a;->b:Lcom/example/apkey/MainActivity;

    invoke-virtual {p1}, Landroid/app/Activity;->getApplicationContext()Landroid/content/Context;

    move-result-object p1
```

If we want to invert the condition (equal a2a3d412e92d896134d9c9126d756f)

We need to modify this : `if-eqz p1, :cond_1` by its opposite, which is : `if-nez p1, :cond_1`

Now the condition is inverted and we bypass the pass checker !

# 4 : Build your patched APK

When you’re done with modifications, just use :

`apktool b decompile -o patched.apk`

This will build our APK but it isn’t finished yet ! If we want to use it we need to sign it :

First, we generate the key :

```
 keytool -genkey -v \                                                                                                                          
  -keystore debug.keystore \
  -storepass android \
  -alias androiddebugkey \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Then we use it to sign the APK :

```
apksigner sign \                                     
  --ks debug.keystore \
  --ks-key-alias androiddebugkey \
  --ks-pass pass:android \
  --key-pass pass:android \
  patched.apk
```

Congrats, you patched your APK ;)