const { body, validationResult } = require('express-validator');
const db = require('../db/db');
var express = require('express');
var router = express.Router();

// Helper function to handle todos sorting and date updating
async function processTodos(todos) {
    // Sort and update todos based only on whether they are done or not
    return todos
        .sort((a, b) => {
            if (!a.done && b.done) return 1;
            if (a.done && !b.done) return -1;
            return 0; // Keep the original order for todos with the same done status
        })
        .map(todo => {
            if (!todo.done) {
                todo.date = new Date(new Date().setDate(new Date().getDate() + 1));
            }
            return todo;
        });
}

// Read all todos
router.get('/', async (req, res, next) => {
    try {
        const todos = await db.models.todo.findAll();
        const sortedTodos = await processTodos(todos);
        return res.status(200).json(sortedTodos);
    } catch (error) {
        next(error);  // Forward any errors to the error handler
    }
});

// Create todos
router.post('/',
    body('name').not().isEmpty(),
    body('name').isLength({ max: 255 }),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            let todo = await db.models.todo.create({
                name: req.body.name,
                done: false,
                date: new Date(new Date().setDate(new Date().getDate() + 1))
            });

            res.status(201).json(todo);
        } catch (error) {
            next(error);  // Forward any errors to the error handler
        }
    });

// Update todos with done
router.put('/:id/done', async (req, res, next) => {
    try {
        const pk = req.params.id;
        let todo = await db.models.todo.findByPk(pk);

        if (null == todo) {
            return res.status(404).send('Todo not found');
        }

        todo = await todo.update({ done: true });
        res.status(200).json(todo);
    } catch (error) {
        next(error);
    }
});

// Update todos with undone
router.delete('/:id/done', async (req, res, next) => {
    try {
        const pk = req.params.id;
        let todo = await db.models.todo.findByPk(pk);

        if (null == todo) {
            return res.status(404).send('Todo not found');
        }

        todo = await todo.update({ done: false });
        res.status(200).json(todo);
    } catch (error) {
        next(error);
    }
});

module.exports = router;