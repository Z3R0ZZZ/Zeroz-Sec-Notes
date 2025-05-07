
## Intro :

This challenge involved an Android application that asks us to create an account :

![alt text](note/ctf/midnight_2025/asset/neopasswd2_0.png)

Once the account is created, we can see an interesting notification when we try to view messages :

![alt text](note/ctf/midnight_2025/asset/neopasswd2_01.png)

So the objective is set ! I need to be an admin !

## APK Analysis :

#### Be an admin :

![alt text](note/ctf/midnight_2025/asset/neopasswd2_1.png)

I can clearly see that it will only require a patch.

#### Ciphered message :

Still into MainActivity :

![alt text](note/ctf/midnight_2025/asset/neopasswd2_2.png)

Being admin might not be the only condition to see the message and `decrypted != null` prove it.

Let's find what exactly defines if decrypted is null or not

#### Error that needs to be patched :

After some research about this `decrypted` condition I found this :

![alt text](note/ctf/midnight_2025/asset/neopasswd2_3.png)

I notice that getMaxAllowedLength is set to 3. However it must be superior to the Ciphered text in order to ensure that decrypted isn't null (Cipher text : Mszhl+UnftsTwm7Ule0V28WQMptqd8uoc4AbDSBKavw=)

So this needs to be patched too !

## PATCH

I will use apktool to patch it :

`apktool d neopasswd2.apk -o decompile --copy-original`

I look for the smali corresponding to MainActivity : `decompile/smali_classes3/com/example/neopasswd2/MainActivity.smali`

#### IsAdmin :

I found the IsAdmin boolean

```smali
    .line 34
    const/4 v0, 0x0 => false

    iput-boolean v0, p0, Lcom/example/neopasswd2/MainActivity;->isAdmin:Z
```

And transformed it

```smali
    .line 34
    const/4 v0, 0x1 =>  true

    iput-boolean v0, p0, Lcom/example/neopasswd2/MainActivity;->isAdmin:Z
```

#### getMaxAllowedLength

And I patch the length

```smali
# virtual methods
.method public getMaxAllowedLength()I
    .locals 1

    .line 136
    const/4 v0, 0x3

    return v0
.end method
```

by this :

```smali
# virtual methods
.method public getMaxAllowedLength()I
    .locals 1

    .line 136
    const/16 v0, 0x40

    return v0
.end method
```

## Rebuild

I rebuild the apk : `apktool b decompile -o patched2.apk `

and I signed it with a debug key : 

```
 keytool -genkey -v \                                                                                                                          
  -keystore debug.keystore   -storepass android   -alias androiddebugkey   -keyalg RSA   -keysize 2048   -validity 10000


apksigner sign \                                     
  --ks debug.keystore   --ks-key-alias androiddebugkey   --ks-pass pass:android   --key-pass pass:android   patched2.apk
```

Now I launch the app :

![alt text](note/ctf/midnight_2025/asset/neopasswd2_3.png)

And it's done ;)
