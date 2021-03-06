'use strict';

const fs = require(`fs`).promises;
const {
  getRandomInt,
  shuffle,
  getRandomNull,
} = require(`./utils`);
const {getLogger} = require(`../lib/logger`);
const sequelize = require(`../lib/sequelize`);
const initDatabase = require(`../lib/init-db`);
const {
  DEFAULT_COUNT,
  Messages,
  FullTextRestrict,
  AnnounceTextRestrict,
  EXIT_CODE_FAILURE,
  MAX_ARTICLES_NUMBER,
  FILE_SENTENCES_PATH,
  FILE_TITLES_PATH,
  FILE_CATEGORIES_PATH,
  PictureRestrict,
  FILE_COMMENTS_PATH,
  TextRestrict,
  CommentsRestrict,
  CategoriesRestrict,
} = require(`./constants`);

const logger = getLogger({});

const readContent = async (filePath) => {
  try {
    const initialContent = await fs.readFile(filePath, `utf8`);
    const content = initialContent.trim();
    return content.split(`\n`);
  } catch (err) {
    logger.error(`${Messages.READING_ERROR} ${filePath}`);
    return process.exit(EXIT_CODE_FAILURE);
  }
};

const generateComments = (count, comments)=>{
  return Array(count).fill({}).map(()=>{
    return {
      text: shuffle(comments).slice(0, getRandomInt(TextRestrict.MIN, TextRestrict.MAX)).join(` `),
    };
  });
};

const getRandomSubarray = (items) => {
  items = items.slice();
  let count = getRandomInt(CategoriesRestrict.MIN, CategoriesRestrict.MAX);
  const result = [];
  while (count--) {
    result.push(
        ...items.splice(
            getRandomInt(0, items.length - 1), 1
        )
    );
  }
  return result;
};

const getPictureFileName = (number) => `item${(`0` + number).slice(-2)}.jpg`;

const generateArticles = (count, sentences, titles, categories, comments) => (
  Array(count).fill({}).map(() => ({
    title: titles[getRandomInt(0, titles.length - 1)],
    announce: shuffle(sentences).slice(0, getRandomInt(AnnounceTextRestrict.MIN, AnnounceTextRestrict.MAX)).join(` `),
    fullText: shuffle(sentences).slice(0, getRandomInt(FullTextRestrict.MIN, FullTextRestrict.MAX)).join(` `),
    picture: getRandomNull() && getPictureFileName(getRandomInt(PictureRestrict.MIN, PictureRestrict.MAX)),
    categories: getRandomSubarray(categories),
    comments: generateComments(getRandomInt(CommentsRestrict.MIN, CommentsRestrict.MAX), comments),
  }))
);

module.exports = {
  name: `--filldb`,
  async run(args) {
    try {
      logger.info(`Trying to connect to database...`);
      await sequelize.authenticate();
    } catch (err) {
      logger.error(`An error occured: ${err.message}`);
      process.exit(EXIT_CODE_FAILURE);
    }
    logger.info(`Connection to database established`);

    const sentences = await readContent(FILE_SENTENCES_PATH);
    const titles = await readContent(FILE_TITLES_PATH);
    const categories = await readContent(FILE_CATEGORIES_PATH);
    const comments = await readContent(FILE_COMMENTS_PATH);

    const [count] = args;
    const countArticle = Number.parseInt(count, 10) || DEFAULT_COUNT;
    if (countArticle > MAX_ARTICLES_NUMBER) {
      console.info(logger.error(Messages.OVERMUCH));
      process.exit(EXIT_CODE_FAILURE);
    }

    const articles = generateArticles(countArticle, sentences, titles, categories, comments);

    initDatabase(sequelize, {articles, categories});


  }
};
