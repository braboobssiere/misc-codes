import requests
import xml.etree.ElementTree as ET
import urllib.parse
from xml.dom import minidom
import re

def modify_rss_feed():
    # Fetch the RSS feed
    rss_url = "https://politepol.com/fd/fOrdd29ndzQa.xml"
    response = requests.get(rss_url)
    response.raise_for_status()  # Ensure the request was successful

    # Parse the RSS feed
    root = ET.fromstring(response.content)

    # Loop through each <item> element
    for item in root.findall(".//item"):
        # Extract title and description
        title = item.find("title").text
        description = item.find("description").text
        link = item.find("link").text
        
        # Combine title and description for the new title
        new_title = f"{title} / {description}"

        # Construct the new YouTube search link
        search_query = urllib.parse.quote(f"{title} / {description}")
        new_link = f"https://youtube.com/results?search_query={search_query}"
        
        # Replace the description with the original link
        item.find("description").text = link

        # Update the title and link
        item.find("title").text = new_title
        item.find("link").text = new_link

        # Strip the URL part from the <guid> tag
        guid = item.find("guid")
        if guid is not None:
            guid_text = guid.text
            match = re.search(r'/p/(\d+)$', guid_text)
            if match:
                guid.text = match.group(1)
            guid.attrib.pop('isPermaLink', None)

    # Output the modified RSS feed as a string
    modified_feed = ET.tostring(root, encoding='unicode', method='xml')

    # Format the RSS feed to be more human-readable
    # Parse the string back into a minidom object for pretty-printing
    parsed_feed = minidom.parseString(modified_feed)
    pretty_feed = parsed_feed.toprettyxml(indent="  ")

    # Save the formatted RSS feed to the correct location
    with open("feeds/ototoy_hololive.rss", "w", encoding="utf-8") as f:
        f.write(pretty_feed)

    print("RSS feed successfully modified and formatted.")

if __name__ == "__main__":
    modify_rss_feed()