# MosqueFinder
This website is hosted in AWS S3 as static website
URL: https://mosque-finder.com.au/
REPO: https://github.com/shafiiub/MosqueFinder

## Structure
_data files contain all data required as JSON

### _data
_data/Suburblist.json contains JSON and URL path to load this suburb in google map
‘‘‘
{
  "id": "1",
  "Suburb": "Australian National University",
  "State": "ACT",
  "Postcode": "0200",
  "Latitude": "-35.28000",
  "Longitude": "149.12000",
  "url": "act/0200/australian national university"
}
‘‘‘

_data/mosque_home.json contains all prayer location info 
‘‘‘
{
            "id": 8,
            "title": "University of New England Masque",
            "State": "NSW",
            "Postcode": "2350",
            "Suburb": "Armidale",
            "location": "Booloominbah Drive",
            "category": "Mosque",
            "latitude": "-30.48954",
            "longitude": "151.64586",
            "url": "/mosque/university-of-new-england-masque/",
            "type": "Mosque",
            "type_icon": "/assets/icons/tourism/cult-religion/mosquee.png",
            "description": "<p>The mosque is situated in the main entrance of the University of New England, ...</p>",
            "gallery": [
                "/assets/Uploads/new-photo-request.jpg"
            ],
            "features": [
                "Toilets",
                "Educational facility",
                "Car park "
            ]
        }
‘‘‘

_data/mosque_json.json contains JSON and URL path to load this suburb in google map
‘‘‘
{
            "id": "8",
            "Title": "University of New England Masque",
            "URLSegment": "university-of-new-england-masque",
            "Teaser": "Prayer location near University of New England",
            "ListingType": "Mosque",
            "Address": "Booloominbah Drive",
            "Suburb": "Armidale",
            "State": "NSW",
            "Postcode": "2350",
            "Latitude": "-30.48954",
            "Longitude": "151.64586",
            "Phone": null,
            "Fax": null,
            "Email": "mosque@une.edu.au",
            "Website": "http://www.une.edu.au/current-students/support/student-services/muslim@une",
            "JummahLocation": "0",
            "JummahDescription": " Friday prayers normally begins at 1:15 pm",
            "JummahTime": "1:15",
            "JummahAddress": null,
            "JummahLatitude": "0.00000",
            "JummahLongitude": "0.00000",
            "gallery": [
                "/assets/Uploads/new-photo-request.jpg"
            ],
            "features": [
                "Toilets",
                "Educational facility",
                "Car park "
            ],
            "Content": "<p>The mosque is situated in the main entrance of the University of New England, adjacent to the Deer Park and the Boolaminbah tennis courts. ....</p>"
        },
‘‘‘
### _templates
Four unique page templets 
- home.html
- mosque-detail.html
- state-listing.html
- suburb-prayertime.html

### public (hosted in S3)
The script create the files in static folders
- public (root directory)
- public/assets (css/js/images)
- public/mosque (contain listings)
- state folder (contains specific state postcode)


## How to generate the static files

### Install Node dependency
‘‘‘
      - echo Installing fs, json, express, async, pip...
      - npm install -g npm@12.0.2
      - npm install -g fs@0.0.1-security
      - npm install -g json@^9.0.6
      - npm install -g express@4.17.1
      - npm install -g async@3.2.0
      - npm install -g path@^0.12.7
      - npm install -g pip@0.0.1
‘‘‘

‘‘‘
  - node loadDateToPage-v2.js
  - node copyDataFiles.js
  - node loadStatePrayerTimeSitemap.js
  - node loadStateList.js
  - node loadMosqueDetails.js
‘‘‘

### Run server as local host 
‘‘‘
  - node serve.js
  > server running on http://localhost:5000/
‘‘‘
## Static files files are generated inside the public folder
