"""Physically reverse column order in every table of a .docx so tables read
right-to-left in any viewer (Word, Google Docs, phones), instead of relying on
<w:bidiVisual/>, which some viewers ignore."""
import sys, zipfile, shutil, tempfile, os
from lxml import etree
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
q = lambda t: "{%s}%s" % (W, t)

def fix(xml):
    root = etree.fromstring(xml)
    for tbl in root.iter(q("tbl")):
        pr = tbl.find(q("tblPr"))
        if pr is not None:
            for b in pr.findall(q("bidiVisual")): pr.remove(b)
        grid = tbl.find(q("tblGrid"))
        if grid is not None:
            cols = grid.findall(q("gridCol"))
            for c in cols: grid.remove(c)
            for c in reversed(cols): grid.append(c)
        for tr in tbl.findall(q("tr")):
            cells = [c for c in tr if c.tag == q("tc")]
            if not cells: continue
            first = list(tr).index(cells[0])
            for c in cells: tr.remove(c)
            for i, c in enumerate(reversed(cells)): tr.insert(first + i, c)
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)

def main(path):
    tmp = tempfile.mktemp(suffix=".docx")
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml": data = fix(data)
            zout.writestr(item, data)
    shutil.move(tmp, path)

if __name__ == "__main__":
    main(sys.argv[1])
