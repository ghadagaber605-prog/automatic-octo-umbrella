"""Generate voices, music and the timeline for the dentist video.
Usage: python3 make_audio.py <kokoro.onnx> <voices.bin> <outdir>
"""
import json, sys, os, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
model, voices, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
SR, FPS = 24000, 24
VOICE = {"M": ("af_heart", 0.90, 1.26),   # Mahino: child voice (pitch + formants raised)
         "K": ("af_sarah", 0.92, 1.0),    # Kids Mag interviewer: woman
         "N": ("af_bella", 0.90, 1.0)}    # narrator: warm woman voice
k = Kokoro(model, voices)
script = json.load(open(os.path.join(HERE, "script.json")))

def shift(x, ratio):
    if ratio == 1.0: return x
    tmp_in, tmp_out = os.path.join(out, "_in.wav"), os.path.join(out, "_out.wav")
    sf.write(tmp_in, x, SR)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp_in, "-af",
                    f"asetrate={int(SR*ratio)},aresample={SR},atempo={1/ratio:.5f}", tmp_out], check=True)
    y, _ = sf.read(tmp_out); return y

def trim(x, thr=0.008):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(0, idx[0]-200): idx[-1]+800] if len(idx) else x

track, timeline, t = [np.zeros(int(SR*1.2))], [], 1.2
for i, line in enumerate(script):
    v, speed, ratio = VOICE[line["who"]]
    s, _ = k.create(line.get("say", line["text"]), voice=v, speed=speed, lang="en-us")
    s = trim(shift(np.asarray(s, dtype=np.float64), ratio))
    s = s / (np.abs(s).max() + 1e-9) * 0.85
    dur = len(s) / SR
    hop = SR // FPS
    env = [float(np.sqrt(np.mean(s[j:j+hop]**2))) for j in range(0, len(s), hop)]
    m = max(env) or 1; env = [round(min(1, e / m * 1.4), 3) for e in env]
    timeline.append({**line, "start": round(t, 3), "end": round(t + dur, 3), "env": env})
    gap = line.get("pause", 0.45)
    nxt = script[i+1]["scene"] if i + 1 < len(script) else None
    if nxt and nxt != line["scene"]: gap += 0.6
    track += [s, np.zeros(int(SR*gap))]; t += dur + gap
track.append(np.zeros(int(SR*1.0)))
voice = np.concatenate(track); total = len(voice) / SR

# --- gentle procedural background music (C-G-Am-F, soft plucks + pad) ---
def note(f, d, a=0.2):
    n = np.arange(int(SR*d)) / SR
    w = np.sin(2*np.pi*f*n) + 0.3*np.sin(4*np.pi*f*n) + 0.1*np.sin(6*np.pi*f*n)
    return w * np.exp(-n*3.2) * a
music = np.zeros(len(voice) + SR)
chords = [[261.6, 329.6, 392.0], [196.0, 246.9, 293.7], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6]]
beat = 0.42; b = 0
while b * beat < total:
    ch = chords[(b // 8) % 4]; pos = int(b * beat * SR)
    f = ch[[0, 1, 2, 1, 0, 2, 1, 2][b % 8]] * (2 if b % 2 else 1)
    nn = note(f, 1.2, 0.10 if b % 2 else 0.13); music[pos:pos+len(nn)] += nn[:len(music)-pos]
    if b % 8 == 0:
        n = np.arange(int(SR*beat*8)) / SR
        pad = sum(np.sin(2*np.pi*(ff/2)*n) for ff in ch) * 0.025 * np.minimum(1, n/0.6) * np.minimum(1, (n[-1]-n)/0.6+0.01)
        music[pos:pos+len(pad)] += pad[:len(music)-pos]
    b += 1
music = music[:len(voice)]
# duck music under speech
duck = np.ones(len(voice)) * 1.0
for seg in timeline:
    a, z = int(seg["start"]*SR), int(seg["end"]*SR); duck[a:z] = 0.35
duck = np.convolve(duck, np.ones(4800)/4800, mode="same")
# sound effects: x-ray click + sparkle
def sparkle(at):
    for j, f in enumerate([1568, 2093, 2637, 3136]):
        nn = note(f, 0.6, 0.08); p = int((at + j*0.07)*SR); music[p:p+len(nn)] += nn[:len(music)-p]
for seg in timeline:
    if seg["scene"] == "xray" : sparkle(seg["start"] - 0.4)
    if seg["scene"] == "clean": sparkle(seg["end"] - 1.2)
    if seg.get("a"): sparkle(seg["start"] - 0.3)
mix = voice + music * duck * 0.9
mix = mix / np.abs(mix).max() * 0.92
sf.write(os.path.join(out, "soundtrack.wav"), mix, SR)
json.dump({"duration": round(total, 3), "fps": FPS, "lines": timeline}, open(os.path.join(out, "timeline.json"), "w"))
print("duration", round(total, 1), "s")
