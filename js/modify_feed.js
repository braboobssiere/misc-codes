const fs = require('fs');
const xml2js = require('xml2js');

// Define the file path
const feedFilePath = 'feeds/space_monster.atom';

// Read the XML file
fs.readFile(feedFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading the file: ${err}`);
    return;
  }

  // Parse the XML
  xml2js.parseString(data, { explicitArray: false }, (err, result) => {
    if (err) {
      console.error(`Error parsing the XML: ${err}`);
      return;
    }

    // 1. Edit <link rel="self"> to point to a new location
    if (result.feed && result.feed.link) {
      result.feed.link = result.feed.link.map(link => {
        if (link.$.rel === 'self') {
          link.$.href = 'https://example.com/examplelocation.atom';
        }
        return link;
      });
    }

    // 2. Remove all <subtitle> and <name> elements
    delete result.feed.subtitle;
    
    if (result.feed.entry) {
      result.feed.entry = result.feed.entry.map(entry => {
        if (entry.author && entry.author.name) {
          delete entry.author.name;
        }
        return entry;
      });
    }

    // 3. Change <link> format of each entry
    if (result.feed.entry) {
      result.feed.entry = result.feed.entry.map(entry => {
        if (entry.link) {
          entry.link.$.href = entry.link.$.href;
          entry.link.$.rel = 'alternate';
          entry.link.$.type = 'text/html';
        }
        return entry;
      });
    }

    // 4. Change <id> to use the existing UUID from the URL (last 36 characters)
    if (result.feed.entry) {
      result.feed.entry = result.feed.entry.map(entry => {
        const idUrl = entry.id;
        const uuid = idUrl.slice(-36); // Extract last 36 characters
        entry.id = `urn:uuid:${uuid}`;
        return entry;
      });
    }

    // Convert the modified object back to XML
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(result);

    // Write the modified XML back to the file
    fs.writeFile(feedFilePath, xml, (err) => {
      if (err) {
        console.error(`Error writing the file: ${err}`);
        return;
      }
      console.log('Feed modified successfully.');
    });

});
});
