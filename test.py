import urllib.request
import json
import re

url = "https://raw.githubusercontent.com/petike/hu-cities-and-zip/master/cities.json"

req = urllib.request.Request("https://raw.githubusercontent.com/tothattila/hungarian-cities/master/cities.json")
try:
   res = urllib.request.urlopen(req)
   print(res.read())
except Exception as e:
   print(e)
