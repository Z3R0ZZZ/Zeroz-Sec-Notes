You can download this challenge here: [3x3cut3\_m3](challenges/3x3cut3_m3.ps1)
I realize the file is obfuscated but one detail catches my attention:

```Shell
$Zh4nwQ = $jPVIMo4.ToCharArray() ; [array]::Reverse($Zh4nwQ) ; -join $Zh4nwQ 2>&1> $null ;
$zMS = [sYSteM.TExT.EnCODINg]::UTF8.gEtstrInG([syStem.cONVeRt]::frOMBAse64StrIng("$Zh4nwQ")) ;
$6yNw = "I"+"N"+"v"+"o"+"K"+"e"+"-"+"e"+"x"+"p"+"R"+"e"+"s"+"S"+"I"+"o"+"N" ; neW-AliAS -NAmE PWN -VALUe $6yNw -ForcE ; pWN $zMS ;
```

I can use this information to deobfuscate!

```python
import base64
import re

for _ in range(5):
    with open("3x3cut3_m3.ps1", "r") as file:
        data = file.readlines()

    base64_data = None
    for line in data:
        match = re.search(r'=\s*"([^"]+)"', line)
        if match:
            base64_data = match.group(1)
            break

    if not base64_data:
        raise ValueError("No base64 string found in the file.")

    base64_rev = base64_data[::-1]
    try:
        new_binary = base64.b64decode(base64_rev)
    except Exception as e:
        raise ValueError("Base64 decoding failed: " + str(e))

    with open("3x3cut3_m3.ps1", "wb") as new_file:
        new_file.write(new_binary)
```

Which gives me:

```Shell
# Key used for the XOR operation
$key = @(42, 17, 99, 84, 63, 19, 88, 7, 31, 55, 91, 12, 33, 20, 75, 11)

# Length of the current username (used as salt)
$user_length = ($env:USERNAME).Length

# Displays a message asking for the password
$password_input = Read-Host -Prompt ([System.Text.Encoding]::Default.GetString(
    [System.Convert]::FromBase64String(
        "VmV1aWxsZXogZW50cmVyIGxlIG1vdCBkZSBwYXNzZSBwb3VyIGZhaXJlIGTpY29sbGVyIGxhIGZ1c+ll"
    )
))
# → "Veuillez entrer le mot de passe pour faire décoller la fusée"

# List that will contain the transformed result
$transformed_input = @()

# Character-by-character transformation
for ($i = 0; $i -lt $password_input.Length; $i++) {
    $char_code = [int][char]$password_input[$i]
    $xor_result = ($char_code -bxor $key[$i]) - $user_length
    $mod_result = $xor_result % [math]::Pow(13, 2)  # % 169
    if ($mod_result -lt 0) { $mod_result += 169 }
    $transformed_input += $mod_result
}

# Expected values to consider the password valid
$expected_transformed = @(93, 72, 28, 24, 67, 23, 98, 58, 35, 75, 98, 87, 68, 30, 97, 33)

# Validation check
$is_valid = $true
for ($i = 0; $i -lt $expected_transformed.Length; $i++) {
    if ($expected_transformed[$i] -ne $transformed_input[$i]) {
        $is_valid = $false
        break
    }
}

# If password is correct
if ($is_valid) {
    $music_sequence = @(
        (130,100),(262,100),(330,100),(392,100),(523,100),(660,100),(784,300),(660,300),
        (146,100),(262,100),(311,100),(415,100),(523,100),(622,100),(831,300),(622,300),
        (155,100),(294,100),(349,100),(466,100),(588,100),(699,100),(933,300),(933,100),
        (933,100),(933,100),(1047,400)
    )
    foreach ($note in $music_sequence) {
        [Console]::Beep($note[0], $note[1])
    }
    Write-Host ([System.Text.Encoding]::Default.GetString(
        [System.Convert]::FromBase64String("TW90IGRlIHBhc3NlIGNvcnJlY3QgISBMYSBmdXPpZSBzJ2Vudm9sZWVlZSAh")
    )) -ForegroundColor Green
    # → "Mot de passe correct ! La fusée s'envolera !"
}
else {
    # Else, sound + text + sad beep
    $shell = New-Object -com wscript.shell
    1..50 | % { $shell.SendKeys([char]175) }

    $fail_beeps = @(
        @{ Pitch = 1059.274; Length = 300 },
        @{ Pitch = 1059.274; Length = 200 },
        @{ Pitch = 1188.995; Length = 500 },
        @{ Pitch = 1059.274; Length = 500 },
        @{ Pitch = 1413.961; Length = 500 },
        @{ Pitch = 1334.601; Length = 950 },

        @{ Pitch = 1059.274; Length = 300 },
        @{ Pitch = 1059.274; Length = 200 },
        @{ Pitch = 1188.995; Length = 500 },
        @{ Pitch = 1059.274; Length = 500 },
        @{ Pitch = 1587.117; Length = 500 },
        @{ Pitch = 1413.961; Length = 950 },

        @{ Pitch = 1059.274; Length = 300 },
        @{ Pitch = 1059.274; Length = 200 },
        @{ Pitch = 2118.547; Length = 500 },
        @{ Pitch = 1781.479; Length = 500 },
        @{ Pitch = 1413.961; Length = 500 },
        @{ Pitch = 1334.601; Length = 500 },
        @{ Pitch = 1188.995; Length = 500 },
        @{ Pitch = 1887.411; Length = 300 },
        @{ Pitch = 1887.411; Length = 200 },
        @{ Pitch = 1781.479; Length = 500 },
        @{ Pitch = 1413.961; Length = 500 },
        @{ Pitch = 1587.117; Length = 500 },
        @{ Pitch = 1413.961; Length = 900 }
    )

    foreach ($beep in $fail_beeps) {
        [System.Console]::Beep($beep['Pitch'], $beep['Length'])
    }

    # TTS = "Boom"
    Function Invoke-TextToSpeech($Text) {
        Add-Type -AssemblyName System.speech
        $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $speaker.Speak($Text)
    }
    Invoke-TextToSpeech "Boom"

    Write-Host ([System.Text.Encoding]::Default.GetString(
        [System.Convert]::FromBase64String("TW90IGRlIHBhc3NlIGluY29ycmVjdC4gTGEgZnVz6WUgdmllbnQgZCdleHBsb3Nlcg==")
    )) -ForegroundColor Red
    # → "Mot de passe incorrect. La fusée vient d'exploser"

    # Optional: native WinAPI call to put the screen to sleep (SendMessage function)
    (Add-Type "$(
        [char]0x5B+[char]0x44+[char]0x6C+[char]0x6C+[char]0x49+[char]0x6D+[char]0x70+[char]0x6F+[char]0x72+[char]0x74+
        [char]0x28+[char]0x22+[char]0x75+[char]0x73+[char]0x65+[char]0x72+[char]0x33+[char]0x32+[char]0x2E+[char]0x64+
        [char]0x6C+[char]0x6C+[char]0x22+[char]0x29+[char]0x5D+[char]0x70+[char]0x75+[char]0x62+[char]0x6C+[char]0x69+
        [char]0x63+[char]0x20+[char]0x73+[char]0x74+[char]0x61+[char]0x74+[char]0x69+[char]0x63+[char]0x20+[char]0x65+
        [char]0x78+[char]0x74+[char]0x65+[char]0x72+[char]0x6E+[char]0x20+[char]0x69+[char]0x6E+[char]0x74+[char]0x20+
        [char]0x53+[char]0x65+[char]0x6E+[char]0x64+[char]0x4D+[char]0x65+[char]0x73+[char]0x73+[char]0x61+[char]0x67+
        [char]0x65+[char]0x28+[char]0x69+[char]0x6E+[char]0x74+[char]0x20+[char]0x68+[char]0x57+[char]0x6E+[char]0x64+
        [char]0x2C+[char]0x20+[char]0x69+[char]0x6E+[char]0x74+[char]0x20+[char]0x68+[char]0x4D+[char]0x73+[char]0x67+
        [char]0x2C+[char]0x20+[char]0x69+[char]0x6E+[char]0x74+[char]0x20+[char]0x77+[char]0x50+[char]0x61+[char]0x72+
        [char]0x61+[char]0x6D+[char]0x2C+[char]0x20+[char]0x69+[char]0x6E+[char]0x74+[char]0x20+[char]0x6C+[char]0x50+
        [char]0x61+[char]0x72+[char]0x61+[char]0x6D+[char]0x29+[char]0x3B
    )" -Name a -Pas)::SendMessage(-1,0x0112,0xF170,2)
}
```

Perfect, I have everything I need to solve it via a bruteforce on the user length:

```python
key = [42, 17, 99, 84, 63, 19, 88, 7, 31, 55, 91, 12, 33, 20, 75, 11]
expected = [93, 72, 28, 24, 67, 23, 98, 58, 35, 75, 98, 87, 68, 30, 97, 33]

def bruteforce_user_length():
    for user_length in range(1, 30):
        result = []
        valid = True
        for i in range(len(expected)):
            found = False
            for c in range(32, 127):  # ASCII printable chars
                val = ((ord(chr(c)) ^ key[i]) - user_length) % 169
                if val < 0:
                    val += 169
                if val == expected[i]:
                    result.append(chr(c))
                    found = True
                    break
            if not found:
                valid = False
                break
        if valid:
            print(f"[+] Possible user_length = {user_length}")
            print("    => Password / Flag: " + ''.join(result))

bruteforce_user_length()
```

```bash
python solve.py 
[+] Possible user_length = 9
    => Password / Flag: L@Fus33D3c0ll3!!
...
```

Here is the flag: **L\@Fus33D3c0ll3!!** (the rocket takes off in French)
