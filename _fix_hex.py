import re
import pathlib

root = pathlib.Path(__file__).parent
subs = [
    (r"#E3F2FD", "var(--soft)"),
    (r"#e3f2fd", "var(--soft)"),
    (r"#ffffff", "var(--surface)"),
    (r"#0F2740", "var(--fg)"),
    (r"#0f2740", "var(--fg)"),
    (r"#D6E8F5", "var(--border)"),
    (r"#d6e8f5", "var(--border)"),
    (r"#90CAF9", "var(--accent)"),
    (r"#90caf9", "var(--accent)"),
    (r"#2B6EA8", "var(--accent-ink)"),
    (r"#2b6ea8", "var(--accent-ink)"),
]
# short #fff after longer whites
subs.append((r'#fff(?![a-fA-F0-9])', "var(--surface)"))

for p in root.glob("*.html"):
    t = p.read_text(encoding="utf-8")
    orig = t
    for a, b in subs:
        t = re.sub(a, b, t)
    t = t.replace('content="var(--surface)"', 'content="#ffffff"')
    t = t.replace('content="var(--soft)"', 'content="#E3F2FD"')
    if t != orig:
        p.write_text(t, encoding="utf-8")
        print("updated", p.name)
    else:
        print("noop", p.name)
