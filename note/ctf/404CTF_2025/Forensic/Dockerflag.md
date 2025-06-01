While exploring the ship’s computer system, you stumble upon an old project made a long time ago, in a galaxy far, far away. The project was quickly abandoned and deleted from your internal GitLab… but maybe the Docker image of the website you now have still holds a few well-kept secrets...

#### Solve :

I extract the layers and inspect the contents.

Since the challenge indicates that the answer is in the Web layer, I immediately notice the `app` folder:

**app.py:**

```python
import os

from flask import Flask, render_template
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("SECRET", default="WHERE IS ZE DOTENV ?")

app = Flask(__name__)

@app.route('/')
def index():
    return render_template("index.html")

app.run(debug=False, host="0.0.0.0", port=5000)
```

So I need to find a `.env` file. Unfortunately, the `.git` directory is broken, but the `.git/objects` folder is still present, which lets me recover files stored as blobs. I extract them using:

```python
import os
import zlib

git_objects_dir = ".git/objects"
output_dir = "recovered_blobs"

os.makedirs(output_dir, exist_ok=True)

def recover_git_object(path, sha1):
    try:
        with open(path, "rb") as f:
            compressed = f.read()
        decompressed = zlib.decompress(compressed)
    except Exception as e:
        print(f"[!] Failed to decompress {sha1}: {e}")
        return

    try:
        header, content = decompressed.split(b'\x00', 1)
        obj_type, _ = header.decode().split(' ', 1)
    except Exception as e:
        print(f"[!] Failed to parse {sha1}: {e}")
        return

    print(f"[+] {sha1} - type: {obj_type}")

    if obj_type == "blob":
        output_path = os.path.join(output_dir, f"{sha1}.txt")
        with open(output_path, "wb") as out:
            out.write(content)
        print(f"    -> saved to {output_path}")
    else:
        print(content.decode(errors='ignore').strip().splitlines()[0:5])
        print()

def walk_objects():
    for subdir in os.listdir(git_objects_dir):
        if len(subdir) != 2:
            continue
        subdir_path = os.path.join(git_objects_dir, subdir)
        if not os.path.isdir(subdir_path):
            continue

        for filename in os.listdir(subdir_path):
            sha1 = subdir + filename
            full_path = os.path.join(subdir_path, filename)
            recover_git_object(full_path, sha1)

if __name__ == "__main__":
    walk_objects()
```

And I recover the `.env` file:
`SECRET="404CTF{492f3f38d6b5d3ca859514e250e25ba65935bcdd9f4f40c124b773fe536fee7d}"`