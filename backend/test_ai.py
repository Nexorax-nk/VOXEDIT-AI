import requests

url = "http://localhost:8000/plan"
data = {"command": "Please speed up the video by 2x and make it black and white"}

response = requests.post(url, data=data)
print(response.json())