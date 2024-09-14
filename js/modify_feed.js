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
          link.$.href = 'https://raw.githubusercontent.com/braboobssiere/misc-codes/main/feeds/space_monster.atom';
        }
        return link;
      });
    }

    // 2. Remove <subtitle> element only if it's empty
    if (result.feed && result.feed.subtitle === '') {
      delete result.feed.subtitle;
    }

    // 3. Update <author> for each entry
    if (result.feed.entry) {
      result.feed.entry = result.feed.entry.map(entry => {
        // Update <author> if <name> is empty
        if (entry.author) {
          if (!entry.author.name || entry.author.name === '') {
            entry.author.name = 'feedless.org';
          }
        } else {
          // Add <author> if missing
          entry.author = { name: 'feedless.org' };
        }

        return entry;
      });
    }

    // 4. Change <link> format of each entry
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

    // 5. Change <id> to use the existing UUID from the URL (last 36 characters)
    if (result.feed.entry) {
      result.feed.entry = result.feed.entry.map(entry => {
        const idUrl = entry.id;
        if (idUrl) {
          const uuid = idUrl.slice(-36); // Extract last 36 characters
          entry.id = `urn:uuid:${uuid}`;
        }
        return entry;
      });
    }

    // 6. Replace global <id> with UUID
    if (result.feed.id) {
      const globalIdUrl = result.feed.id;
      const globalUuid = globalIdUrl.slice(-36); // Extract last 36 characters
      result.feed.id = `urn:uuid:${globalUuid}`;
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
