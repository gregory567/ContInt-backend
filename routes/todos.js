const { body, validationResult } = require('express-validator');

const db = require('../db/db');

var express = require('express')
var router = express.Router();

// Read all todos - This route handles GET requests to retrieve all todos.
router.get('/', async (req, res, next) => {
    // Fetch all todos from the database using Sequelize's findAll method.
    const todos = await db.models.todo.findAll();

    // Check if the feature flag 'move-unfinished-todos' is enabled for a specific user.
    // This uses the PostHog library to determine if the feature should be active.
    const isFeatureEnabled = await posthog.isFeatureEnabled('move-unfinished-todos', 'some-user-id-or-distinct-id');

    // Initialize a variable to hold the sorted todos. Initially, it just holds the fetched todos.
    let sortedTodos = todos;

    // If the feature flag is enabled, perform sorting and updating of todos.
    if (isFeatureEnabled) {
        // Sort todos such that unfinished (not done) todos are placed after finished (done) ones.
        // Also, todos are sorted by creation date.
        sortedTodos = todos.sort((a, b) => {
            // If a todo is not done and another is done, the unfinished one comes later.
            if (!a.done && b.done) return 1;
            // If a todo is done and another is not, the done one comes earlier.
            if (a.done && !b.done) return -1;
            // If both are either done or not done, sort by creation date.
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        // Move unfinished todos to the next day if the feature is enabled.
        sortedTodos = sortedTodos.map(todo => {
            // If a todo is not done, update its date to be the next day.
            if (!todo.done) {
                todo.date = new Date(new Date().setDate(new Date().getDate() + 1));
            }
            // Return the updated todo object.
            return todo;
        });
    }

    // Send the sorted todos as a JSON response with a status code of 200 (OK).
    res.status(200).json(sortedTodos);
});

// Create todos - This route handles POST requests to create a new todo.
router.post('/',
    // Validate the request body to ensure 'name' is not empty.
    body('name').not().isEmpty(),
    // Validate that the 'name' field does not exceed 255 characters.
    body('name').isLength({ max: 255 }),
    async (req, res, next) => {
        // Check if there are any validation errors.
        const errors = validationResult(req);
        // If there are validation errors, return a 400 (Bad Request) response with the errors.
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Create a new todo in the database with the provided 'name' and default 'done' status (false).
        // Set the initial date to the current date.
        let todo = await db.models.todo.create({
            name: req.body.name,
            done: false,
            date: new Date()
        });

        // If the feature flag is enabled, move the todo's date to the next day.
        if (isFeatureEnabled) {
            todo.date = new Date(new Date().setDate(new Date().getDate() + 1));
            // Save the updated todo to the database.
            todo = await todo.save();
        }

        // Return the newly created todo as a JSON response with a status code of 201 (Created).
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
