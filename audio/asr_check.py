"""Optional listening test with speech recognizers already on this machine. Never downloads anything, never
used for synthesis. Run inside an environment that has faster-whisper / transformers / funasr:

    <venv python> asr_check.py wav16k.wav [--models large,anime,sense] [--clip a:b ...] [--json out.json]
"""
import argparse
import json
import os
import sys
import wave

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['MODELSCOPE_OFFLINE'] = '1'
import numpy as np

HUB = r'D:\Utils\LiveTranslate\models\huggingface\hub'
LARGE = HUB + r'\models--Systran--faster-whisper-large-v3\snapshots\edaa852ec7e145841d8ffdb056a99866b5f0a478'
MEDIUM = HUB + r'\models--Systran--faster-whisper-medium\snapshots\08e178d48790749d25932bbc082711ddcfdfbc4f'
ANIME = HUB + r'\models--litagin--anime-whisper\snapshots\22e2008a8182b357da3922a6308d095008f72973'


def load(p):
    with wave.open(p, 'rb') as w:
        if w.getframerate() != 16000 or w.getnchannels() != 1 or w.getsampwidth() != 2:
            raise SystemExit('need 16 kHz mono 16-bit')
        return np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('wav', nargs='+')
    ap.add_argument('--models', default='large,anime')
    ap.add_argument('--clip', nargs='*', default=[])
    ap.add_argument('--json')
    ap.add_argument('--device', default='cuda')
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding='utf-8')
    res = []
    jobs = []
    for p in a.wav:
        x = load(p)
        if a.clip:
            for c in a.clip:
                s, e = (float(q) for q in c.split(':'))
                jobs.append((f'{os.path.basename(p)}[{s:.2f}-{e:.2f}]', x[int(s * 16000):int(e * 16000)]))
        else:
            jobs.append((os.path.basename(p), x))
    jobs = [(n, np.concatenate([np.zeros(6400, np.float32), x / max(1e-6, np.abs(x).max()) * 0.6, np.zeros(8000, np.float32)])) for n, x in jobs]
    for mname in a.models.split(','):
        if mname in ('large', 'medium'):
            from faster_whisper import WhisperModel
            path = LARGE if mname == 'large' else MEDIUM
            try:
                m = WhisperModel(path, device=a.device, compute_type='int8_float16' if a.device == 'cuda' else 'int8', local_files_only=True)
                list(m.transcribe(np.zeros(16000, np.float32), language='ja')[0])
            except Exception as ex:
                print('cuda failed, using cpu:', str(ex)[:120], file=sys.stderr)
                m = WhisperModel(path, device='cpu', compute_type='int8', cpu_threads=12, local_files_only=True)
            for n, x in jobs:
                segs, info = m.transcribe(x, language='ja', beam_size=5, temperature=0.0, condition_on_previous_text=False,
                                          vad_filter=False, no_speech_threshold=None, log_prob_threshold=None,
                                          word_timestamps=False)
                segs = list(segs)
                txt = ''.join(s.text for s in segs)
                lp = float(np.mean([s.avg_logprob for s in segs])) if segs else None
                res.append(dict(model=mname, clip=n, text=txt, avg_logprob=lp))
                print(f'{mname:7s} {n:28s} {txt}   lp={lp if lp is None else round(lp, 2)}', flush=True)
            del m
        elif mname == 'anime':
            import torch
            from transformers import WhisperForConditionalGeneration, WhisperProcessor
            dev = 'cuda' if torch.cuda.is_available() and a.device == 'cuda' else 'cpu'
            pr = WhisperProcessor.from_pretrained(ANIME, local_files_only=True)
            m = WhisperForConditionalGeneration.from_pretrained(ANIME, dtype=torch.float16 if dev == 'cuda' else torch.float32, local_files_only=True).to(dev)
            for n, x in jobs:
                f = pr(x, sampling_rate=16000, return_tensors='pt').input_features.to(dev, m.dtype)
                ids = m.generate(f, language='ja', task='transcribe', do_sample=False, num_beams=3, no_repeat_ngram_size=5, max_new_tokens=80)
                txt = pr.batch_decode(ids, skip_special_tokens=True)[0]
                res.append(dict(model=mname, clip=n, text=txt))
                print(f'{mname:7s} {n:28s} {txt}', flush=True)
            del m
            if dev == 'cuda':
                torch.cuda.empty_cache()
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as fp:
            json.dump(res, fp, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
