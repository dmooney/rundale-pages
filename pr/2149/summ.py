import json, sys
rows = [json.loads(l) for l in sys.stdin if l.startswith("{")]
names = ("Mícheál", "Róisín", "Siobhán", "Michael", "Rosie")
for inp in dict.fromkeys(r["input"] for r in rows):
    rs = [r for r in rows if r["input"] == inp]
    good = 0
    for r in rs:
        try:
            o = json.loads(r["text"])
            good += r["finish"] == "STOP" and o.get("intent") == "talk" and (o.get("target") or "").strip() in names and bool(o.get("dialogue"))
        except Exception:
            pass
    maxtok = sum(r["finish"] != "STOP" for r in rs)
    print(f"  {inp!r}: clean {good}/{len(rs)}; max_tokens {maxtok}; thoughts {[r.get('thoughts') for r in rs][:3]}; sample {rs[0]['text'][:120]!r}")
