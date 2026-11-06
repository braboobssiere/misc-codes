const words = [
    // Trait
    ['charming', 'wealthy', 'wise', 'furious', 'charismatic', 'noble', 'fearless', 'malevolent', 'resourceful', 'bold'],
    // Place (Man-Made)
    ['temple', 'castle', 'tower', 'fortress', 'shrine', 'citadel', 'altar', 'observatory', 'library', 'village'],
    // Class/Job
    ['cleric', 'archmage', 'paladin', 'rogue', 'necromancer', 'bard', 'sorcerer', 'berserker', 'alchemist', 'assassin'],
    // Action
    ['dropped', 'crafted', 'buried', 'summoned', 'stolen', 'lost', 'found', 'given', 'hidden', 'discovered'],
    // State of Thing
    ['frozen', 'fragile', 'bloody', 'enchanted', 'broken', 'cursed', 'magical', 'hardened', 'ancient', 'poisonous'],
    // Item
    ['grimoire', 'amulet', 'spear', 'scroll', 'elixir', 'bracelet', 'talisman', 'chalice', 'boots', 'staff'],
    // Preposition
    ['near', 'from', 'under', 'above', 'within', 'beyond', 'beside', 'among', 'behind', 'around'],
    // Feeling
    ['jealous', 'envious', 'enraged', 'afraid', 'nervous', 'thirsty', 'excited', 'suspicious', 'annoyed', 'dirtied'],
    // Place (Natural)
    ['swamp', 'forest', 'cave', 'mountain', 'desert', 'river', 'jungle', 'volcano', 'glacier', 'marsh'],
    // Monster Type
    ['dragon', 'troll', 'goblin', 'griffin', 'basilisk', 'hydra', 'chimera', 'harpy', 'wraith', 'kraken']
];

const words = [
    // Adjective
    ['delicious', 'spicy', 'sweet', 'savory', 'refreshing', 'hearty', 'tasty', 'zesty', 'creamy', 'crunchy'],
    // Noun (Food Item)
    ['sushi', 'pizza', 'pasta', 'tacos', 'salad', 'burger', 'cake', 'ice cream', 'curry', 'sandwich'],
    // Verb (Action)
    ['cooked', 'baked', 'grilled', 'prepared', 'savored', 'tasted', 'mixed', 'chopped', 'served', 'enjoyed'],
    // Preposition
    ['in', 'at', 'on', 'with', 'during', 'while', 'for', 'about', 'through', 'between'],
    // Noun (Place - Setting)
    ['the kitchen', 'a restaurant', 'a café', 'the garden', 'a barbecue', 'a food truck', 'a bakery', 'the dining room', 'the patio', 'the picnic table'],
    // Preposition
    ['as', 'when', 'since', 'until', 'before', 'after', 'alongside', 'during the time', 'throughout', 'in the course of'],
    // Verb (Action)
    ['trying', 'exploring', 'learning', 'creating', 'experimenting', 'sharing', 'enjoying', 'discovering', 'documenting', 'photographing'],
    // Adjective
    ['new', 'exciting', 'traditional', 'unique', 'classic', 'healthy', 'gourmet', 'simple', 'quick', 'homemade'],
    // Noun (Food Challenge)
    ['recipes', 'dishes', 'flavors', 'ingredients', 'cuisines', 'meals', 'snacks', 'treats', 'drinks', 'desserts']
];

const words = [
  ['I', 'We', 'They', 'She', 'He', 'Us'],
  ['love', 'enjoy', 'like', 'prefer', 'appreciate', 'taste'],
  ['sushi', 'pizza', 'salad', 'ice cream', 'pasta', 'tacos'],
  ['with coffee', 'with tea', 'with wine', 'with juice', 'with beer', 'with soda'],
  ['while cooking', 'while baking', 'while gardening', 'while painting', 'while hiking', 'while reading'],
  ['in the evening', 'on weekends', 'during the week', 'in the summer', 'in the winter', 'at night'],
  ['to relax', 'for fun', 'to learn', 'to explore', 'to socialize', 'to unwind'],
  ['with friends', 'alone', 'at home', 'in a class', 'at the park', 'at a restaurant']
];

  generateRandomSentence: function() {
    function getRandomInt(min, max) {
        const range = max - min + 1;
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return min + (array[0] % range);
    }

    var sentence = this.words.map(row => row[getRandomInt(0, row.length - 1)]).join(' ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
},

// Example usage:
console.log(generateRandomSentence());
