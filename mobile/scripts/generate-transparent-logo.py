"""Convert the supplied transparent SVG paths to Android's vector format.

SVG blur filters are kept in a separate shadow-only SVG for rasterization;
the gold Q remains a native vector with the original silhouette clip.
"""
from pathlib import Path
import copy
import re
import xml.etree.ElementTree as E

ROOT = Path(__file__).resolve().parents[1]
SVG = '{http://www.w3.org/2000/svg}'
ANDROID = '{http://schemas.android.com/apk/res/android}'
E.register_namespace('android', ANDROID[1:-1])
source = E.parse(ROOT / 'artwork/brand-q-extra-golden-thick-transparent.svg').getroot()

def translated(parent, transform):
    values = re.fullmatch(r'translate\(([-\d.]+)[, ]+([-\d.]+)\)', transform)
    if values is None:
        raise ValueError(transform)
    x, y = values.groups()
    return E.SubElement(parent, 'group', {ANDROID+'translateX': x, ANDROID+'translateY': y}), x, y

vector = E.Element('vector', {ANDROID+'width': '156dp', ANDROID+'height': '156dp',
                            ANDROID+'viewportWidth': '1254', ANDROID+'viewportHeight': '1254'})
silhouette = source.find(f'{SVG}defs/{SVG}clipPath/{SVG}path')
clip_group, x, y = translated(vector, silhouette.get('transform'))
E.SubElement(clip_group, 'clip-path', {ANDROID+'pathData': silhouette.get('d')})
paths_group = E.SubElement(clip_group, 'group', {ANDROID+'translateX': str(-float(x)),
                                             ANDROID+'translateY': str(-float(y))})
for path in source.find(f'{SVG}g'):
    group, _, _ = translated(paths_group, path.get('transform'))
    E.SubElement(group, 'path', {ANDROID+'pathData': path.get('d'), ANDROID+'fillColor': path.get('fill')})
output = ROOT / 'app/src/main/res/drawable/logo_gold_3d_paths.xml'
E.ElementTree(vector).write(output, encoding='utf-8', xml_declaration=True)
# Keep elements on separate lines for Android lint's position-aware XML parser.
output.write_text(output.read_text().replace('><', '>\n<'))

shadows = copy.deepcopy(source)
shadows.remove(shadows.find(f'{SVG}g'))
E.register_namespace('', SVG[1:-1])
E.ElementTree(shadows).write(ROOT / 'artwork/brand-q-extra-golden-thick-shadows.svg', encoding='utf-8', xml_declaration=True)
print('Generated transparent gold vector and shadow-only SVG')
