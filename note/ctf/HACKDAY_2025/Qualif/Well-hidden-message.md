## 1: The Steg Challenge: Insignificant Blue

**Hint:**

On a USB key marked with the seal of the Black Mist, a mysterious film was discovered. This film, which you are watching from the EIGHTH ROW of seats in the Cogswell Halls cinema, shows apparently innocuous scenes. But according to rumors, it is not just a simple video. Data may have been compressed and hidden within it…

This challenge provides a video that hides something.

One part of the description is interesting: `EIGHTH ROW`. Why mention it like that?

According to the title, the color blue will be involved, and *Insignificant* probably refers to LSB (Least Significant Bit)?

But we have a video—how can we extract LSBs from that? If we think about it, a video is just a lot of frames combined together, right?

So the plan is to extract every frame of this video and take the blue LSB from every 8th row of every frame:

```python
from PIL import Image
import glob

def extract_lsb_from_blue(image_file):
    img = Image.open(image_file)
    pixels = img.load()
    width, height = img.size

    extracted_bits = []
    for y in range(height):
        for x in range(width):
            pixel = pixels[x, y]  
            if isinstance(pixel, tuple): 
                extracted_bits.append(pixel[2] & 1)
            else:
                extracted_bits.append(pixel & 1)

    return extracted_bits

def bits_to_bytes(bits):
    # Convert a list of bits into bytes
    byte_array = bytearray()
    for i in range(0, len(bits), 8):
        byte = 0
        for bit in bits[i:i + 8]:
            byte = (byte << 1) | bit
        byte_array.append(byte)
    return byte_array

# Process all frames
frames = sorted(glob.glob("frames/frame*.png"))
output_file = "extracted_data.bin"

all_bits = []
for frame in frames:
    all_bits.extend(extract_lsb_from_blue(frame))

# Convert bits to bytes and write to a file
extracted_data = bits_to_bytes(all_bits)
with open(output_file, "wb") as f_out:
    f_out.write(extracted_data)
```

But this gives a corrupted ZIP? And I didn’t even implement the logic to only take the 8th row. Why?

Well, it might not be as simple as it seems. I might not need to take every 8th row, but rather capture the LSBs from the beginning **to** the 8th row!

```python
from PIL import Image
import glob

def extract_lsb_from_blue(image_file):
    img = Image.open(image_file)
    pixels = img.load()
    width, height = img.size

    extracted_bits = []
    for y in range(8):  # Check from the 1st to the 8th lines
        for x in range(width):
            pixel = pixels[x, y]  
            if isinstance(pixel, tuple): 
                extracted_bits.append(pixel[2] & 1)
            else:
                extracted_bits.append(pixel & 1)

    return extracted_bits

def bits_to_bytes(bits):
    byte_array = bytearray()
    for i in range(0, len(bits), 8):
        byte = 0
        for bit in bits[i:i + 8]:
            byte = (byte << 1) | bit
        byte_array.append(byte)
    return byte_array

# Process all frames extracted from the video
frames = sorted(glob.glob("frames/frame*.png"))
output_file = "extracted_data.bin"

all_bits = []
for frame in frames:
    all_bits.extend(extract_lsb_from_blue(frame))

# Convert bits to bytes and write to a file
extracted_data = bits_to_bytes(all_bits)
with open(output_file, "wb") as f_out:
    f_out.write(extracted_data)

print(f"Saved into {output_file}.")
```

And this gives me the correct ZIP where our next challenge is located!

**Flag:** `HACKDAY{s73@M_$7@tion_4CcE5S}`

---

## 2: OSINT Challenge: Campsite

**Challenge Description:**

Among the data recovered in the archive, one photo catches the eye. The recovered records mention that this place is located near the birthplace of a famous scholar, whose work on encryption systems is said to have inspired the Black Mist. But his name remains a mystery…

You will have to investigate to find out who he is. The name of this scholar is the key to progress.

![alt text](note/ctf/HACKDAY_2025/asset/Wellhidden.png)

So we need to find the scholar who was born near this campsite. Let’s start by finding this campsite!

First, I tried Google Images, and one campsite really caught my attention: Trittenheim.

It looks like the campsite shown in the photo.

To confirm, I looked with Google Street View and found the exact location shown in the photo!

This is definitely the place. Now, how can we find the scholar who was born near this campsite? Maybe in the same city? Let’s find out with a simple search: “scholar born in Trittenheim”.

I try the first name that comes up: Johannes Trithemius.

And by looking at his Wikipedia page, I also found this:

```
Fields     Theology, cryptography, lexicography, history, occultism
```

So he worked on cryptography—okay, that’s solid. But another proof, like an actual encryption system, would be great!

After doing some research about him related to cryptography, I found this (French source: [https://www.arcsi.fr/doc/solutions\_chiffre\_de\_Tritheme.pdf](https://www.arcsi.fr/doc/solutions_chiffre_de_Tritheme.pdf)):

```
Johannes Trithemius (or Trithème) was a 15th-century mathematician. He invented an encryption method (known as the "Trithemius cipher" or "Trithemius code") based on successive, increasing shifts to the right in the alphabet, starting from 1 up to N. If the end of the alphabet is reached, it wraps around to the beginning.
```

So this confirms he is our man!

**Flag:** `HACKDAY{Johannes_Trithemius}`
