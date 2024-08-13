const { body, validationResult } = require('express-validator');

const db = require('../db/db');

var express = require('express')
var router = express.Router();

/* Read all todos */
router.get('/', async (req, res, next) => {
    const todos = await db.models.todo.findAll();

    res.status(200).json(todos);
});

/* Create todos */
router.post('/',
    body('name').not().isEmpty(),
    body('name').isLength({ max: 255 }),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const todo = await db.models.todo.create({
            name: req.body.name
        });

        res.status(201).json(todo);
});

/* Update todos with done */
router.put('/:id/done',
    async (req, res, next) => {
        const pk = req.params.id;
        var todo = await db.models.todo.findByPk(pk);

        if (null == todo) {
            res.status(404);
            return;
        }

        todo = await todo.update({ done: true });

        res.status(200).json(todo);
});

/* Update todos with undone */
router.delete('/:id/done',
    async (req, res, next) => {
        const pk = req.params.id;
        var todo = await db.models.todo.findByPk(pk);

        if (null == todo) {
            res.status(404);
            return;
        }

        todo = await todo.update({ done: false });

        res.status(200).json(todo);
});

module.exports = router;
