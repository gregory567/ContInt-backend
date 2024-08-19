const { body, validationResult } = require('express-validator');

const db = require('../db/db');

var express = require('express')
var router = express.Router();

/* Read all todos */
router.get('/', async (req, res, next) => {
    const todos = await db.models.todo.findAll();

    // Check if the feature flag is enabled
    const isFeatureEnabled = await posthog.isFeatureEnabled('move-unfinished-todos', 'some-user-id-or-distinct-id');

    let sortedTodos = todos;

    if (isFeatureEnabled) {
        sortedTodos = todos.sort((a, b) => {
            if (!a.done && b.done) return 1;
            if (a.done && !b.done) return -1;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        // Move unfinished todos to the next day if the feature is enabled
        sortedTodos = sortedTodos.map(todo => {
            if (!todo.done) {
                todo.date = new Date(new Date().setDate(new Date().getDate() + 1));
            }
            return todo;
        });
    }

    res.status(200).json(sortedTodos);
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

        let todo = await db.models.todo.create({
            name: req.body.name,
            done: false,
            // Optional: Set the initial date based on the feature toggle
            date: new Date()
        });

        // Check if the feature flag is enabled
        const isFeatureEnabled = await posthog.isFeatureEnabled('move-unfinished-todos', 'some-user-id-or-distinct-id');

        if (isFeatureEnabled) {
            todo.date = new Date(new Date().setDate(new Date().getDate() + 1));
            todo = await todo.save();
        }

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
