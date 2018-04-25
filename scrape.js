const puppeteer = require('puppeteer');
const fs = require('fs');

const classNames = {
  CURRENT_PAGE: '.card-list__pagination-location--current',
  MAX_PAGE: '.card-list__pagination-location--total',
  CARD_LIST_ROW: '.card-list__table-list-item',
  CARD_LIST_ITEM_NAME: '.card-list__table-cell--name',
  CARD_LIST_ITEM_NUMBER: '.card-list__table-cell--number',
  CARD_LIST_ITEM_FACTION: '.card-list__table-cell--faction .card-list__table-item-value',
  CARD_LIST_ITEM_TYPE: '.card-list__table-cell--type .card-list__table-item-value',
  CARD_LIST_ITEM_LOCATION: '.card-list__table-cell--location .card-list__table-item-value',
  CARD_LIST_ITEM_IMAGE: '.card-deck__overlay-image',
};

const scrapeUnderworldsDB = async page => {
  console.log('Grabbing card text from UnderworldsDB...');

  await page.waitFor('#carddb');

  const results = await page.evaluate(
    ({ classNames }) => {
      const getElement = (parent, selector) => parent.querySelector(selector);
      const getText = (parent, selector) =>
        getElement(parent, selector).innerText.replace(/\n/, '');
      const getHTML = (parent, selector) => getElement(parent, selector).innerHTML;
      const getInt = (parent, selector) => parseInt(getText(parent, selector), 10);
      const getAttr = (parent, selector, attr) => getElement(parent, selector).getAttribute(attr);

      const textPerId = {};
      const rows = document.querySelectorAll('#carddb tbody > tr');

      return Array.from(rows).reduce((aq, row) => {
        const number = getInt(row, ':nth-child(1)');
        const text = getHTML(row, 'td:nth-child(5)');
        const sanitized = text
          // Replace  <img src="img/shield.png" alt="Shield">
          // With     [Shield]
          .replace(/<img src="(?:[a-zA-Z-/]*)\.png" alt="([a-zA-Z -]*)">/g, '[$1]')
          // Replace  <p class="text-center p-2 mb-2 text-white weapon">[Hex] 1 [Hammer] 2 [Damage] 2</p>
          // With     [Weapon][Hex] 1 [Hammer] 2 [Damage] 2[/Weapon]
          .replace(
            /<p class="(?:[a-zA-Z0-9-/ ]*)weapon">([\[\] 0-9a-zA-Z-/]*)<\/p>/g,
            '[Weapon]$1[/Weapon]'
          );

        aq[number] = sanitized;
        return aq;
      }, {});
    },
    { classNames }
  );

  console.log(`Done! Got ${Object.keys(results).length} card texts`);

  return results;
};

const scrapeCardsLibrary = async (page, cardTexts) => {
  let current = 0;
  let max = 9999;
  const items = [];

  await page.waitFor(classNames.CARD_LIST_ROW);

  while (current < max) {
    const results = await page.evaluate(
      ({ classNames, cardTexts }) => {
        const getElement = (parent, selector) => parent.querySelector(selector);
        const getText = (parent, selector) =>
          getElement(parent, selector).innerText.replace(/\n/, '');
        const getInt = (parent, selector) => parseInt(getText(parent, selector), 10);
        const getAttr = (parent, selector, attr) => getElement(parent, selector).getAttribute(attr);
        const getCurrentPage = () => getInt(document, classNames.CURRENT_PAGE);
        const getMaxPage = () => getInt(document, classNames.MAX_PAGE);
        const rows = document.querySelectorAll(classNames.CARD_LIST_ROW);
        const cards = [];

        Array.from(rows).forEach(row => {
          const name = getText(row, classNames.CARD_LIST_ITEM_NAME);
          const number = getInt(row, classNames.CARD_LIST_ITEM_NUMBER);
          const faction = getText(row, classNames.CARD_LIST_ITEM_FACTION);
          const type = getText(row, classNames.CARD_LIST_ITEM_TYPE);
          const location = getText(row, classNames.CARD_LIST_ITEM_LOCATION);
          const image = getAttr(row, classNames.CARD_LIST_ITEM_IMAGE, 'src');

          cards.push({
            name,
            number,
            faction,
            type,
            location,
            image,
            text: cardTexts[number]
          });
        });

        return {
          currentPage: getCurrentPage(),
          maxPage: getMaxPage(),
          cards,
        };
      },
      { classNames, cardTexts }
    );

    current = results.currentPage;
    max = results.maxPage;
    items.push(...results.cards);
    console.log(
      `Current Page: ${current}. Max Page: ${max}. Items: ${items.length}. Continue? ${current <
        max}`
    );

    await page.click('.card-list__pagination-nav--next');
  }

  console.log(`Found ${items.length} cards`);
  fs.writeFileSync('./data/cards.json', JSON.stringify(items, null, 2));

  const locations = Object.keys(
    items.reduce((aq, d) => {
      aq[d.location] = true;
      return aq;
    }, {})
  );
  console.log(`Found ${locations.length} locations`);
  fs.writeFileSync('./data/locations.json', JSON.stringify(locations, null, 2));

  const factions = Object.keys(
    items.reduce((aq, d) => {
      aq[d.faction] = true;
      return aq;
    }, {})
  );
  console.log(`Found ${factions.length} factions`);
  fs.writeFileSync('./data/factions.json', JSON.stringify(factions, null, 2));
};

async function start() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  // console.log(page.viewport());
  // const watchDog = page.waitForFunction('window.innerWidth > 1900');
  // await page.setViewport({ width: 1920, height: 1080 });
  // await watchDog;
  // console.log(page.viewport())

  await page.goto('https://www.underworldsdb.com/');
  const cardTexts = await scrapeUnderworldsDB(page);

  await page.goto('https://warhammerunderworlds.com/card-library/');
  // await page.screenshot({ path: "screenshot.png" });
  await scrapeCardsLibrary(page, cardTexts);

  await browser.close();
}

start();
