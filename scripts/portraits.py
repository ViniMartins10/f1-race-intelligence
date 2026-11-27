"""Refresh the portrait assets. Only Creative Commons and public domain files are kept."""
import html
import io
import json
import pathlib
import re
import sys
import time
import unicodedata
from urllib.parse import quote, urlencode, unquote, urlparse
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'portraits'
NAMES = [
    'Lando Norris', 'Oscar Piastri', 'Lewis Hamilton', 'Charles Leclerc', 'Max Verstappen',
    'George Russell', 'Kimi Antonelli', 'Fernando Alonso', 'Lance Stroll', 'Pierre Gasly',
    'Jack Doohan', 'Franco Colapinto', 'Esteban Ocon', 'Oliver Bearman', 'Nico Hülkenberg',
    'Gabriel Bortoleto', 'Liam Lawson', 'Isack Hadjar', 'Yuki Tsunoda',
    'Alexander Albon', 'Alex Albon', 'Carlos Sainz Jr.', 'Sergio Pérez', 'Valtteri Bottas',
    'Arvid Lindblad', 'Daniel Ricciardo', 'Kevin Magnussen', 'Zhou Guanyu', 'Logan Sargeant',
    'Robert Shwartzman', 'Nyck de Vries', 'Felipe Drugovich', 'Paul Aron',
]
ALIASES = {'carlos sainz jr.': ['carlos sainz'], 'kimi antonelli': ['andrea kimi antonelli'],
           'alex albon': ['alexander albon'], 'alexander albon': ['alex albon'], 'zhou guanyu': ['guanyu zhou']}
COMMONS = {
    'Lewis Hamilton': 'Lewis Hamilton 2022 São Paulo Grand Prix (52498120773) (cropped).jpg',
    'George Russell': '2024-08-25 Motorsport, Formel 1, Großer Preis der Niederlande 2024 STP 3908 by Stepro.jpg',
    'Fernando Alonso': '2024-08-25 Motorsport, Formel 1, Großer Preis der Niederlande 2024 STP 3801 by Stepro.jpg',
    'Liam Lawson': 'Liam Lawson Honda US 2025.jpg',
    'Isack Hadjar': 'Isack Hadjar 2025.png',
    'Yuki Tsunoda': 'Yuki Tsunoda 2025.png',
    'Alexander Albon': 'Alex Albon at the Melbourne Walk during the 2026 Australian Grand Prix (028A8626) (cropped).jpg',
    'Valtteri Bottas': 'Valtteri Bottas at the 2026 Adelaide Motorsport Festival (028A7556).jpg',
}

def read(url):
    request = Request(url, headers={'User-Agent': 'RaceIntelligencePortfolio/1.0 (educational motorsport project; asset attribution in site credits)'})
    with urlopen(request, timeout=15) as response:
        return response.read()

def key(name):
    return ''.join(char for char in unicodedata.normalize('NFD', name.lower()) if not unicodedata.combining(char))

def text(value):
    return html.unescape(re.sub('<[^>]*>', '', value)).strip()

def portrait(name):
    try:
        file = COMMONS.get(name)
        if not file:
            summary = json.loads(read('https://en.wikipedia.org/api/rest_v1/page/summary/' + quote(name.replace(' ', '_'))))
            url = summary['originalimage']['source']
            file = unquote(urlparse(url).path.rsplit('/', 1)[-1])
        query = urlencode({'action': 'query', 'titles': 'File:' + file, 'prop': 'imageinfo',
                           'iiprop': 'extmetadata|url', 'iiurlwidth': 540, 'format': 'json'})
        answer = json.loads(read('https://commons.wikimedia.org/w/api.php?' + query))
        info = next(iter(answer['query']['pages'].values()))['imageinfo'][0]
        metadata = info['extmetadata']
        license_name = metadata['LicenseShortName']['value']
        if not re.match(r'^(CC BY(?:-SA)? [\d.]|CC0|Public domain)', license_name, re.IGNORECASE):
            return None
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(read(info.get('thumburl', info['url']))))).convert('RGB')
        image.thumbnail((540, 750))
        slug = re.sub(r'[^a-z0-9]+', '-', key(name)).strip('-') + '.webp'
        image.save(ROOT / slug, quality=85, method=4)
        return key(name), {'file': '/portraits/' + slug, 'source': info['descriptionurl'],
                           'license': license_name, 'author': text(metadata.get('Artist', {}).get('value', '')),
                           'licenseUrl': metadata.get('LicenseUrl', {}).get('value', '')}
    except (ValueError, OSError, KeyError, IndexError) as error:
        print(f'{name}: {error}')
        return None

if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    credits_file = ROOT / 'credits.json'
    credits = json.loads(credits_file.read_text(encoding='utf-8')) if credits_file.exists() else {}
    for driver in sys.argv[1:] or NAMES:
        if key(driver) in credits:
            continue
        item = portrait(driver)
        if item:
            name, credit = item
            credits[name] = credit
            for alias in ALIASES.get(name, []):
                credits[alias] = credit
        time.sleep(1)
    credits_file.write_text(json.dumps(credits, indent=2, ensure_ascii=False, sort_keys=True) + '\n', encoding='utf-8')
    print(f'{len(set(credit["file"] for credit in credits.values()))} licensed portraits')
