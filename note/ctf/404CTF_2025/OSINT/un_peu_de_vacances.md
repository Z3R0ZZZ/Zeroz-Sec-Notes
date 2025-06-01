You can download this challenge here: [message vocal 1.mp3](challenges/message_vocal_1.mp3)

A friend went on vacation. During his trip, he planned to visit a French aerospace facility. He just sent me a voice message! He’s in Guyana! But how do I know?

*Format of the flag: 404CTF{revealing-element}*

#### Solve

In the audio, I hear a bird — the clue is likely there, as it could be a bird species typical of French Guiana.

First, I separate the voice from the background using: [https://vocalremover.org/](https://vocalremover.org/)

Then I use [https://birdnet.cornell.edu/api/](https://birdnet.cornell.edu/api/) to identify it. The most probable result is the **Red-billed pied tanager**, which is the flag.

**404CTF{red-billed-pied-tanager}**
