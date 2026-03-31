import zipfile, xml.etree.ElementTree as ET, os, glob
def extract_paragraphs(docx_path):
    try:
        with zipfile.ZipFile(docx_path) as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = []
            for p in tree.iterfind(".//w:p", ns):
                texts = [node.text for node in p.iterfind(".//w:t", ns) if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n".join(paragraphs)
    except Exception as e:
        return str(e)

for f in glob.glob("*.docx"):
    txt = extract_paragraphs(f)
    print(f"Extracted {f}: {len(txt)} chars")
    with open(f + ".txt", "w", encoding="utf-8") as out:
        out.write(txt)

