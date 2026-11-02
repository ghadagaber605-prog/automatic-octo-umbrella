"""QR codes embedded in the visits record (tools/qr/*.png)."""
import segno, os
D = os.path.join(os.path.dirname(__file__), "qr")
LINKS = {
    "drive-scans": "https://drive.google.com/file/d/1WjgzUbZeUlBK_Fe1ssH2GcbwU8fU4-rI",  # Drive › نماذج من الزيارات الصفية › «نماذج من الزيارات الصفية pdf»
    "online-record": "https://claude.ai/artifact/AHA38L1VWBLSnAzs1ym7fx",                     # السجل الإلكتروني
}
for k, url in LINKS.items():
    segno.make(url, error="m").save(os.path.join(D, k + ".png"), scale=10, border=4, dark="#0F5F5C")
    print(k, url)
