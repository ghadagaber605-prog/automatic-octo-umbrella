"""Find the page of each bookmarked heading in a rendered PDF and write toc-pages.json."""
import json, re, subprocess, sys
pdf, ids_json, out = sys.argv[1], sys.argv[2], sys.argv[3]
items = json.load(open(ids_json))                    # [[id, heading text], ...]
n = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout).group(1))
norm = lambda s: re.sub(r"[اأإآلى]", "", re.sub(r"[^ء-ي0-9]", "", s))
pages = [norm(subprocess.run(["pdftotext", "-f", str(i), "-l", str(i), pdf, "-"], capture_output=True, text=True).stdout) for i in range(1, n + 1)]
res, start = {}, 2                                   # skip cover + TOC pages
for id_, text in items:
    if id_.startswith("form"):                       # match "…رقم ( N )" only; teacher names extract unreliably
        text = text.split("—")[0]
    key = norm(text)
    pat = re.compile(re.escape(key) + r"(?!\d)")
    for i in range(start, n):
        m = pat.search(pages[i])
        if m and m.start() < 80:                     # heading sits at the top of its page, right after the running header
            res[id_] = i + 1; start = i; break
json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
missing = [i for i, _ in items if i not in res]
print(f"{len(res)}/{len(items)} headings located", "missing: " + ", ".join(missing) if missing else "")
