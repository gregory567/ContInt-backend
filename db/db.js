require('dotenv').config({ path: 'env.local' });
const { Sequelize } = require('sequelize');

const connUrl =
    process.env.DB_DIALECT + '://' +
    process.env.DB_USER + ':' +
    process.env.DB_PW + '@' +
    process.env.DB_HOST + '/' +
    process.env.DB_NAME;

const db = new Sequelize(connUrl);

const models = [
    require('../models/todo'),
];

for (const model of models) {
    model(db);
}

// This ensures that any new fields added to models are synced with the database.
//db.sync({ alter: true });

module.exports = db;

