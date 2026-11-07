"""配音：火山引擎 豆包语音合成模型 2.0（双向流式 WebSocket）。

每个角色的全部台词在一个会话里一次合成（逐句发送文本，模型连着读，语气连贯），
再按服务端返回的逐字时间戳切成一句一句，回写到分镜里。

用法：
  python pipeline/tts.py studio/src/episodes/<期>.json --dry-run   # 只列出要合成的内容，不联网
  python pipeline/tts.py studio/src/episodes/<期>.json             # 合成并回写分镜
  python pipeline/tts.py <期>.json --force                         # 忽略缓存重做

回写到每句：
  audio       该角色整段音频（相对 public/）
  audioStart  这句在整段音频里的起点（秒）
  audioEnd    终点（秒）
  frames      这句停留的帧数 = 切片时长；换人说话时再加 turn_gap_frames 的停顿
  mouth       逐帧口型（1 张嘴 / 0 闭嘴），长度 = frames
  chars       逐字时间：第 n 个字（只算文字和数字）在这句第几帧开始
另写 manifest.json：每句的切片时长和口型，方便单独查看。

缓存：指纹 = 该角色全部台词 + 音色参数。某个角色改了任何一句，只重做这个角色。
凭证放在 video-studio/.env（见 .env.example），只在运行时读取，不会打印。
"""
import argparse
import asyncio
import copy
import difflib
import hashlib
import json
import math
import os
import re
import sys
import uuid
import wave
from pathlib import Path

import numpy as np
import websockets

sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from volc_tts import (  # noqa: E402
        EventType,
        MsgType,
        finish_connection,
        finish_session,
        receive_message,
        start_connection,
        start_session,
        task_request,
        wait_for_event,
    )
except ImportError:
    sys.exit(
        "缺少 pipeline/volc_tts/：从火山引擎「豆包语音合成 · 双向流式 WebSocket」文档下载官方 Python 示例，"
        "把其中的 protocols 包（__init__.py、protocols.py）放到 pipeline/volc_tts/"
    )

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "studio/public"
CONFIG = Path(__file__).resolve().parent / "tts_config.json"
LEAD_IN = 0.08   # 第一句首字前保留的静音（秒）
TAIL = 0.30      # 最后一句末字后保留的静音（秒）


def load_env():
    path = ROOT / ".env"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def auth_headers(resource_id: str):
    api_key = os.environ.get("VOLC_TTS_API_KEY")
    app_id = os.environ.get("VOLC_TTS_APP_ID")
    token = os.environ.get("VOLC_TTS_ACCESS_TOKEN")
    headers = {"X-Api-Resource-Id": resource_id, "X-Api-Connect-Id": str(uuid.uuid4())}
    if api_key:
        headers["X-Api-Key"] = api_key
    elif app_id and token:
        headers["X-Api-App-Key"] = app_id
        headers["X-Api-Access-Key"] = token
    else:
        sys.exit("缺少凭证：在 video-studio/.env 里填 VOLC_TTS_API_KEY，或 VOLC_TTS_APP_ID + VOLC_TTS_ACCESS_TOKEN")
    return headers


def plain(text: str) -> str:
    return re.sub(r"\*\*([^*]+)\*\*", r"\1", text).strip()


def norm(text: str) -> str:
    """只留文字和数字，用来把时间戳对回台词。"""
    return "".join(ch.lower() for ch in text if ch.isalnum())


def fingerprint(texts, voice, sr) -> str:
    key = json.dumps({"t": texts, "v": voice, "sr": sr}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:10]


def write_wav(path: Path, pcm: bytes, sr: int):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)


def read_wav(path: Path):
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return data, sr


def mouth_track(samples: np.ndarray, sr: int, fps: int, hold: int = 3) -> str:
    """逐帧音量 → 张嘴/闭嘴；每种状态至少保持 hold 帧，避免嘴巴抽搐。"""
    n = max(1, math.ceil(len(samples) / sr * fps))
    hop = sr / fps
    rms = np.array([np.sqrt(np.mean(samples[int(i * hop): int((i + 1) * hop)] ** 2) + 1e-12) for i in range(n)])
    thr = max(0.02, 0.35 * float(np.percentile(rms, 90)))
    raw = (rms > thr).astype(int)
    out, run_val, run_len = [], raw[0], 0
    for v in raw:
        if v != run_val and run_len >= hold:
            run_val, run_len = v, 0
        out.append(run_val)
        run_len += 1
    return "".join(map(str, out))


async def synth_speaker(texts, voice, sr):
    """一个会话合成某个角色的全部台词。返回 (pcm, words)；words = [(字, 开始秒, 结束秒)]。"""
    ws = await websockets.connect(
        voice["endpoint"], additional_headers=auth_headers(voice["resource_id"]), max_size=64 * 1024 * 1024
    )
    try:
        await start_connection(ws)
        await wait_for_event(ws, MsgType.FullServerResponse, EventType.ConnectionStarted)
        req = {
            "speaker": voice["speaker"],
            "audio_params": {
                "format": "pcm",
                "sample_rate": sr,
                "speech_rate": voice.get("speech_rate", 0),
                "loudness_rate": voice.get("loudness_rate", 0),
                "enable_subtitle": True,
            },
            "additions": json.dumps({"disable_markdown_filter": False}),
        }
        base = {"user": {"uid": "video-studio"}, "namespace": "BidirectionalTTS", "req_params": req}
        sid = str(uuid.uuid4())
        start = copy.deepcopy(base)
        start["event"] = EventType.StartSession
        await start_session(ws, json.dumps(start).encode(), sid)
        await wait_for_event(ws, MsgType.FullServerResponse, EventType.SessionStarted)

        async def send():
            for t in texts:  # 逐句送进同一个会话，模型带着上下文连续朗读
                task = copy.deepcopy(base)
                task["event"] = EventType.TaskRequest
                task["req_params"]["text"] = t
                await task_request(ws, json.dumps(task, ensure_ascii=False).encode(), sid)
                await asyncio.sleep(0.01)
            await finish_session(ws, sid)

        sender = asyncio.create_task(send())
        audio, words = bytearray(), []
        while True:
            msg = await receive_message(ws)
            if msg.type == MsgType.AudioOnlyServer:
                audio.extend(msg.payload)
            elif msg.type == MsgType.FullServerResponse:
                if msg.event == EventType.TTSSubtitle:
                    info = json.loads(msg.payload or b"{}")
                    words += [(w["word"], float(w["startTime"]), float(w["endTime"])) for w in info.get("words", [])]
                elif msg.event == EventType.SessionFinished:
                    break
                elif msg.event == EventType.SessionFailed:
                    raise RuntimeError(f"会话失败：{msg.payload.decode('utf-8', 'ignore')}")
            elif msg.type == MsgType.Error:
                raise RuntimeError(f"服务端错误 {msg.error_code}：{msg.payload.decode('utf-8', 'ignore')}")
        await sender
        try:
            await finish_connection(ws)
            await wait_for_event(ws, MsgType.FullServerResponse, EventType.ConnectionFinished)
        except Exception:
            pass
    finally:
        await ws.close()
    if not audio:
        raise RuntimeError("没有收到音频")
    if not words:
        raise RuntimeError("没有收到时间戳，无法切句（audio_params.enable_subtitle 没生效）")
    return bytes(audio), words


def line_spans(texts, words):
    """把逐字时间戳对回每句台词，返回每句 (首字开始, 末字结束)。"""
    script = ""
    owner = []
    for i, t in enumerate(texts):
        n = norm(t)
        script += n
        owner += [i] * len(n)
    spoken, times = "", []
    for w, s, e in words:
        n = norm(w)
        spoken += n
        times += [(s, e)] * len(n)
    first = [None] * len(texts)
    last = [None] * len(texts)
    sm = difflib.SequenceMatcher(None, script, spoken, autojunk=False)
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            i = owner[a + k]
            s, e = times[b + k]
            first[i] = s if first[i] is None else min(first[i], s)
            last[i] = e if last[i] is None else max(last[i], e)
    for i in range(len(texts)):
        if first[i] is None:
            raise RuntimeError(f"第 {i + 1} 句对不上时间戳：{texts[i]}")
    return list(zip(first, last))


def char_times(texts, words):
    """每句里每个字（只算文字和数字）开始的秒数；对不上的字用前后插值补齐。"""
    script, owner = "", []
    for i, t in enumerate(texts):
        n = norm(t)
        script += n
        owner += [i] * len(n)
    spoken, times = "", []
    for w, s, e in words:
        n = norm(w)
        for k in range(len(n)):
            times.append(s + (e - s) * k / max(1, len(n)))
        spoken += n
    at = [None] * len(script)
    sm = difflib.SequenceMatcher(None, script, spoken, autojunk=False)
    for a0, b0, size in sm.get_matching_blocks():
        for k in range(size):
            at[a0 + k] = times[b0 + k]
    known = [i for i, v in enumerate(at) if v is not None]
    for i in range(len(at)):
        if at[i] is None:
            lo = max([k for k in known if k < i], default=None)
            hi = min([k for k in known if k > i], default=None)
            at[i] = at[lo] if hi is None else at[hi] if lo is None else at[lo] + (at[hi] - at[lo]) * (i - lo) / (hi - lo)
    out = [[] for _ in texts]
    for i, v in enumerate(at):
        out[owner[i]].append(v)
    return out


def cut_points(spans, total):
    """相邻两句在停顿正中切开；首尾留一点静音。"""
    cuts = [max(0.0, spans[0][0] - LEAD_IN)]
    for (_, e), (s, _) in zip(spans, spans[1:]):
        cuts.append((e + s) / 2)
    cuts.append(min(total, spans[-1][1] + TAIL))
    return cuts


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    ep_path = Path(a.episode)
    ep = json.loads(ep_path.read_text(encoding="utf-8"))
    fps, sr, gap = cfg["fps"], cfg["sample_rate"], cfg["turn_gap_frames"]
    out_dir = PUBLIC / "audio" / ep["id"]

    # 按角色收集台词
    groups = {}
    for idx, line in enumerate(ep["lines"]):
        groups.setdefault(line["speaker"], []).append(idx)

    plans = {}
    for sp, idxs in groups.items():
        voice = cfg["voices"].get(sp)
        if not voice or not voice.get("speaker"):
            sys.exit(f"tts_config.json 里没有给说话人「{sp}」配置音色")
        voice = {"endpoint": cfg["endpoint"], **voice}
        texts = [plain(ep["lines"][i]["text"]) for i in idxs]
        fp = fingerprint(texts, {k: v for k, v in voice.items() if k != "endpoint"}, sr)
        wav = out_dir / f"{sp}-{fp}.wav"
        meta = wav.with_suffix(".words.json")
        need = a.force or not (wav.exists() and meta.exists())
        plans[sp] = {"idxs": idxs, "texts": texts, "voice": voice, "wav": wav, "meta": meta, "need": need}
        chars = sum(len(norm(t)) for t in texts)
        print(f"{sp}：{len(idxs)} 句，{chars} 字，音色 {voice['speaker']}，{'需要合成' if need else '有缓存'}")
    if a.dry_run:
        return

    load_env()
    for sp, p in plans.items():
        if not p["need"]:
            continue
        for attempt in range(1, 4):
            try:
                pcm, words = asyncio.run(synth_speaker(p["texts"], p["voice"], sr))
                break
            except Exception as e:
                print(f"  ! {sp} 第 {attempt} 次失败：{e}")
                if attempt == 3:
                    sys.exit(f"{sp} 合成失败")
        write_wav(p["wav"], pcm, sr)
        p["meta"].write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
        print(f"  ✓ {sp}  {len(pcm) / 2 / sr:.1f}s → {p['wav'].relative_to(ROOT)}")

    # 切句，回写分镜
    manifest = {}
    for sp, p in plans.items():
        samples, wsr = read_wav(p["wav"])
        words = json.loads(p["meta"].read_text(encoding="utf-8"))
        spans = line_spans(p["texts"], words)
        cuts = cut_points(spans, len(samples) / wsr)
        ctimes = char_times(p["texts"], words)
        for k, idx in enumerate(p["idxs"]):
            line = ep["lines"][idx]
            s, e = cuts[k], cuts[k + 1]
            line["audio"] = p["wav"].relative_to(PUBLIC).as_posix()
            line["audioStart"] = round(s, 3)
            line["audioEnd"] = round(e, 3)
            # 逐字时间：这句里第 n 个字（只算文字和数字）在第几帧开始说，给画面卡关键词用
            line["chars"] = [max(0, round((t - s) * fps)) for t in ctimes[k]]
            seg = samples[int(s * wsr): int(e * wsr)]
            manifest[line["id"]] = {"seconds": round(e - s, 3), "mouth": mouth_track(seg, wsr, fps)}

    # 帧数：切片时长；换人说话时加停顿
    lines = ep["lines"]
    for i, line in enumerate(lines):
        dur = line["audioEnd"] - line["audioStart"]
        nxt = lines[i + 1]["speaker"] if i + 1 < len(lines) else None
        line["frames"] = max(1, round(dur * fps)) + (gap if nxt != line["speaker"] else 0)
        manifest[line["id"]]["mouth"] = manifest[line["id"]]["mouth"].ljust(line["frames"], "0")[: line["frames"]]
        line["mouth"] = manifest[line["id"]]["mouth"]

    ep_path.write_text(json.dumps(ep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(l["frames"] for l in lines) / fps
    print(f"已回写 {ep_path.name}：{len(lines)} 句，全片 {total:.1f}s（{int(total // 60)}:{total % 60:04.1f}）")


if __name__ == "__main__":
    main()
