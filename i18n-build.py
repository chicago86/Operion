from pathlib import Path
from html.parser import HTMLParser
import re, json, ast, html
ROOT=Path(__file__).parent
DIST=ROOT/'dist'
JS=['app.js','experience.js','operion-os.js','journey.js','contact.js','responsive.js']
CYR=re.compile('[А-Яа-яІіЇїЄєҐґ]')
TOKEN=re.compile(r'''(?P<comment>//[^\n]*|/\*[\s\S]*?\*/)|(?P<string>'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(?P<template>`(?:\\.|[^`\\])*`)''')
EXPR=re.compile(r'\$\{[^}]*\}')
def decode(token):
 return ast.literal_eval(token)
def template_parts(token):
 raw=token[1:-1]; expressions=[]
 def replace(m): expressions.append(m.group(0));return '${'+str(len(expressions)-1)+'}'
 key=EXPR.sub(replace,raw).replace('\\n','\n')
 return key,expressions
class Texts(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.keys=[];self.skip=0
 def handle_starttag(self,t,attrs):
  if t in ['script','style']:self.skip+=1
  for k,v in attrs:
   if k in ['alt','title','placeholder','aria-label','content'] and v and (CYR.search(v) or k=='aria-label'):self.keys.append(v.strip())
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip-=1
 def handle_data(self,d):
  v=d.strip()
  if not self.skip and v and re.search(r'[A-Za-zА-Яа-яІіЇїЄєҐґ]',v):self.keys.append(v)
def collect():
 parser=Texts();parser.feed((DIST/'index.html').read_text());keys=parser.keys
 for name in JS:
  for m in TOKEN.finditer((DIST/name).read_text()):
   if m.group('string'):
    try:v=decode(m.group())
    except (ValueError,SyntaxError):continue
    if CYR.search(v):keys.append(v)
   elif m.group('template'):
    v,_=template_parts(m.group())
    if CYR.search(v):keys.append(v)
 return list(dict.fromkeys(keys))
def build():
 keys=json.loads((ROOT/'i18n-keys.json').read_text())
 rows={}
 for f in sorted(ROOT.glob('translations-*.json')):
  for i,en,es in json.loads(f.read_text()):
   if i in rows:raise ValueError(f'Duplicate translation {i}')
   rows[i]=(en,es)
 italian={}
 for f in sorted(ROOT.glob('italian-*.json')):
  for i,value in json.loads(f.read_text()):
   if i in italian:raise ValueError(f'Duplicate Italian translation {i}')
   italian[i]=value
 missing=[(i,k) for i,k in enumerate(keys) if CYR.search(k) and i not in rows]
 if missing:raise ValueError(f'Missing translations: {missing}')
 missing_it=[(i,k) for i,k in enumerate(keys) if CYR.search(k) and i not in italian]
 if missing_it:raise ValueError(f'Missing Italian translations: {missing_it}')
 if collect()!=keys:raise ValueError('Source text changed: re-extract and update catalog before building')
 class Renderer(HTMLParser):
  def __init__(self,mapping):super().__init__(convert_charrefs=False);self.mapping=mapping;self.out=[];self.skip=0
  def translate(self,s):
   k=html.unescape(s).strip()
   return s[:len(s)-len(s.lstrip())]+self.mapping[k]+s[len(s.rstrip()):] if k in self.mapping else s
  def handle_starttag(self,t,attrs):
   raw=self.get_starttag_text()
   if t in ['script','style']:self.skip+=1
   def attr(m):
    name,quote,value=m.group(1),m.group(2),m.group(3)
    if name.lower() in ['alt','title','placeholder','aria-label','content']:
     key=html.unescape(value).strip()
     if key in self.mapping:value=html.escape(self.mapping[key],quote=True)
    return name+'='+quote+value+quote
   raw=re.sub(r'''([\w:-]+)\s*=\s*(["'])(.*?)\2''',attr,raw,flags=re.S)
   self.out.append(raw)
  def handle_startendtag(self,t,attrs):self.handle_starttag(t,attrs)
  def handle_endtag(self,t):
   self.out.append('</'+t+'>')
   if t in ['script','style']:self.skip-=1
  def handle_data(self,d):self.out.append(d if self.skip else html.escape(self.translate(d),quote=False) if d.strip() in self.mapping else d)
  def handle_entityref(self,n):self.out.append('&'+n+';')
  def handle_charref(self,n):self.out.append('&#'+n+';')
  def handle_decl(self,d):self.out.append('<!'+d+'>')
  def handle_comment(self,d):self.out.append('<!--'+d+'-->')
 for lang in ['en','it']:
  mapping={keys[i]:values[0] for i,values in rows.items()} if lang=='en' else {keys[i]:value for i,value in italian.items()}
  parser=Renderer(mapping);parser.feed((DIST/'index.html').read_text());page=''.join(parser.out)
  page=page.replace('<html lang="uk">',f'<html lang="{lang}">')
  for name in JS:page=page.replace('src="'+name+'"','src="'+name.replace('.js','.'+lang+'.js')+'"')
  origin='https://operion-energy-platform-v2.redgecko14.chatgpt.site'
  page=page.replace(f'<link rel="canonical" href="{origin}/">',f'<link rel="canonical" href="{origin}/{lang}.html">')
  (DIST/(lang+'.html')).write_text(page)
  for name in JS:
   def translate_token(m):
    token=m.group()
    if m.group('string'):
     try:key=decode(token)
     except (ValueError,SyntaxError):return token
     return json.dumps(mapping[key],ensure_ascii=False) if key in mapping else token
    if m.group('template'):
     key,expressions=template_parts(token)
     if key in mapping:
      value=mapping[key]
      if sorted(EXPR.findall(value))!=sorted(EXPR.findall(key)):raise ValueError(f'Placeholder mismatch: {key}')
      value=value.replace('\\','\\\\').replace('`','\\`').replace('\n','\\n')
      for i,expression in enumerate(expressions):value=value.replace('${'+str(i)+'}',expression)
      return '`'+value+'`'
    return token
   source=TOKEN.sub(translate_token,(DIST/name).read_text())
   # Comments are source documentation, not rendered interface content.
   rendered=TOKEN.sub(lambda m:'' if m.group('comment') else m.group(),source)
   if CYR.search(rendered):raise ValueError(f'Untranslated JS in {lang}/{name}')
   (DIST/name.replace('.js','.'+lang+'.js')).write_text(source)
  if CYR.search(page):raise ValueError(f'Untranslated HTML in {lang}')
 print(f'Built EN + IT: {len(rows)} English and {len(italian)} Italian entries.')
if __name__=='__main__':
 import sys
 if '--extract' in sys.argv:
  keys=collect();(ROOT/'i18n-keys.json').write_text(json.dumps(keys,ensure_ascii=False,indent=2));print('Keys:',len(keys));print('\n'.join(f'{i}: {k}' for i,k in enumerate(keys)))
 else:build()
