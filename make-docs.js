const fs = require('fs');
const URL = 'https://guidokessels.github.io/wh-underworlds';

const readJSONFile = filename => {
  const contents = fs.readFileSync(__dirname + '/' + filename);
  return JSON.parse(contents);
};

const makeHeader = () => {
  return `# [Warhammer: Underworlds Companion](${URL})
`;
};

const addHeader = md => {
  return `${makeHeader()}
  
${md}`;
};

const makeFilename = str =>
  str
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^A-Za-z0-9-]/, '');

const makeMdFilename = str => makeLink(str) + '.md';
const makeLink = str => makeFilename(str);

const writeMdFile = (filename, contents) => {
  console.log(`Writing ${filename}`);
  fs.writeFileSync(__dirname + '/docs/' + filename, contents);
};

const findCards = (stack, filter) => stack.filter(filter);
const findLocation = (stack, location) => findCards(stack, d => d.location === location);
const findFaction = (stack, faction) => findCards(stack, d => d.faction === faction);
const findPloys = stack => findCards(stack, d => d.type === 'Ploy');
const findUpgrades = stack => findCards(stack, d => d.type === 'Upgrade');
const findObjectives = stack => findCards(stack, d => d.type === 'Objective');

const createCardLink = card => `[${card.name}](${URL}/cards/${makeLink(card.name)})`;
const createLocationLink = location => `[${location}](${URL}${'/locations/' + makeLink(location)})`;
const createFactionLink = faction => `[${faction}](${URL}${'/factions/' + makeLink(faction)})`;

const createCard = item => ({
  item,
  md: `
![${item.name}](${item.image})

${item.text || ''}

Type: ${item.type}

Faction: ${createFactionLink(item.faction)}

Found in: ${createLocationLink(item.location)}

Card number: ${item.number}
`,
});

const createLocation = (item, cards) => {
  const cardsInLocation = findLocation(cards, item);
  const ploys = findPloys(cardsInLocation);
  const upgrades = findUpgrades(cardsInLocation);
  const objectives = findObjectives(cardsInLocation);
  return {
    item,
    md: `
# ${item}

## Ploys
${ploys.map(createCardLink).join('<br />')}

## Upgrades
${upgrades.map(createCardLink).join('<br />')}

## Objectives
${objectives.map(createCardLink).join('<br />')}
`,
  };
};

const createFaction = (item, cards) => {
  const cardsInFaction = findFaction(cards, item);
  const ploys = findPloys(cardsInFaction);
  const upgrades = findUpgrades(cardsInFaction);
  const objectives = findObjectives(cardsInFaction);
  return {
    item,
    md: `
# ${item}

## Ploys
${ploys.map(createCardLink).join('<br />')}

## Upgrades
${upgrades.map(createCardLink).join('<br />')}

## Objectives
${objectives.map(createCardLink).join('<br />')}
`,
  };
};

const cards = readJSONFile('data/cards.json');
const factions = readJSONFile('data/factions.json');
const locations = readJSONFile('data/locations.json');

let home = `## Browse by set
`;

cards.map(createCard).forEach(({ item, md }) => {
  const filename = `cards/${makeMdFilename(item.name)}`;
  writeMdFile(filename, addHeader(md));
});

locations.map(l => createLocation(l, cards)).forEach(({ item, md }) => {
  const filename = `locations/${makeMdFilename(item)}`;
  writeMdFile(filename, addHeader(md));

  home = `${home}
  - ${createLocationLink(item)}`;
});

factions.map(l => createFaction(l, cards)).forEach(({ item, md }) => {
  const filename = `factions/${makeMdFilename(item)}`;
  writeMdFile(filename, addHeader(md));
});

writeMdFile('index.md', addHeader(home));
