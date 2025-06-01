```python
from math import *

charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}-!"
n = len(charset)

def encrypt(message):
    encrypted = []
    for char in message:
        if char in charset:
            x = charset.index(char)
            y = pow(2, x, n+1)
            encrypted.append(charset[y])
    return ''.join(encrypted)

print("ENCRYPTED FLAG : ", encrypt("FLAG")) 


# ENCRYPTED FLAG : 828x6Yvx2sOnzMM4nI2sQ 
```

I need to recover the flag by inverting this operation: `pow(2, x, n+1)` which is a discrete logarithm in base 2 modulo 67 over a custom charset.

I want to decrypt using `x` such that: `2^x % 67 == y`

This operation doesn't have a trivial solution because **the discrete logarithm is hard to invert** (by design — used in cryptography). But here, `modulo = 67` is a small prime so **it’s doable**.

Let’s say `x = 4`, then:
`y = pow(2, 4, 67) = 16`

To decrypt, if I see `char = charset[16]`, then:

```
2^x % 67 == 16 → x = 4
→ clear_char = charset[4]
```

The steps are:

1. For each encrypted character, find its index `y` in the charset.

2. Solve the equation: `2^x ≡ y mod 67`

3. Reverse to find the clear character: `charset[x]`

To simplify the process, I use the Baby-step Giant-step (BSGS) method.

We write `x = i * m + j` with `0 ≤ i, j < m` and `m = ⌈√p⌉`

Then:
`g^x = g^(i*m + j) = (g^m)^i * g^j ≡ y mod p`

And we search for i, j such that: `g^j ≡ y * (g^(-m))^i mod p`

### Step 1 – Precompute (baby steps):

Build the dictionary:
`baby_steps[g^j % p] = j    for j = 0 to m-1`

### Step 2 – Search (giant steps):

Compute `factor = g^(-m) mod p` (modular inverse), then compute:
`y * factor^i mod p     for i = 0 to m-1`

If a collision is found, we know that `g^j = y * factor^i   mod p`, so `x = i * m + j`

```python
from math import isqrt

charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}-!"
n = len(charset)
modulo = n + 1  # 67

def discrete_log_2(y, mod):
    """
    Finds x such that 2^x ≡ y mod mod
    """
    m = isqrt(mod) + 1
    table = {}

    # baby step
    value = 1
    for j in range(m):
        table[value] = j
        value = (value * 2) % mod

    # giant step
    factor = pow(2, -m, mod)
    value = y
    for i in range(m):
        if value in table:
            return i * m + table[value]
        value = (value * factor) % mod

    return None  # Not found

def decrypt(ciphertext):
    decrypted = []
    for char in ciphertext:
        if char in charset:
            y = charset.index(char)
            x = discrete_log_2(y, modulo)
            if x is None or x >= len(charset):
                decrypted.append('?')  # unknown character
            else:
                decrypted.append(charset[x])
        else:
            decrypted.append(char)  # non-encrypted character
    return ''.join(decrypted)
    
cipher = "828x6Yvx2sOnzMM4nI2sQ"
print("DECRYPTED FLAG:", decrypt(cipher))
```

**DECRYPTED FLAG:** `404CTF{C0nstEllAt!0n}`
