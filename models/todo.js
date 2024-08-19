const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    sequelize.define('todo', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING
        },
        done: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        date: {
            allowNull: true,
            type: DataTypes.DATE
        }
    });
};
